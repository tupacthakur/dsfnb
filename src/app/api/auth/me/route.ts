import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { ok, errorResponse } from "@/lib/api/response";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? undefined;
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return errorResponse(
      401,
      "UNAUTHORIZED",
      "Missing or invalid authorization header",
      null,
      requestId,
    );
  }

  const token = authHeader.slice("Bearer ".length).trim();

  const session = await prisma.authSession.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    return errorResponse(
      401,
      "INVALID_TOKEN",
      "Session not found or expired",
      null,
      requestId,
    );
  }

  const answered = await prisma.onboardingAnswer.count({
    where: { userId: session.userId },
  });

  const total = 50;

  const user = session.user;

  return ok(
    {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        explainDepth: user.explainDepth,
        isOnboarded: user.isOnboarded,
      },
      onboardingProgress: {
        answered,
        total,
      },
    },
    requestId,
  );
}

