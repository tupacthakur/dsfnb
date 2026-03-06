/* eslint-disable @typescript-eslint/no-misused-promises */
"use client";

import { useEffect, useState } from "react";

type EscalationRow = {
  id?: string;
  alertType: string;
  channel: "whatsapp" | "email" | "dashboard" | "slack";
  recipientRef: string;
  delayMinutes: number;
  isActive: boolean;
};

type EscalationState =
  | { loading: true; error: null; rows: EscalationRow[] }
  | { loading: false; error: string | null; rows: EscalationRow[] };

export function CommandCentreInsights() {
  const [activeTab, setActiveTab] = useState<"insights" | "matrix">("insights");
  const [state, setState] = useState<EscalationState>({
    loading: true,
    error: null,
    rows: [],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/settings/escalation-matrix", {
          headers: {
            "x-request-id": "escalation-matrix-load",
          },
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        let json: any;
        try {
          json = await res.json();
        } catch {
          throw new Error("Failed to read escalation matrix from server");
        }
        if (!json.success) {
          throw new Error(
            json.error?.message ?? "Failed to load escalation matrix",
          );
        }
        if (cancelled) return;
        setState({
          loading: false,
          error: null,
          rows: json.data.rows as EscalationRow[],
        });
      } catch (err) {
        if (cancelled) return;
        setState({
          loading: false,
          error:
            err instanceof Error
              ? err.message
              : "Unexpected error loading escalation matrix",
          rows: [],
        });
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleRowChange = (
    index: number,
    patch: Partial<Omit<EscalationRow, "id">>,
  ) => {
    if (state.loading) return;
    setState((prev) =>
      prev.loading
        ? prev
        : {
            loading: false,
            error: prev.error,
            rows: prev.rows.map((row, i) =>
              i === index ? { ...row, ...patch } : row,
            ),
          },
    );
  };

  const handleAddRow = () => {
    if (state.loading) return;
    setState((prev) =>
      prev.loading
        ? prev
        : {
            loading: false,
            error: prev.error,
            rows: [
              ...prev.rows,
              {
                alertType: "constraint:CRITICAL",
                channel: "dashboard",
                recipientRef: "ops-owner",
                delayMinutes: 0,
                isActive: true,
              },
            ],
          },
    );
  };

  const handleSave = async () => {
    if (state.loading) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings/escalation-matrix", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-request-id": "escalation-matrix-save",
        },
        body: JSON.stringify({ rows: state.rows }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      let json: any;
      try {
        json = await res.json();
      } catch {
        throw new Error("Failed to read saved escalation matrix from server");
      }
      if (!json.success) {
        throw new Error(
          json.error?.message ?? "Failed to save escalation matrix",
        );
      }
      setState({
        loading: false,
        error: null,
        rows: json.data.rows as EscalationRow[],
      });
    } catch (err) {
      setState((prev) =>
        prev.loading
          ? prev
          : {
              ...prev,
              loading: false,
              error:
                err instanceof Error
                  ? err.message
                  : "Unexpected error saving escalation matrix",
            },
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card-surface space-y-3 p-4 md:p-5">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-sm font-semibold text-[var(--text-primary)]">
            Insights & escalation
          </h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Review high-signal insights and define who gets alerted for which
            severities.
          </p>
        </div>
        <div className="inline-flex rounded-full bg-[var(--midnight-800)]/5 p-0.5 text-[10px]">
          <button
            type="button"
            onClick={() => setActiveTab("insights")}
            className={`rounded-full px-3 py-1 ${
              activeTab === "insights"
                ? "bg-[var(--indigo-dim)] text-[var(--indigo)]"
                : "text-[var(--text-secondary)]"
            }`}
          >
            Insights
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("matrix")}
            className={`rounded-full px-3 py-1 ${
              activeTab === "matrix"
                ? "bg-[var(--indigo-dim)] text-[var(--indigo)]"
                : "text-[var(--text-secondary)]"
            }`}
          >
            Escalation matrix
          </button>
        </div>
      </header>

      {activeTab === "insights" && (
        <div className="space-y-2 text-xs text-[var(--text-secondary)]">
          <p>
            Recent high-severity Insight Cards (e.g. regime shifts, hard
            constraint breaches) will appear here in a later iteration, pulled
            directly from your TIG/InsightCard tables. For now, use the Chat
            and Analytics Hub prompts to generate reports and monitor trends.
          </p>
        </div>
      )}

      {activeTab === "matrix" && (
        <div className="space-y-3">
          {state.loading && (
            <p className="text-xs text-[var(--text-muted)]">
              Loading escalation matrix…
            </p>
          )}
          {!state.loading && state.error && (
            <p className="rounded-lg border border-[var(--red)]/40 bg-[var(--red)]/5 px-3 py-2 text-[11px] text-[var(--red)]">
              {state.error}
            </p>
          )}
          {!state.loading && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-[var(--text-secondary)]">
                      <th className="px-2 py-1 text-left font-medium">
                        Alert type
                      </th>
                      <th className="px-2 py-1 text-left font-medium">
                        Channel
                      </th>
                      <th className="px-2 py-1 text-left font-medium">
                        Recipient
                      </th>
                      <th className="px-2 py-1 text-left font-medium">
                        Delay (min)
                      </th>
                      <th className="px-2 py-1 text-left font-medium">
                        Active
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.rows.map((row, index) => (
                      <tr
                        key={row.id ?? `row-${index.toString()}`}
                        className="border-b border-[var(--border-subtle)]"
                      >
                        <td className="px-2 py-1">
                          <input
                            type="text"
                            value={row.alertType}
                            onChange={(e) =>
                              handleRowChange(index, {
                                alertType: e.target.value,
                              })
                            }
                            className="w-full rounded border border-[var(--border)] bg-white px-1 py-0.5 text-[11px] text-[var(--text-primary)] dark:bg-[var(--midnight-800)]"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <select
                            value={row.channel}
                            onChange={(e) =>
                              handleRowChange(index, {
                                channel: e.target.value as EscalationRow["channel"],
                              })
                            }
                            className="w-full rounded border border-[var(--border)] bg-white px-1 py-0.5 text-[11px] text-[var(--text-primary)] dark:bg-[var(--midnight-800)]"
                          >
                            <option value="dashboard">Dashboard</option>
                            <option value="email">Email</option>
                            <option value="whatsapp">WhatsApp</option>
                            <option value="slack">Slack</option>
                          </select>
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="text"
                            value={row.recipientRef}
                            onChange={(e) =>
                              handleRowChange(index, {
                                recipientRef: e.target.value,
                              })
                            }
                            className="w-full rounded border border-[var(--border)] bg-white px-1 py-0.5 text-[11px] text-[var(--text-primary)] dark:bg-[var(--midnight-800)]"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="number"
                            min={0}
                            max={1440}
                            value={row.delayMinutes}
                            onChange={(e) =>
                              handleRowChange(index, {
                                delayMinutes: Number(e.target.value),
                              })
                            }
                            className="w-20 rounded border border-[var(--border)] bg-white px-1 py-0.5 text-[11px] text-[var(--text-primary)] dark:bg-[var(--midnight-800)]"
                          />
                        </td>
                        <td className="px-2 py-1 text-center">
                          <input
                            type="checkbox"
                            checked={row.isActive}
                            onChange={(e) =>
                              handleRowChange(index, {
                                isActive: e.target.checked,
                              })
                            }
                            className="h-3 w-3 accent-[var(--indigo)]"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-[11px] font-medium text-[var(--text-secondary)] hover:bg-slate-50 dark:bg-[var(--midnight-800)] dark:hover:bg-[var(--midnight-700)]"
                >
                  Add escalation row
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSave}
                  className="rounded-xl bg-[var(--indigo)] px-4 py-1.5 text-[11px] font-medium text-white shadow-sm disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save matrix"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

