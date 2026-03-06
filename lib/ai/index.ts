import { PrismaClient } from '@prisma/client';
import { encryptValue, decryptValue } from '../encryption';
import type { ContextBriefing } from '../sage/client';

const prisma = new PrismaClient();

export interface NarrationRequest {
  briefing: ContextBriefing;
  narrateAs:
    | 'insight_card'
    | 'chat_response'
    | 'report_summary'
    | 'deviation_alert';
  explainDepth: 'HEADLINE_ONLY' | 'HEADLINE_ACTION' | 'FULL_CONFIDENCE' | 'FULL_DETAIL';
  userId: string;
}

export interface NarrationResponse {
  content: string;
  insightTitle?: string;
  actionText?: string;
  latencyMs: number;
  tokenCount?: number;
  endpointUsed: string;
  modelName: string;
}

function buildSystemPrompt(narrateAs: NarrationRequest['narrateAs']): string {
  switch (narrateAs) {
    case 'insight_card':
      return [
        'You receive a structured ContextBriefing JSON from the SAGE intelligence layer.',
        'Your ONLY job is to narrate it clearly for an F&B executive.',
        'Do not add reasoning or conclusions not present in the briefing.',
        'Be concise, specific, and action-oriented.',
        'Output format: JSON with fields { "title", "body", "recommendedAction" }.',
      ].join(' ');
    case 'chat_response':
      return [
        'You receive a ContextBriefing from SAGE.',
        'Narrate it conversationally as if you are briefing the operator.',
        'Reference specific data points and cite sources present in the briefing metadata.',
        'Do not introduce new inferences beyond the briefing.',
      ].join(' ');
    case 'report_summary':
      return [
        'Narrate this ContextBriefing as an executive summary.',
        'Use 3-4 sentences.',
        'Focus on top findings and one clear recommendation.',
        'Do not add reasoning beyond what the briefing already encodes.',
      ].join(' ');
    case 'deviation_alert':
    default:
      return [
        'You receive a ContextBriefing focused on constraint deviations.',
        'Produce a short alert-style narration highlighting severity, impacted entities, and next action.',
        'Do not add new constraints or thresholds beyond the briefing.',
      ].join(' ');
  }
}

async function getEndpointForUser(
  userId: string,
  narrateAs: NarrationRequest['narrateAs'],
) {
  const componentType =
    narrateAs === 'insight_card'
      ? 'analytics_narration'
      : narrateAs === 'chat_response'
        ? 'chat_narration'
        : 'summary_narration';

  const endpoint = await prisma.modelEndpoint.findFirst({
    where: {
      userId,
      componentType,
      isActive: true,
    },
  });

  if (endpoint) {
    return endpoint;
  }

  // Fallback to defaults via env
  switch (componentType) {
    case 'chat_narration':
      return {
        id: 'default-chat',
        userId,
        componentType,
        label: 'Default Chat Narration',
        url: process.env.DEFAULT_CHAT_LLM_URL ?? '',
        encryptedKey: process.env.DEFAULT_CHAT_LLM_KEY
          ? encryptValue(process.env.DEFAULT_CHAT_LLM_KEY)
          : null,
        modelName: process.env.DEFAULT_CHAT_MODEL ?? 'claude-sonnet-4-6',
        isActive: true,
        lastPingMs: null,
        lastPingOk: null,
        testedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    case 'analytics_narration':
      return {
        id: 'default-analytics',
        userId,
        componentType,
        label: 'Default Analytics Narration',
        url: process.env.DEFAULT_ANALYTICS_LLM_URL ?? '',
        encryptedKey: process.env.DEFAULT_ANALYTICS_LLM_KEY
          ? encryptValue(process.env.DEFAULT_ANALYTICS_LLM_KEY)
          : null,
        modelName: process.env.DEFAULT_ANALYTICS_MODEL ?? 'claude-sonnet-4-6',
        isActive: true,
        lastPingMs: null,
        lastPingOk: null,
        testedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    case 'summary_narration':
    default:
      return {
        id: 'default-summary',
        userId,
        componentType,
        label: 'Default Summary Narration',
        url: process.env.DEFAULT_SUMMARY_LLM_URL ?? '',
        encryptedKey: process.env.DEFAULT_SUMMARY_LLM_KEY
          ? encryptValue(process.env.DEFAULT_SUMMARY_LLM_KEY)
          : null,
        modelName: process.env.DEFAULT_SUMMARY_MODEL ?? 'claude-sonnet-4-6',
        isActive: true,
        lastPingMs: null,
        lastPingOk: null,
        testedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
  }
}

export async function narrateBriefing(
  req: NarrationRequest,
): Promise<NarrationResponse> {
  const endpoint = await getEndpointForUser(req.userId, req.narrateAs);

  if (!endpoint?.url) {
    throw new Error('No narration endpoint configured');
  }

  const apiKey =
    endpoint.encryptedKey != null
      ? decryptValue(endpoint.encryptedKey)
      : undefined;

  const systemPrompt = buildSystemPrompt(req.narrateAs);

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: JSON.stringify(req.briefing) },
  ];

  const url = `${endpoint.url.replace(/\/$/, '')}/v1/chat/completions`;
  const started = performance.now();

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: endpoint.modelName ?? 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages,
    }),
  });

  const latencyMs = performance.now() - started;

  if (!res.ok) {
    throw new Error(`Narration endpoint error: ${res.status}`);
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string }; delta?: { content?: string } }[];
    usage?: { total_tokens?: number };
  };
  const content =
    json.choices?.[0]?.message?.content ??
    json.choices?.[0]?.delta?.content ??
    '';

  let parsed: { title?: string; body?: string; recommendedAction?: string } = {};
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = { body: String(content) };
  }

  return {
    content: parsed.body ?? String(content),
    insightTitle: parsed.title,
    actionText: parsed.recommendedAction,
    latencyMs,
    tokenCount: json.usage?.total_tokens,
    endpointUsed: endpoint.url,
    modelName: endpoint.modelName ?? 'claude-sonnet-4-6',
  };
}

export async function testNarrationEndpoint(url: string, key: string) {
  const systemPrompt = buildSystemPrompt('report_summary');
  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: JSON.stringify({
        summary: 'Test briefing',
        deviations: [],
        constraints: [],
        recommendations: [],
        regimeContext: null,
        entities: [],
        confidence: 1.0,
        metadata: {
          dspyPrograms: [],
          graphRagQueries: [],
          mem0Entities: [],
          langGraphRunId: 'test',
        },
      }),
    },
  ];

  const endpointUrl = `${url.replace(/\/$/, '')}/v1/chat/completions`;
  const started = performance.now();

  try {
    const res = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(key ? { authorization: `Bearer ${key}` } : {}),
      },
      body: JSON.stringify({
        model: 'test-model',
        max_tokens: 10,
        messages,
      }),
    });
    const latencyMs = performance.now() - started;

    if (!res.ok) {
      return { ok: false, latencyMs, error: `Status ${res.status}` };
    }

    const json = await res.json();
    const hasContent = Boolean(json.choices?.[0]?.message?.content);

    if (!hasContent) {
      return { ok: false, latencyMs, error: 'No content in response' };
    }

    return { ok: true, latencyMs };
  } catch (err) {
    const latencyMs = performance.now() - started;
    return {
      ok: false,
      latencyMs,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

