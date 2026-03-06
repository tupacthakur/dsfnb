import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { ok, created, errorResponse } from "@/lib/api/response";

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

export async function POST(req: NextRequest) {
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const title =
    typeof (body as any).title === "string" && (body as any).title.trim().length
      ? (body as any).title.trim()
      : null;

  try {
    const session = await prisma.chatSession.create({
      data: {
        userId,
        title,
      },
    });

    return created(
      {
        session,
      },
      requestId,
    );
  } catch (err) {
    return errorResponse(
      500,
      "CHAT_ERROR",
      err instanceof Error ? err.message : "Failed to create chat session",
      null,
      requestId,
    );
  }
}

export async function GET(req: NextRequest) {
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

  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? "20");
  const offset = Number(searchParams.get("offset") ?? "0");

  try {
    const [sessions, total] = await Promise.all([
      prisma.chatSession.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        take: Number.isFinite(limit) ? limit : 20,
        skip: Number.isFinite(offset) ? offset : 0,
        include: {
          _count: {
            select: { messages: true },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              content: true,
              role: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.chatSession.count({ where: { userId } }),
    ]);

    const shaped = sessions.map((s: any) => ({
      id: s.id,
      title: s.title,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      messageCount: s._count.messages,
      lastMessage: s.messages[0] ?? null,
    }));

    return ok(
      {
        sessions: shaped,
        total,
      },
      requestId,
    );
  } catch (err) {
    return errorResponse(
      500,
      "CHAT_ERROR",
      err instanceof Error ? err.message : "Failed to load chat sessions",
      null,
      requestId,
    );
  }
}

