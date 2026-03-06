import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { csvUploadOptionsSchema } from "@/lib/validators";
import {
  parseCSV,
  detectTierFields,
  applySmartDefaults,
  transformToKoravoSchema,
  persistIngestion,
} from "@/lib/ingest/csvProcessor";
import { triggerRegimeDetection } from "@/lib/tig/engine";
import { buildContextBriefing } from "@/lib/sage/client";
import { narrateBriefing } from "@/lib/ai";
import { created, errorResponse, validationError } from "@/lib/api/response";

const prisma = new PrismaClient();

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

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return errorResponse(
      400,
      "BAD_REQUEST",
      "Content-Type must be multipart/form-data",
      null,
      requestId,
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  const optionsRaw = form.get("options");

  if (!(file instanceof Blob)) {
    return errorResponse(
      400,
      "FILE_MISSING",
      "CSV file is required",
      null,
      requestId,
    );
  }

  const maxSize =
    Number(process.env.MAX_CSV_SIZE_BYTES ?? 52_428_800) || 52_428_800;
  if (file.size > maxSize) {
    return errorResponse(
      422,
      "FILE_TOO_LARGE",
      `CSV file exceeds maximum size of ${maxSize} bytes`,
      null,
      requestId,
    );
  }

  let options: unknown = {};
  if (typeof optionsRaw === "string") {
    try {
      options = JSON.parse(optionsRaw);
    } catch {
      return errorResponse(
        400,
        "BAD_REQUEST",
        "Invalid options JSON",
        null,
        requestId,
      );
    }
  }

  const parsedOptions = csvUploadOptionsSchema.safeParse(options);
  if (!parsedOptions.success) {
    return validationError(parsedOptions.error, requestId);
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let parsed;
  try {
    parsed = await parseCSV(buffer);
  } catch (err) {
    return errorResponse(
      422,
      "CSV_PARSE_ERROR",
      err instanceof Error ? err.message : "Failed to parse CSV",
      null,
      requestId,
    );
  }

  const tierDetection = await detectTierFields(parsed.headers);

  const hasSalesDomain =
    tierDetection.tier1.includes("transaction_id") &&
    tierDetection.tier1.includes("sku") &&
    tierDetection.tier1.includes("quantity") &&
    tierDetection.tier1.includes("unit_price");

  const hasInventoryDomain =
    tierDetection.tier1.includes("stock_in_date") &&
    tierDetection.tier1.includes("expiry_date") &&
    tierDetection.tier1.includes("sku");

  const hasProcurementDomain =
    tierDetection.tier1.includes("supplier_name") &&
    tierDetection.tier1.includes("quantity") &&
    tierDetection.tier1.includes("unit_price");

  if (!hasSalesDomain && !hasInventoryDomain && !hasProcurementDomain) {
    return errorResponse(
      422,
      "TIER1_INSUFFICIENT",
      "No complete Tier 1 domain detected (sales, inventory, or procurement).",
      {
        headers: parsed.headers,
        detectedTier1: tierDetection.tier1,
      },
      requestId,
    );
  }

  const schemaType = hasSalesDomain
    ? "sales"
    : hasInventoryDomain
      ? "inventory"
      : "procurement";

  const ingestionLog = await prisma.ingestionLog.create({
    data: {
      userId,
      filename: (file as any).name ?? "upload.csv",
      sourceType: "CSV_UPLOAD",
      columnNames: parsed.headers,
      tier1Fields: tierDetection.tier1,
      tier2Fields: tierDetection.tier2,
      unknownFields: tierDetection.unknown,
      smartDefaults: [],
      status: "PROCESSING",
      fileSizeBytes: buffer.byteLength,
    },
  });

  await prisma.activityLog.create({
    data: {
      userId,
      type: "csv_upload",
      description: `Uploaded ${ingestionLog.filename ?? "CSV"} for ingestion`,
      metadata: {
        ingestionLogId: ingestionLog.id,
        rows: parsed.rows.length,
      },
      severity: "info",
    },
  });

  const { rows: processedRows, flags } = await applySmartDefaults(
    parsed.rows,
    schemaType,
  );

  const mergedMappings = {
    ...tierDetection.mappings,
    ...(parsedOptions.data.fieldMappings ?? {}),
  };

  const payload = await transformToKoravoSchema(
    processedRows,
    mergedMappings,
    schemaType,
  );

  const persistResult = await persistIngestion(
    payload,
    ingestionLog.id,
    userId,
  );

  const autoAnalyze = parsedOptions.data.autoAnalyze ?? true;

  let insightCards: unknown[] = [];

  if (autoAnalyze) {
    const dataSummary = {
      rowsInserted: persistResult.inserted,
      schemaType,
    };

    await triggerRegimeDetection(userId, dataSummary);

    try {
      const briefing = await buildContextBriefing({
        userId,
        dataContext: { ingestionLogId: ingestionLog.id },
        taskType: "analysis",
      });

      const narration = await narrateBriefing({
        briefing,
        narrateAs: "insight_card",
        explainDepth: "FULL_CONFIDENCE",
        userId,
      });

      const card = await prisma.insightCard.create({
        data: {
          userId,
          title: narration.insightTitle ?? "SAGE Analysis",
          body: narration.content,
          category: "MARGIN",
          severity: "MEDIUM",
          confidenceScore: briefing.confidence,
          regimeContext: briefing.regimeContext?.type ?? null,
          constraintStatuses: JSON.parse(JSON.stringify(briefing.constraints)),
          recommendedAction: narration.actionText,
          approverRequired: false,
          dspyProgramUsed: briefing.metadata.dspyPrograms[0] ?? null,
          langGraphRunId: briefing.metadata.langGraphRunId,
          graphRagQueryId: briefing.metadata.graphRagQueries[0] ?? null,
          contextBriefingRaw: JSON.parse(JSON.stringify(briefing)),
          llmEndpointUsed: narration.endpointUsed,
          llmModelName: narration.modelName,
          ingestionLogId: ingestionLog.id,
        },
      });

      insightCards = [card];

      await prisma.activityLog.create({
        data: {
          userId,
          type: "sage_run",
          description: "SAGE analysis completed for ingestion",
          metadata: {
            ingestionLogId: ingestionLog.id,
            insightCards: insightCards.length,
          },
          severity: "success",
        },
      });

      await prisma.ingestionLog.update({
        where: { id: ingestionLog.id },
        data: {
          status: "COMPLETE",
          processedAt: new Date(),
          rowCount: persistResult.inserted,
          smartDefaults: flags,
        },
      });
    } catch {
      await prisma.ingestionLog.update({
        where: { id: ingestionLog.id },
        data: {
          status: "PARTIAL",
          processedAt: new Date(),
          rowCount: persistResult.inserted,
          smartDefaults: flags,
          errorMessage: "SAGE analysis failed; ingestion completed.",
        },
      });
    }
  } else {
    await prisma.ingestionLog.update({
      where: { id: ingestionLog.id },
      data: {
        status: "COMPLETE",
        processedAt: new Date(),
        rowCount: persistResult.inserted,
        smartDefaults: flags,
      },
    });
  }

  return created(
    {
      ingestionLogId: ingestionLog.id,
      tierCompliance: {
        tier1Fields: tierDetection.tier1,
        tier2Fields: tierDetection.tier2,
        smartDefaults: flags,
      },
      ingestResult: persistResult,
      insightCards,
    },
    requestId,
  );
}

