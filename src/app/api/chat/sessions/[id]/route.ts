import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { ok, noContent, errorResponse } from "@/lib/api/response";

function getPrisma(): PrismaClient | null {
  try {
    return new PrismaClient();
  } catch {
    return null;
  }
}

async function resolveUserId(prisma: PrismaClient): Promise<string | null> {
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
  });
  return user?.id ?? null;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const requestId = req.headers.get("x-request-id") ?? undefined;

  const prisma = getPrisma();
  if (!prisma) {
    return errorResponse(
      503,
      "DB_UNAVAILABLE",
      "Database not initialized. Run: npx prisma generate",
      null,
      requestId,
    );
  }

  let userId: string | null;
  try {
    userId = await resolveUserId(prisma);
  } catch (err) {
    return errorResponse(
      500,
      "CHAT_ERROR",
      err instanceof Error ? err.message : "Failed to resolve user",
      null,
      requestId,
    );
  }

  if (!userId) {
    return errorResponse(
      500,
      "NO_USER",
      "No user found. Please complete initial setup.",
      null,
      requestId,
    );
  }

  try {
    const session = await prisma.chatSession.findFirst({
      where: { id, userId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
        context: true,
      },
    });

    if (!session) {
      return errorResponse(
        404,
        "NOT_FOUND",
        "Chat session not found",
        null,
        requestId,
      );
    }

    return ok(
      {
        session: {
          id: session.id,
          title: session.title,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        },
        messages: session.messages,
        context: session.context,
      },
      requestId,
    );
  } catch (err) {
    return errorResponse(
      500,
      "CHAT_ERROR",
      err instanceof Error ? err.message : "Failed to load chat session",
      null,
      requestId,
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const requestId = req.headers.get("x-request-id") ?? undefined;

  const prisma = getPrisma();
  if (!prisma) {
    return errorResponse(
      503,
      "DB_UNAVAILABLE",
      "Database not initialized. Run: npx prisma generate",
      null,
      requestId,
    );
  }

  let userId: string | null;
  try {
    userId = await resolveUserId(prisma);
  } catch (err) {
    return errorResponse(
      500,
      "CHAT_ERROR",
      err instanceof Error ? err.message : "Failed to resolve user",
      null,
      requestId,
    );
  }

  if (!userId) {
    return errorResponse(
      500,
      "NO_USER",
      "No user found. Please complete initial setup.",
      null,
      requestId,
    );
  }

  try {
    const session = await prisma.chatSession.findFirst({
      where: { id, userId },
    });

    if (!session) {
      return noContent();
    }

    await prisma.chatSession.delete({
      where: { id: session.id },
    });

    return noContent();
  } catch (err) {
    return errorResponse(
      500,
      "CHAT_ERROR",
      err instanceof Error ? err.message : "Failed to delete chat session",
      null,
      requestId,
    );
  }
}

