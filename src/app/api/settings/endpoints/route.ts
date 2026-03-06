import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { modelEndpointSchema } from "@/lib/validators";
import {
  encryptValue,
  maskValue,
} from "@/lib/encryption";
import {
  ok,
  errorResponse,
  validationError,
} from "@/lib/api/response";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? undefined;
  const userId = req.headers.get("x-user-id");

  if (!userId) {
    return errorResponse(
      401,
      "UNAUTHORIZED",
      "Missing user context",
      null,
      requestId,
    );
  }

  const endpoints = await prisma.modelEndpoint.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  const shaped = endpoints.map((e) => ({
    id: e.id,
    componentType: e.componentType,
    label: e.label,
    url: e.url,
    hasKey: e.encryptedKey != null,
    maskedKey: e.encryptedKey ? maskValue("********" + e.id.slice(-4)) : null,
    modelName: e.modelName,
    isActive: e.isActive,
    lastPingMs: e.lastPingMs,
    lastPingOk: e.lastPingOk,
    testedAt: e.testedAt,
  }));

  return ok({ endpoints: shaped }, requestId);
}

export async function POST(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? undefined;
  const userId = req.headers.get("x-user-id");

  if (!userId) {
    return errorResponse(
      401,
      "UNAUTHORIZED",
      "Missing user context",
      null,
      requestId,
    );
  }

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

  const parsed = modelEndpointSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error, requestId);
  }

  const { componentType, label, url, apiKey, modelName } = parsed.data;

  const encryptedKey =
    apiKey && apiKey.length > 0 ? encryptValue(apiKey) : undefined;

  const existing = await prisma.modelEndpoint.findFirst({
    where: { userId, componentType },
  });

  const endpoint = existing
    ? await prisma.modelEndpoint.update({
        where: { id: existing.id },
        data: {
          label,
          url,
          ...(encryptedKey !== undefined && { encryptedKey }),
          modelName: modelName ?? null,
          isActive: true,
        },
      })
    : await prisma.modelEndpoint.create({
        data: {
          userId,
          componentType,
          label,
          url,
          encryptedKey: encryptedKey ?? null,
          modelName: modelName ?? null,
          isActive: true,
        },
      });

  return ok(
    {
      id: endpoint.id,
      componentType: endpoint.componentType,
      label: endpoint.label,
      url: endpoint.url,
      hasKey: endpoint.encryptedKey != null,
      maskedKey: endpoint.encryptedKey
        ? maskValue("********" + endpoint.id.slice(-4))
        : null,
      modelName: endpoint.modelName,
      isActive: endpoint.isActive,
    },
    requestId,
  );
}

