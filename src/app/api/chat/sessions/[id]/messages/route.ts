import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { chatMessageSchema } from "@/lib/validators";
import { buildContextBriefing } from "@/lib/sage/client";
import { narrateBriefing } from "@/lib/ai";
import { ok, errorResponse, validationError } from "@/lib/api/response";

const prisma = new PrismaClient();

async function resolveUserId(): Promise<string | null> {
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
  });
  return user?.id ?? null;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const requestId = req.headers.get("x-request-id") ?? undefined;

  let userId: string | null;
  try {
    userId = await resolveUserId();
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
      return errorResponse(
        404,
        "NOT_FOUND",
        "Chat session not found",
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

    const parsed = chatMessageSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error, requestId);
    }

    const { content, stream } = parsed.data;
    if (stream) {
      return errorResponse(
        400,
        "STREAMING_UNSUPPORTED",
        "Streaming responses are not yet implemented",
        null,
        requestId,
      );
    }

    const contextRecords = await prisma.chatContext.findMany({
      where: { chatSessionId: session.id },
    });

    const history = await prisma.chatMessage.findMany({
      where: { chatSessionId: session.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const dataContext: { ingestionLogId?: string } = {};
    const csvContext = contextRecords.find(
      (c: { type: string }) => c.type === "csv",
    );
    if (csvContext) {
      dataContext.ingestionLogId = csvContext.refId;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return errorResponse(
        401,
        "UNAUTHORIZED",
        "User not found",
        null,
        requestId,
      );
    }

    const userMessage = await prisma.chatMessage.create({
      data: {
        chatSessionId: session.id,
        role: "user",
        content,
      },
    });

    let assistantContent = "SAGE is unavailable at the moment.";
    let trace: unknown = null;
    let confidence: number | null = null;

    try {
      void history;

      const briefing = await buildContextBriefing({
        userId,
        dataContext,
        taskType: "chat",
        query: content,
      });

      const narration = await narrateBriefing({
        briefing,
        narrateAs: "chat_response",
        explainDepth: user.explainDepth,
        userId,
      });

      assistantContent = narration.content;
      trace = briefing.metadata;
      confidence = briefing.confidence;
    } catch {
      await prisma.activityLog.create({
        data: {
          userId,
          type: "error",
          description: "SAGE or LLM narration failed during chat",
          severity: "error",
        },
      });
    }

    const assistantMessage = await prisma.chatMessage.create({
      data: {
        chatSessionId: session.id,
        role: "assistant",
        content: assistantContent,
        reasoningTrace: trace ? JSON.stringify(trace) : null,
        confidenceScore: confidence,
      },
    });

    if (!session.title) {
      const words = content.split(/\s+/).slice(0, 6).join(" ");
      const title = words.length < content.length ? `${words}…` : words;
      await prisma.chatSession.update({
        where: { id: session.id },
        data: { title },
      });
    } else {
      await prisma.chatSession.update({
        where: { id: session.id },
        data: { updatedAt: new Date() },
      });
    }

    await prisma.activityLog.create({
      data: {
        userId,
        type: "chat",
        description: "SAGE chat message",
        metadata: {
          chatSessionId: session.id,
          userMessageId: userMessage.id,
          assistantMessageId: assistantMessage.id,
        },
        severity: "info",
      },
    });

    return ok(
      {
        message: assistantMessage,
        sessionTitle: session.title,
      },
      requestId,
    );
  } catch (err) {
    return errorResponse(
      500,
      "CHAT_ERROR",
      err instanceof Error ? err.message : "Failed to handle chat message",
      null,
      requestId,
    );
  }
}

