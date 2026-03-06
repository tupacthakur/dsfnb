import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { created, errorResponse } from "@/lib/api/response";

const prisma = new PrismaClient();

interface GenerateBody {
  title?: string | null;
  from?: string | null;
  to?: string | null;
  promptId?: string | null;
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

  let body: GenerateBody;
  try {
    body = (await req.json()) as GenerateBody;
  } catch (err) {
    return errorResponse(
      400,
      "BAD_REQUEST",
      err instanceof Error ? err.message : "Invalid JSON body",
      null,
      requestId,
    );
  }

  const now = new Date();
  const to = body.to ? new Date(body.to) : now;
  const from =
    body.from != null
      ? new Date(body.from)
      : new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);

  try {
    const [insights, recommendations, chats] = await Promise.all([
      prisma.insightCard.findMany({
        where: {
          userId,
          createdAt: { gte: from, lte: to },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.recommendation.findMany({
        where: {
          userId,
          createdAt: { gte: from, lte: to },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.chatSession.findMany({
        where: {
          userId,
          createdAt: { gte: from, lte: to },
        },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            take: 5,
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
    ]);

    const report = await prisma.report.create({
      data: {
        userId,
        title: body.title ?? "Operations Intelligence Summary",
        periodStart: from,
        periodEnd: to,
        payload: {
          generatedAt: now.toISOString(),
          promptId: body.promptId ?? null,
          insightCount: insights.length,
          recommendationCount: recommendations.length,
          chatSessionCount: chats.length,
          highlights: insights.slice(0, 5).map((i) => ({
            id: i.id,
            title: i.title,
            severity: i.severity,
            createdAt: i.createdAt,
          })),
          recommendations: recommendations.slice(0, 5).map((r) => ({
            id: r.id,
            title: r.title,
            status: r.status,
            impactScore: r.impactScore,
          })),
        },
      },
    });

    return created({ reportId: report.id, report }, requestId);
  } catch (err) {
    return errorResponse(
      500,
      "REPORT_ERROR",
      err instanceof Error ? err.message : "Failed to generate report",
      null,
      requestId,
    );
  }
}

