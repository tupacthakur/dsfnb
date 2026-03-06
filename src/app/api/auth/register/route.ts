import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { hashPassword, generateSecureToken } from "@/lib/encryption";
import { registerSchema } from "@/lib/validators";
import { created, errorResponse, validationError } from "@/lib/api/response";

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

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error, requestId);
  }

  const existing = await prisma.user.count();
  if (existing > 0) {
    return errorResponse(
      403,
      "SETUP_COMPLETE",
      "Initial setup already completed",
      null,
      requestId,
    );
  }

  const { email, password, name } = parsed.data;
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "ADMIN",
      avatarInitials:
        name
          .split(" ")
          .map((p) => p[0])
          .join("")
          .slice(0, 2) || "AD",
      explainDepth: "HEADLINE_ACTION",
      isOnboarded: false,
    },
  });

  // Seed default model endpoints for narration + SAGE components
  const componentTypes = [
    "chat_narration",
    "analytics_narration",
    "summary_narration",
    "graphrag",
    "langgraph",
    "mem0",
    "dspy",
  ];

  await prisma.modelEndpoint.createMany({
    data: componentTypes.map((componentType) => ({
      userId: user.id,
      componentType,
      label: componentType,
      url: "",
      encryptedKey: null,
      modelName: null,
      isActive: true,
    })),
  });

  const token = generateSecureToken();
  const now = new Date();
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
      description: "Initial setup complete",
      severity: "info",
    },
  });

  return created(
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

