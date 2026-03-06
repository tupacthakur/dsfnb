import { SettingsLLMPanel } from "@/components/settings/SettingsLLMPanel";

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-[var(--surface)] text-[var(--text-primary)] px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            Settings
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Configure Koravo&apos;s narration model and external API endpoints.
          </p>
        </header>

        <SettingsLLMPanel />
      </div>
    </main>
  );
}

