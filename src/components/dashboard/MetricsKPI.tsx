/* eslint-disable @typescript-eslint/no-misused-promises */
"use client";

import { useEffect, useState } from "react";

type MetricState = {
  loading: boolean;
  error: string | null;
  data: {
    revenue: { value: number; trend: number | null };
    margin: { value: number | null; trend: number | null };
    wasteCost: { value: number; trend: number | null };
    fulfilmentRate: { value: number | null; trend: number | null };
  } | null;
};

export default function MetricsKPI() {
  const [state, setState] = useState<MetricState>({
    loading: true,
    error: null,
    data: null,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/metrics/kpi?period=7d", {
          headers: {
            "x-request-id": "dashboard-kpi",
          },
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        let json: any;
        try {
          json = await res.json();
        } catch {
          throw new Error("Failed to read metrics response from server");
        }

        if (!json.success) {
          throw new Error(json.error?.message ?? "Metrics request failed");
        }

        if (cancelled) return;

        setState({
          loading: false,
          error: null,
          data: json.data,
        });
      } catch (err) {
        if (cancelled) return;
        setState({
          loading: false,
          error:
            err instanceof Error
              ? err.message
              : "Unexpected error while loading metrics",
          data: null,
        });
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const revenue = state.data?.revenue.value ?? null;
  const revenueTrend = state.data?.revenue.trend ?? null;
  const margin = state.data?.margin.value ?? null;
  const waste = state.data?.wasteCost.value ?? null;
  const fulfilment = state.data?.fulfilmentRate.value ?? null;

  return (
    <>
      {state.error && (
        <div className="card-surface border border-[var(--border-subtle)] p-3 text-xs text-[var(--text-danger)] mb-4">
          Failed to load live KPIs – falling back to static placeholders.
          <br />
          <span className="text-[var(--text-muted)]">{state.error}</span>
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="card-surface p-4 border-l-4 border-l-[var(--mint)]">
          <div className="text-xs text-[var(--text-secondary)] mb-1">
            Gross Revenue
          </div>
          <div className="text-2xl font-semibold font-[var(--font-syne)]">
            {revenue != null ? `₹${revenue.toLocaleString("en-IN")}` : "—"}
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Last 7 days
            {revenueTrend != null && !Number.isNaN(revenueTrend)
              ? ` · ${revenueTrend >= 0 ? "up" : "down"} ${Math.abs(
                  revenueTrend,
                ).toFixed(1)}%`
              : ""}
          </p>
        </div>

        <div className="card-surface p-4 border-l-4 border-l-[var(--indigo)]">
          <div className="text-xs text-[var(--text-secondary)] mb-1">
            Blended Margin
          </div>
          <div className="text-2xl font-semibold font-[var(--font-syne)]">
            {margin != null ? `${margin.toFixed(1)}%` : "—"}
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Versus previous period
          </p>
        </div>

        <div className="card-surface p-4 border-l-4 border-l-[var(--amber)]">
          <div className="text-xs text-[var(--text-secondary)] mb-1">
            Waste Cost
          </div>
          <div className="text-2xl font-semibold font-[var(--font-syne)]">
            {waste != null ? `₹${waste.toLocaleString("en-IN")}` : "—"}
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            As captured from waste logs
          </p>
        </div>

        <div className="card-surface p-4 border-l-4 border-l-[var(--mint)]">
          <div className="text-xs text-[var(--text-secondary)] mb-1">
            Fulfilment Rate
          </div>
          <div className="text-2xl font-semibold font-[var(--font-syne)]">
            {fulfilment != null ? `${fulfilment.toFixed(1)}%` : "—"}
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Aggregated across all orders
          </p>
        </div>
      </section>
    </>
  );
}

