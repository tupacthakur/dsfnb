import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyPassword, generateSecureToken } from "@/lib/encryption";
import { loginSchema } from "@/lib/validators";
import { ok, errorResponse, validationError } from "@/lib/api/response";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? undefined;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(
      400,
      "BAD_REQUEST",
      "Invalid JSON body",
      null,
      requestId,
    );
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error, requestId);
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return errorResponse(
      401,
      "INVALID_CREDENTIALS",
      "Invalid email or password",
      null,
      requestId,
    );
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return errorResponse(
      401,
      "INVALID_CREDENTIALS",
      "Invalid email or password",
      null,
      requestId,
    );
  }

  const now = new Date();
  await prisma.authSession.deleteMany({
    where: {
      userId: user.id,
      expiresAt: { lt: now },
    },
  });

  const token = generateSecureToken();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const ipAddress = req.headers.get("x-forwarded-for") ?? undefined;
  const userAgent = req.headers.get("user-agent") ?? undefined;

  await prisma.authSession.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
      ipAddress,
      userAgent,
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      type: "system",
      description: "Login successful",
      severity: "info",
    },
  });

  return ok(
    {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
    requestId,
  );
}

