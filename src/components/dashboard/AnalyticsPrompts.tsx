/* eslint-disable @typescript-eslint/no-misused-promises */
"use client";

import { useEffect, useState } from "react";

type Prompt = {
  id: string;
  label: string;
  description: string;
  kind: "analysis" | "report";
  defaultPeriod: "7d" | "30d" | "90d";
  focus:
    | "revenue"
    | "margin"
    | "waste"
    | "fulfilment"
    | "inventory"
    | "procurement"
    | "mixed";
  template: string;
};

type State =
  | { loading: true; error: null; prompts: Prompt[] }
  | { loading: false; error: string | null; prompts: Prompt[] };

export function AnalyticsPrompts() {
  const [state, setState] = useState<State>({
    loading: true,
    error: null,
    prompts: [],
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/analytics/prompts", {
          headers: {
            "x-request-id": "analytics-prompts",
          },
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        let json: any;
        try {
          json = await res.json();
        } catch {
          throw new Error("Failed to read prompts from server");
        }
        if (!json.success) {
          throw new Error(json.error?.message ?? "Failed to load prompts");
        }
        if (cancelled) return;
        setState({
          loading: false,
          error: null,
          prompts: json.data.prompts as Prompt[],
        });
      } catch (err) {
        if (cancelled) return;
        setState({
          loading: false,
          error:
            err instanceof Error
              ? err.message
              : "Unexpected error while loading prompts",
          prompts: [],
        });
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleUsePrompt = async (prompt: Prompt) => {
    // For now, we simply route the user to the Chat page with
    // the prompt text in localStorage so the chat input can pick it up.
    try {
      window.localStorage.setItem(
        "koravo:chat:seedPrompt",
        JSON.stringify({
          content: prompt.template,
          source: "analytics",
          promptId: prompt.id,
        }),
      );
    } catch {
      // ignore storage errors
    }
    window.location.href = "/chat";
  };

  return (
    <section className="card-surface space-y-3 p-4 md:p-5">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-sm font-semibold text-[var(--text-primary)]">
            Standard analysis prompts
          </h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Use these Koravo-certified prompts to interrogate your data
            consistently and feed into reports.
          </p>
        </div>
      </header>

      {state.loading && (
        <p className="text-xs text-[var(--text-muted)]">Loading prompts…</p>
      )}

      {!state.loading && state.error && (
        <p className="rounded-lg border border-[var(--red)]/40 bg-[var(--red)]/5 px-3 py-2 text-[11px] text-[var(--red)]">
          {state.error}
        </p>
      )}

      {!state.loading && !state.error && (
        <div className="grid gap-3 md:grid-cols-2">
          {state.prompts.map((prompt) => (
            <button
              key={prompt.id}
              type="button"
              onClick={async () => handleUsePrompt(prompt)}
              className="flex flex-col items-start rounded-xl border border-[var(--border)] bg-white/70 p-3 text-left text-xs text-[var(--text-secondary)] shadow-sm transition hover:border-[var(--indigo)] hover:bg-[var(--indigo-dim)]/60 dark:bg-[var(--midnight-800)]"
            >
              <span className="mb-1 text-[11px] font-medium text-[var(--text-primary)]">
                {prompt.label}
              </span>
              <span className="line-clamp-3 text-[11px]">
                {prompt.description}
              </span>
              <span className="mt-2 inline-flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                <span className="rounded-full bg-[var(--midnight-700)]/40 px-2 py-0.5 font-mono">
                  {prompt.kind === "analysis" ? "Analysis" : "Report"}
                </span>
                <span className="rounded-full bg-[var(--mint-dim)]/40 px-2 py-0.5 font-mono">
                  {prompt.defaultPeriod}
                </span>
                <span className="rounded-full bg-[var(--indigo-dim)]/40 px-2 py-0.5 font-mono">
                  {prompt.focus}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

