"use client";

import { useEffect, useState } from "react";

type Endpoint = {
  id: string;
  componentType: string;
  label: string;
  url: string;
  hasKey: boolean;
  maskedKey: string | null;
  modelName: string | null;
  isActive: boolean;
};

export function SettingsLLMPanel() {
  const [endpoint, setEndpoint] = useState<Endpoint | null>(null);
  const [url, setUrl] = useState("");
  const [modelName, setModelName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/settings/endpoints");
        if (!res.ok) return;
        let json: any;
        try {
          json = await res.json();
        } catch {
          // If we can't parse, ignore and keep defaults
          return;
        }
        if (!json?.success) return;
        const endpoints: Endpoint[] = json.data.endpoints;
        const chat = endpoints.find(
          (e) => e.componentType === "chat_narration",
        );
        if (chat) {
          setEndpoint(chat);
          setUrl(chat.url);
          setModelName(chat.modelName ?? "");
        }
      } catch {
        // ignore on load
      }
    };

    void load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/settings/endpoints", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          componentType: "chat_narration",
          label: "Chat Narration",
          url,
          apiKey: apiKey || undefined,
          modelName: modelName || undefined,
        }),
      });
      let json: any;
      try {
        json = await res.json();
      } catch {
        throw new Error("Failed to read save response from server");
      }
      if (!res.ok || !json.success) {
        setError(json?.error?.message ?? "Failed to save endpoint");
        return;
      }
      setEndpoint(json.data as Endpoint);
      setSaved(true);
      setApiKey("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unexpected error while saving",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card-surface p-4 md:p-5 space-y-4">
      <header>
        <h2 className="font-display text-sm font-semibold text-[var(--text-primary)]">
          LLM Narration Endpoint
        </h2>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          Configure the OpenAI-compatible model used to narrate SAGE
          ContextBriefings for chat. Your current key is kept encrypted on the
          server.
        </p>
      </header>

      <div className="space-y-3 text-xs">
        <div>
          <label className="block text-[11px] font-medium text-[var(--text-secondary)]">
            API URL
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://api.openai.com"
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-xs text-[var(--text-primary)] outline-none focus-visible:border-[var(--indigo)] dark:bg-[var(--midnight-800)]"
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-secondary)]">
              Model name
            </label>
            <input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="gpt-4.1-mini"
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-xs text-[var(--text-primary)] outline-none focus-visible:border-[var(--indigo)] dark:bg-[var(--midnight-800)]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-secondary)]">
              API key (will be encrypted)
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={
                endpoint?.hasKey ? endpoint.maskedKey ?? "••••••••" : "sk‑..."
              }
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-xs text-[var(--text-primary)] outline-none focus-visible:border-[var(--indigo)] dark:bg-[var(--midnight-800)]"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !url}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--indigo)] px-4 py-2 text-xs font-medium text-white shadow-sm transition-transform duration-180 hover:scale-[1.02] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save endpoint"}
        </button>
        {saved && !error && (
          <span className="text-[11px] text-[var(--mint)]">
            Saved · changes applied
          </span>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-[var(--red)]/40 bg-[var(--red)]/5 px-3 py-2 text-[11px] text-[var(--red)]">
          {error}
        </p>
      )}
    </section>
  );
}

