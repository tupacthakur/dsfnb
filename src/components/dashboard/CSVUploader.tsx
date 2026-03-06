"use client";

import { useState } from "react";

interface UploadResult {
  ingestionLogId: string;
  tierCompliance: {
    tier1Fields: string[];
    tier2Fields: string[];
    smartDefaults: string[];
  };
}

export function CSVUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0] ?? null;
    setFile(next);
    setError(null);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append(
        "options",
        JSON.stringify({
          autoAnalyze: true,
          fieldMappings: {},
        }),
      );

      const res = await fetch("/api/ingest/csv", {
        method: "POST",
        body: formData,
      });

      let json: any;
      try {
        json = await res.json();
      } catch {
        throw new Error("Failed to read upload response from server");
      }
      if (!res.ok || !json.success) {
        const message =
          json?.error?.message ??
          `Upload failed with status ${res.status.toString()}`;
        setError(message);
        return;
      }

      setResult(json.data as UploadResult);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unexpected error during upload",
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <section className="card-surface p-4 md:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] font-display">
            Data Ingestion
          </h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Upload a CSV to trigger SAGE analysis and generate Insight Cards.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-dashed border-[var(--border)] bg-white/60 p-4 text-xs text-[var(--text-secondary)] dark:bg-[var(--midnight-800)]">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="block w-full text-xs file:mr-3 file:rounded-lg file:border file:border-[var(--border)] file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-[var(--text-primary)] hover:file:bg-slate-50 dark:file:bg-[var(--midnight-700)] dark:hover:file:bg-[var(--midnight-600)]"
        />
        <p className="mt-2">
          Accepted: <span className="font-medium">.csv</span> · Up to 50MB
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={!file || isUploading}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--indigo)] px-4 py-2 text-xs font-medium text-white shadow-sm transition-transform duration-180 hover:scale-[1.02] disabled:opacity-50"
          onClick={handleUpload}
        >
          {isUploading ? "Uploading…" : "Upload & Analyse"}
        </button>
        {file && (
          <span className="truncate text-[11px] text-[var(--text-muted)]">
            Selected: <span className="font-medium">{file.name}</span>
          </span>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-[var(--red)]/40 bg-[var(--red)]/5 px-3 py-2 text-[11px] text-[var(--red)]">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--mint-dim)]/40 px-3 py-2 text-[11px] text-[var(--text-secondary)]">
          <p className="text-[var(--text-primary)] font-medium">
            Ingestion complete · Context saved
          </p>
          <p className="mt-1">
            Tier 1 fields:{" "}
            <span className="font-mono text-[10px]">
              {result.tierCompliance.tier1Fields.join(", ") || "none"}
            </span>
          </p>
          <p className="mt-1">
            Tier 2 fields:{" "}
            <span className="font-mono text-[10px]">
              {result.tierCompliance.tier2Fields.join(", ") || "none"}
            </span>
          </p>
          {result.tierCompliance.smartDefaults.length > 0 && (
            <p className="mt-1">
              Smart defaults:{" "}
              <span className="font-mono text-[10px]">
                {result.tierCompliance.smartDefaults.join(", ")}
              </span>
            </p>
          )}
          <p className="mt-1">
            Context label:{" "}
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--midnight-700)]/40 px-2 py-0.5 font-mono text-[10px] text-[var(--text-primary)]">
              ingestion:{result.ingestionLogId.slice(0, 8)}
            </span>
          </p>
        </div>
      )}
    </section>
  );
}

