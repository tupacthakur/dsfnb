import { PrismaClient } from '@prisma/client';
import {
  checkConstraints,
  detectActiveRegime,
  type ConstraintCheckContext,
} from '../tig/engine';

const prisma = new PrismaClient();

export type LangGraphAgentType =
  | 'ingestion'
  | 'constraint_check'
  | 'insight_generator'
  | 'regime_detector'
  | 'recommendation'
  | 'summary';

export interface GraphRAGResult {
  communities: unknown[];
  relationships: unknown[];
  evidenceChains: unknown[];
}

export interface LangGraphResult {
  runId: string;
  state: Record<string, unknown>;
  output: Record<string, unknown>;
  iterations: number;
  converged: boolean;
}

export interface DSPyResult {
  output: Record<string, unknown>;
  confidence: number;
  reasoning: string;
  programVersion: string;
}

export interface DataContext {
  ingestionLogId?: string;
  chatSessionId?: string;
  extra?: Record<string, unknown>;
}

export interface DeviationSignal {
  id: string;
  title: string;
  severity: string;
  constraintId: string;
}

export interface RegimeContext {
  type: string;
  eventId: string;
}

export type KoravoEntityType =
  | 'SKU'
  | 'OUTLET'
  | 'SUPPLIER'
  | 'CUSTOMER'
  | 'CHANNEL'
  | 'CATEGORY'
  | 'RECIPE';

export type KoravoMemoryType =
  | 'SEASONAL_PATTERN'
  | 'SUPPLIER_BEHAVIOUR'
  | 'SKU_PERFORMANCE'
  | 'OUTLET_PATTERN'
  | 'USER_PREFERENCE'
  | 'CONSTRAINT_HISTORY'
  | 'REGIME_HISTORY'
  | 'ANOMALY_PATTERN';

export interface EntityRef {
  type: KoravoEntityType;
  key: string;
  label: string;
}

export interface ActionItem {
  id: string;
  title: string;
  impact: string;
}

export interface SAGEMemoryRow {
  id: string;
  entityId?: string;
  memoryType: KoravoMemoryType;
  content: string;
  confidence: number;
  source: string;
  reinforceCount?: number;
  lastReinforced?: Date;
  expiresAt?: Date | null;
  isActive?: boolean;
}

export interface ContextBriefing {
  summary: string;
  deviations: DeviationSignal[];
  constraints: Awaited<ReturnType<typeof checkConstraints>>;
  recommendations: ActionItem[];
  regimeContext: RegimeContext | null;
  entities: EntityRef[];
  confidence: number;
  metadata: {
    dspyPrograms: string[];
    graphRagQueries: string[];
    mem0Entities: string[];
    langGraphRunId: string;
  };
}

class SAGEServiceError extends Error {
  constructor(public service: string, message: string) {
    super(message);
    this.name = 'SAGEServiceError';
  }
}

async function postJson<T>(
  url: string,
  body: unknown,
  timeoutMs: number,
  service: string,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new SAGEServiceError(
        service,
        `Service responded with status ${res.status}`,
      );
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof SAGEServiceError) throw err;
    throw new SAGEServiceError(
      service,
      err instanceof Error ? err.message : 'Unknown SAGE service error',
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function callGraphRAG(params: {
  query: string;
  entities: string[];
  userId: string;
  maxHops?: number;
}): Promise<GraphRAGResult> {
  const url = process.env.SAGE_GRAPHRAG_URL;
  if (!url) {
    throw new SAGEServiceError('graphrag', 'SAGE_GRAPHRAG_URL not configured');
  }

  return postJson<GraphRAGResult>(
    `${url}/analyze`,
    {
      ...params,
    },
    30_000,
    'graphrag',
  );
}

export async function runLangGraphAgent(params: {
  agentType: LangGraphAgentType;
  input: Record<string, unknown>;
  sessionId?: string;
  userId: string;
}): Promise<LangGraphResult> {
  const url = process.env.SAGE_LANGGRAPH_URL;
  if (!url) {
    throw new SAGEServiceError(
      'langgraph',
      'SAGE_LANGGRAPH_URL not configured',
    );
  }

  return postJson<LangGraphResult>(
    `${url}/run`,
    {
      ...params,
    },
    60_000,
    'langgraph',
  );
}

export async function readMem0(params: {
  entityKey: string;
  memoryTypes?: KoravoMemoryType[];
  userId: string;
}): Promise<SAGEMemoryRow[]> {
  const url = process.env.SAGE_MEM0_URL;

  if (url) {
    const search = new URLSearchParams({
      entityKey: params.entityKey,
      userId: params.userId,
      ...(params.memoryTypes
        ? { memoryTypes: params.memoryTypes.join(',') }
        : {}),
    });
    const res = await fetch(`${url}/memory?${search.toString()}`);
    if (!res.ok) {
      throw new SAGEServiceError(
        'mem0',
        `Mem0 responded with status ${res.status}`,
      );
    }
    return (await res.json()) as SAGEMemoryRow[];
  }

  const rows = await prisma.sAGEMemory.findMany({
    where: {
      entity: { entityKey: params.entityKey, userId: params.userId },
      ...(params.memoryTypes
        ? { memoryType: { in: params.memoryTypes } }
        : {}),
      isActive: true,
    },
  });

  return rows as unknown as SAGEMemoryRow[];
}

export async function writeMem0(params: {
  entityKey: string;
  entityType: KoravoEntityType;
  memory: Omit<SAGEMemoryRow, 'id' | 'entityId'>;
  userId: string;
}): Promise<void> {
  const url = process.env.SAGE_MEM0_URL;

  if (url) {
    await postJson<void>(
      `${url}/memory`,
      {
        ...params,
      },
      10_000,
      'mem0',
    );
  }

  const entity = await prisma.sAGEEntity.upsert({
    where: {
      userId_entityKey: {
        userId: params.userId,
        entityKey: params.entityKey,
      },
    },
    update: {
      label: params.memory.source,
      lastSeenAt: new Date(),
    },
    create: {
      userId: params.userId,
      entityKey: params.entityKey,
      entityType: params.entityType,
      label: params.memory.source,
      properties: {},
    },
  });

  await prisma.sAGEMemory.create({
    data: {
      ...params.memory,
      entityId: entity.id,
    },
  });
}

export type DSPyProgram =
  | 'MarginAnalysis'
  | 'WasteInference'
  | 'DiscountViolationCheck'
  | 'RegimeShiftDetection'
  | 'FulfilmentScoring'
  | 'VendorRiskScoring'
  | 'RecommendationGenerator';

export async function runDSPyProgram(params: {
  program: DSPyProgram;
  input: Record<string, unknown>;
  userId: string;
}): Promise<DSPyResult> {
  const url = process.env.SAGE_DSPY_URL;
  if (!url) {
    throw new SAGEServiceError('dspy', 'SAGE_DSPY_URL not configured');
  }

  return postJson<DSPyResult>(
    `${url}/program`,
    {
      ...params,
    },
    30_000,
    'dspy',
  );
}

export async function buildContextBriefing(params: {
  userId: string;
  dataContext: DataContext;
  taskType: 'chat' | 'analysis' | 'summary';
  query?: string;
}): Promise<ContextBriefing> {
  const { userId, dataContext, taskType, query } = params;

  const dspyProgram: DSPyProgram =
    taskType === 'chat'
      ? 'RecommendationGenerator'
      : taskType === 'analysis'
        ? 'MarginAnalysis'
        : 'RegimeShiftDetection';

  const dspyResult = await runDSPyProgram({
    program: dspyProgram,
    input: {
      dataContext,
      query,
    },
    userId,
  });

  const graphResult = await callGraphRAG({
    query: query ?? '',
    entities: [],
    userId,
  });

  const memories = await readMem0({
    entityKey: `USER:${userId}`,
    userId,
  });

  const activeRegime = await detectActiveRegime(userId);

  const constraintContext: ConstraintCheckContext = {
    // DataContext → constraint context mapping will be expanded per route;
    // for now this is a minimal placeholder.
  };

  const constraintResults = await checkConstraints({
    userId,
    context: constraintContext,
    regimeType: activeRegime?.regimeType as any,
  });

  const deviations: DeviationSignal[] = constraintResults
    .filter((r) => r.status === 'VIOLATED')
    .map((r) => ({
      id: r.deviationId ?? r.constraintId,
      title: r.details?.label
        ? String(r.details.label)
        : `Constraint violated: ${r.nodeType}`,
      severity: r.effectiveWeight,
      constraintId: r.constraintId,
    }));

  const briefing: ContextBriefing = {
    summary: (dspyResult.output.summary as string) ?? '',
    deviations,
    constraints: constraintResults,
    recommendations: [],
    regimeContext: activeRegime
      ? { type: String(activeRegime.regimeType), eventId: activeRegime.id }
      : null,
    entities: [],
    confidence: dspyResult.confidence,
    metadata: {
      dspyPrograms: [dspyProgram],
      graphRagQueries: [query ?? ''],
      mem0Entities: memories.map((m) => m.id),
      langGraphRunId: '',
    },
  };

  void graphResult; // currently unused, reserved for future enrichment

  return briefing;
}

export { SAGEServiceError };

