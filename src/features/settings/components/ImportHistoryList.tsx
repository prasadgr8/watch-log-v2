import { AlertTriangle, CheckCircle2, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { importHistoryRepository } from "../../../database/repositories";
import type { ImportHistory, ImportHistoryStatus } from "../../../types";

interface ImportHistoryListProps {
  /** Incremented by the parent after each import run so the list reloads. */
  refreshToken: number;
}

const STATUS_LABELS: Record<ImportHistoryStatus, string> = {
  completed: "Completed",
  partial: "Partial",
  failed: "Failed",
};

const STATUS_CLASSES: Record<ImportHistoryStatus, string> = {
  completed: "border-success/60 bg-success/10 text-success",
  partial: "border-warning/60 bg-warning/10 text-warning",
  failed: "border-danger/60 bg-danger/10 text-danger",
};

function formatTimestamp(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDuration(durationMs: number): string {
  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }

  return `${(durationMs / 1000).toFixed(1)} s`;
}

function getSummary(record: ImportHistory): string {
  const showParts = [
    `${record.importedShows} imported`,
    `${record.skippedShows} skipped`,
    `${record.failedShows} failed`,
  ].join(" · ");

  const episodeParts = [
    `${record.importedWatchedEpisodes} imported`,
    `${record.alreadyWatchedEpisodes} already watched`,
    `${record.missingWatchedEpisodes} missing`,
    `${record.skippedWatchedEpisodes} skipped`,
    `${record.failedWatchedEpisodes} failed`,
  ].join(" · ");

  return `Shows — ${showParts} · Episodes — ${episodeParts}`;
}

export default function ImportHistoryList({
  refreshToken,
}: ImportHistoryListProps) {
  const [records, setRecords] = useState<ImportHistory[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory(): Promise<void> {
      try {
        const history = await importHistoryRepository.list();

        if (!cancelled) {
          setRecords(history);
          setLoadError(null);
        }
      } catch (error) {
        console.error("Failed to load import history:", error);

        if (!cancelled) {
          setRecords([]);
          setLoadError("Unable to load import history.");
        }
      }
    }

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  if (records === null) {
    return (
      <p
        aria-live="polite"
        className="mt-4 flex items-center gap-2 text-sm text-muted"
      >
        <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
        Loading import history...
      </p>
    );
  }

  if (loadError) {
    return (
      <p role="alert" className="mt-4 text-sm text-danger">
        {loadError}
      </p>
    );
  }

  if (records.length === 0) {
    return (
      <p className="mt-4 flex items-center gap-2 text-sm text-muted">
        <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
        No imports yet.
      </p>
    );
  }

  return (
    <ul className="mt-4 space-y-3" aria-label="Import history">
      {records.map((record) => (
        <li
          key={record.id}
          className="rounded-lg border border-border bg-surface/60 p-4"
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASSES[record.status]}`}
            >
              {record.status === "completed" ? (
                <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
              ) : (
                <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5" />
              )}
              {STATUS_LABELS[record.status]}
            </span>

            <span className="text-sm font-medium text-primary">
              {record.sourceFileName || "Unknown source"}
            </span>

            <span className="text-xs text-muted">
              {formatTimestamp(record.completedAt)}
            </span>
          </div>

          <p className="mt-2 text-xs leading-5 text-muted">
            {getSummary(record)}
          </p>

          {record.errorMessage && (
            <p
              role="alert"
              className="mt-2 rounded-lg border border-danger/60 bg-danger/10 px-3 py-2 text-sm text-danger"
            >
              {record.errorMessage}
            </p>
          )}

          <details className="mt-2 text-xs text-muted">
            <summary className="cursor-pointer select-none hover:text-primary">
              Details
            </summary>

            <dl className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
              <div className="flex gap-2">
                <dt>Provider:</dt>
                <dd>{record.provider}</dd>
              </div>

              <div className="flex gap-2">
                <dt>Timezone:</dt>
                <dd>{record.timezone}</dd>
              </div>

              <div className="flex gap-2">
                <dt>Duration:</dt>
                <dd>{formatDuration(record.durationMs)}</dd>
              </div>

              <div className="flex gap-2">
                <dt>Planned shows:</dt>
                <dd>
                  {record.totalShows} ({record.newShows} new,{" "}
                  {record.existingShows} existing, {record.unmatchedShows}{" "}
                  unmatched)
                </dd>
              </div>

              <div className="flex gap-2">
                <dt>Planned episodes:</dt>
                <dd>{record.plannedWatchedEpisodes}</dd>
              </div>

              <div className="flex gap-2">
                <dt>Warnings:</dt>
                <dd>{record.warnings.length}</dd>
              </div>
            </dl>

            {record.warnings.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {record.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}
          </details>
        </li>
      ))}
    </ul>
  );
}
