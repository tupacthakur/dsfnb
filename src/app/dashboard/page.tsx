import { CSVUploader } from "@/components/dashboard/CSVUploader";
import { AnalyticsPrompts } from "@/components/dashboard/AnalyticsPrompts";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[var(--surface)] text-[var(--text-primary)] px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-2">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            Analytics Hub
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Data ingestion and SAGE analysis. Upload your CSVs to generate
            Insight Cards and recommendations.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)]">
          <CSVUploader />
          <AnalyticsPrompts />
        </div>
      </div>
    </main>
  );
}

