import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { noContent, errorResponse } from "@/lib/api/response";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
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

  await prisma.authSession.deleteMany({
    where: { token },
  });

  return noContent();
}

