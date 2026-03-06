import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { ok, created, errorResponse, validationError } from "@/lib/api/response";

const prisma = new PrismaClient();

const escalationRowSchema = z
  .object({
    id: z.string().optional(),
    alertType: z.string().min(1).max(100),
    channel: z.enum(["whatsapp", "email", "dashboard", "slack"]),
    recipientRef: z.string().min(1).max(200),
    delayMinutes: z.number().min(0).max(1440).default(0),
    isActive: z.boolean().default(true),
  })
  .strict();

const escalationMatrixSchema = z
  .object({
    rows: z.array(escalationRowSchema),
  })
  .strict();

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

  try {
    const routes = await prisma.alertRoute.findMany({
      where: { userId },
      orderBy: [{ alertType: "asc" }, { delayMinutes: "asc" }],
    });

    return ok(
      {
        rows: routes.map((r) => ({
          id: r.id,
          alertType: r.alertType,
          channel: r.channel as
            | "whatsapp"
            | "email"
            | "dashboard"
            | "slack",
          recipientRef: r.recipientRef,
          delayMinutes: r.delayMinutes,
          isActive: r.isActive,
        })),
      },
      requestId,
    );
  } catch (err) {
    return errorResponse(
      500,
      "ESCALATION_FETCH_ERROR",
      err instanceof Error ? err.message : "Failed to load escalation matrix",
      null,
      requestId,
    );
  }
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
  } catch (err) {
    return errorResponse(
      400,
      "BAD_REQUEST",
      err instanceof Error ? err.message : "Invalid JSON body",
      null,
      requestId,
    );
  }

  const parsed = escalationMatrixSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error, requestId);
  }

  const { rows } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.alertRoute.findMany({
        where: { userId },
      });
      const keepIds = new Set(
        rows
          .map((r) => r.id)
          .filter((id): id is string => typeof id === "string"),
      );

      const toDelete = existing.filter((r) => !keepIds.has(r.id));

      if (toDelete.length > 0) {
        await tx.alertRoute.deleteMany({
          where: {
            id: {
              in: toDelete.map((r) => r.id),
            },
          },
        });
      }

      const upserted = await Promise.all(
        rows.map((row) =>
          tx.alertRoute.upsert({
            where: {
              id: row.id ?? "___nonexistent___",
            },
            create: {
              userId,
              alertType: row.alertType,
              channel: row.channel,
              recipientRef: row.recipientRef,
              delayMinutes: row.delayMinutes,
              isActive: row.isActive,
            },
            update: {
              alertType: row.alertType,
              channel: row.channel,
              recipientRef: row.recipientRef,
              delayMinutes: row.delayMinutes,
              isActive: row.isActive,
            },
          }),
        ),
      );

      return upserted;
    });

    return created(
      {
        rows: result.map((r) => ({
          id: r.id,
          alertType: r.alertType,
          channel: r.channel as
            | "whatsapp"
            | "email"
            | "dashboard"
            | "slack",
          recipientRef: r.recipientRef,
          delayMinutes: r.delayMinutes,
          isActive: r.isActive,
        })),
      },
      requestId,
    );
  } catch (err) {
    return errorResponse(
      500,
      "ESCALATION_SAVE_ERROR",
      err instanceof Error ? err.message : "Failed to save escalation matrix",
      null,
      requestId,
    );
  }
}

