import MetricsKPI from "@/components/dashboard/MetricsKPI";
import { CommandCentreInsights } from "@/components/dashboard/CommandCentreInsights";

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--surface)] text-[var(--text-primary)] px-4 py-8 md:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-sm font-medium tracking-[0.16em] text-[var(--text-muted)] uppercase">
              Command Centre
            </p>
            <h1 className="mt-1 text-2xl md:text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
              Good morning, Operator
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Wednesday, 4 March 2026 · Live Data
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs text-[var(--text-secondary)] shadow-sm dark:bg-[var(--midnight-800)]">
              <span className="inline-block h-2 w-2 rounded-full bg-[var(--mint)]" />
              <span className="font-medium text-[var(--text-primary)]">
                Constraints & KPIs Monitored
              </span>
            </div>
          </div>
        </header>

        <MetricsKPI />

        <CommandCentreInsights />
      </div>
    </main>
  );
}

