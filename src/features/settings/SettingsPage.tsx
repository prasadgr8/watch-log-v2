import {
  applyImportResolutions,
  buildTvTimeImportPlan,
  executeTvTimeImportPlan,
  type TvTimeImportResult,
} from "../import/services/tvTimeImportService";
import type {
  TvTimeImportPlan,
  TvTimeImportProgress,
  TvTimeImportProgressPhase,
  TvTimeImportResolutions,
  TvTimeMatchDecision,
} from "../import/types/tvTimeImportPlan";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileJson,
  History,
  LoaderCircle,
  RotateCcw,
  Upload,
  Database,
} from "lucide-react";
import { ChangeEvent, useRef, useState } from "react";

import { backupService } from "../../services/backup/backupService";
import {
  BackupValidationError,
  validateAndHydrateBackup,
} from "../../services/backup/backupValidation";
import type { WatchLogBackupV1 } from "../../services/backup/backupTypes";

import ImportHistoryList from "./components/ImportHistoryList";
import TvTimeImportPreview from "./components/TvTimeImportPreview";

interface SelectedBackup {
  backup: WatchLogBackupV1;
  fileName: string;
}

function createBackupFileName(): string {
  const date = new Date().toISOString().slice(0, 10);

  return `watch-log-v2-backup-${date}.json`;
}

function downloadJsonFile(fileName: string, value: unknown): void {
  const json = JSON.stringify(value, null, 2);

  const blob = new Blob([json], {
    type: "application/json",
  });

  const objectUrl = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");

  downloadLink.href = objectUrl;
  downloadLink.download = fileName;

  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();

  URL.revokeObjectURL(objectUrl);
}

function formatExportedAt(exportedAt: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(exportedAt));
}

function getErrorMessage(error: unknown): string {
  if (error instanceof SyntaxError) {
    return "The selected file is not valid JSON.";
  }

  if (error instanceof BackupValidationError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected backup error occurred.";
}

function getTvTimePlanningMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Unable to read this TV Time export.";
}

function pluralizeCount(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

function getTvTimeImportLabel(plan: TvTimeImportPlan): string {
  // Counts reflect post-resolution reality: skipped shows and unattributable
  // watched rows are excluded so the button never promises more than the
  // executor will do.
  const newShows = plan.shows.filter(
    (show) => show.kind === "new" && show.resolution?.decision !== "skip",
  ).length;

  const watchedEpisodes = pluralizeCount(
    plan.watchedEpisodes.filter((episode) => !episode.skippedReason).length,
    "watched episode",
  );

  if (newShows === 0) {
    return `Import ${watchedEpisodes}`;
  }

  return `Import ${pluralizeCount(newShows, "new show")} · ${watchedEpisodes}`;
}

function getTvTimePhaseLabel(phase: TvTimeImportProgressPhase): string {
  return phase === "shows"
    ? "Importing shows"
    : "Applying watched episodes";
}

function getTvTimeQuartile(progress: TvTimeImportProgress): number {
  if (progress.total <= 0 || progress.current >= progress.total) {
    return 4;
  }

  return Math.floor((progress.current / progress.total) * 4);
}

export default function SettingsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tvTimeInputRef = useRef<HTMLInputElement>(null);
  const [selectedBackup, setSelectedBackup] = useState<SelectedBackup | null>(
    null,
  );

  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [tvTimeFileName, setTvTimeFileName] = useState<string | null>(null);
  const [isTvTimePlanning, setIsTvTimePlanning] = useState(false);
  const [tvTimePlanningError, setTvTimePlanningError] = useState<string | null>(
    null,
  );

  const [tvTimeExecutionError, setTvTimeExecutionError] =
    useState<string | null>(null);

  const [tvTimePlan, setTvTimePlan] = useState<TvTimeImportPlan | null>(null);

  const [tvTimeResolutions, setTvTimeResolutions] =
    useState<TvTimeImportResolutions>({});

  // Identity guard so a stale ZIP resolution can never overwrite the plan of
  // a newer selection (or of a cancelled preview).
  const tvTimeSelectedFileRef = useRef<File | null>(null);

  const [isTvTimeImporting, setIsTvTimeImporting] = useState(false);

  const [tvTimeProgress, setTvTimeProgress] =
    useState<TvTimeImportProgress | null>(null);

  // Last coarse milestone announced to assistive technology. Updated only on
  // phase transitions / quartiles so live regions are not flooded per row.
  const [tvTimeAnnouncement, setTvTimeAnnouncement] = useState("");

  const tvTimeMilestoneRef = useRef<{ phase: string; step: number }>({
    phase: "",
    step: -1,
  });
  const [tvTimeImportResult, setTvTimeImportResult] =
    useState<TvTimeImportResult | null>(null);

  // Bumped after every import run (success or failure) so the history list
  // reloads; both outcomes persist an import-history record.
  const [importHistoryRefreshToken, setImportHistoryRefreshToken] = useState(0);
  async function handleExportBackup(): Promise<void> {
    try {
      setIsExporting(true);
      setExportMessage(null);

      const backup = await backupService.createBackup();

      downloadJsonFile(createBackupFileName(), backup);

      setExportMessage("Backup created successfully.");
    } catch (error) {
      console.error("Failed to export backup:", error);

      setExportMessage("Unable to create backup.");
    } finally {
      setIsExporting(false);
    }
  }

  async function handleBackupFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = event.target.files?.[0];

    setSelectedBackup(null);
    setRestoreError(null);

    if (!file) {
      return;
    }

    try {
      const fileText = await file.text();
      const parsedBackup: unknown = JSON.parse(fileText);

      validateAndHydrateBackup(parsedBackup);

      setSelectedBackup({
        backup: parsedBackup as WatchLogBackupV1,
        fileName: file.name,
      });
    } catch (error) {
      console.error("Failed to read backup file:", error);

      setRestoreError(getErrorMessage(error));
    } finally {
      event.target.value = "";
    }
  }

  async function handleRestoreBackup(): Promise<void> {
    if (!selectedBackup) {
      return;
    }

    try {
      setIsRestoring(true);
      setRestoreError(null);

      await backupService.restoreBackup(selectedBackup.backup);

      window.location.reload();
    } catch (error) {
      console.error("Failed to restore backup:", error);

      setRestoreError(getErrorMessage(error));
      setIsRestoring(false);
    }
  }

  function handleChooseBackup(): void {
    fileInputRef.current?.click();
  }

  function handleCancelRestore(): void {
    setSelectedBackup(null);
    setRestoreError(null);
  }
  function handleChooseTvTimeExport(): void {
    tvTimeInputRef.current?.click();
  }

  function handleCancelTvTimePreview(): void {
    tvTimeSelectedFileRef.current = null;

    setTvTimeFileName(null);
    setTvTimePlan(null);
    setTvTimeResolutions({});
    setTvTimePlanningError(null);
    setTvTimeExecutionError(null);
    setTvTimeImportResult(null);
    setTvTimeProgress(null);
    setIsTvTimePlanning(false);
  }

  function handleResolveTvTimeMatch(
    tvTimeShowId: string,
    decision: TvTimeMatchDecision,
  ): void {
    setTvTimeResolutions((current) => ({
      ...current,
      [tvTimeShowId]: decision,
    }));
  }

  async function handleTvTimeFileSelected(
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    // Planning is read-only, but it is asynchronous: guard against a stale
    // resolution overwriting the plan of a newer/cancelled selection.
    tvTimeSelectedFileRef.current = file;

    setTvTimeFileName(file.name);
    setTvTimePlan(null);
    setTvTimeResolutions({});
    setTvTimePlanningError(null);
    setTvTimeExecutionError(null);
    setTvTimeImportResult(null);
    setTvTimeProgress(null);
    setIsTvTimePlanning(true);

    event.target.value = "";

    try {
      const plan = await buildTvTimeImportPlan(file);

      if (tvTimeSelectedFileRef.current !== file) {
        return;
      }

      setTvTimePlan(plan);
    } catch (error) {
      console.error("Failed to plan TV Time export:", error);

      if (tvTimeSelectedFileRef.current !== file) {
        return;
      }

      setTvTimePlanningError(getTvTimePlanningMessage(error));
    } finally {
      if (tvTimeSelectedFileRef.current === file) {
        setIsTvTimePlanning(false);
      }
    }
  }
  async function handleTvTimeImport(): Promise<void> {
    if (!tvTimePlan || isTvTimePlanning || isTvTimeImporting) {
      return;
    }

    // Belt-and-braces alongside the disabled button: refuse to execute while
    // any reviewed show still lacks an explicit decision.
    const unresolvedReviewCount = tvTimePlan.shows.filter(
      (show) => show.review && !show.resolution,
    ).length;

    if (unresolvedReviewCount > 0) {
      return;
    }

    setIsTvTimeImporting(true);
    setTvTimeExecutionError(null);
    setTvTimeProgress(null);
    setTvTimeAnnouncement("");
    tvTimeMilestoneRef.current = { phase: "", step: -1 };

    try {
      const resolvedPlan = applyImportResolutions(
        tvTimePlan,
        tvTimeResolutions,
      );

      const result = await executeTvTimeImportPlan(resolvedPlan, {
        onProgress: (progress) => {
          setTvTimeProgress(progress);

          // Announce phase transitions and quartiles only; individual rows
          // would make screen-reader output unusable.
          const step = getTvTimeQuartile(progress);

          if (
            tvTimeMilestoneRef.current.phase !== progress.phase ||
            step > tvTimeMilestoneRef.current.step
          ) {
            tvTimeMilestoneRef.current = { phase: progress.phase, step };

            setTvTimeAnnouncement(
              `${getTvTimePhaseLabel(progress.phase)}: ` +
                `${progress.current} of ${progress.total}`,
            );
          }
        },
      });

      setTvTimeImportResult(result);
      setTvTimePlan(null);
      setTvTimeResolutions({});
    } catch (error) {
      console.error("Failed to import TV Time export:", error);

      setTvTimeExecutionError(
        error instanceof Error
          ? error.message
          : "The TV Time import failed unexpectedly.",
      );
    } finally {
      setIsTvTimeImporting(false);
      setTvTimeProgress(null);
      setImportHistoryRefreshToken((token) => token + 1);
    }
  }
  const pendingTvTimeReviewCount = tvTimePlan
    ? tvTimePlan.shows.filter((show) => show.review && !show.resolution).length
    : 0;

  const canImportTvTime =
    tvTimePlan !== null &&
    !isTvTimePlanning &&
    !isTvTimeImporting &&
    pendingTvTimeReviewCount === 0;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-4xl font-bold text-primary">Settings</h1>

        <p className="mt-2 text-lg text-muted">
          Manage your Watch Log V2 data and recovery options.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-surface p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-accent/15 p-3 text-accent-text">
            <Download className="h-6 w-6" />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold text-primary">
              Backup your data
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Create a JSON backup containing your library, episodes, watch
              history, and application settings.
            </p>

            <button
              type="button"
              onClick={() => void handleExportBackup()}
              disabled={isExporting}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-inverted transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download className="h-4 w-4" />

              {isExporting ? "Creating Backup..." : "Export Backup"}
            </button>

            {exportMessage && (
              <div className="mt-4 flex items-center gap-2 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" />
                <span>{exportMessage}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-warning/15 p-3 text-warning">
            <RotateCcw className="h-6 w-6" />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold text-primary">
              Restore from backup
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Restore Watch Log V2 from a previously exported JSON backup.
              Restoring replaces your current local library, episodes, watch
              history, and settings.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={(event) => void handleBackupFileChange(event)}
              className="hidden"
            />

            <button
              type="button"
              onClick={handleChooseBackup}
              disabled={isRestoring}
              className="mt-5 inline-flex items-center gap-2 rounded-lg border border-muted bg-input-bg px-4 py-2.5 text-sm font-medium text-primary transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Upload className="h-4 w-4" />
              Choose Backup File
            </button>

            {restoreError && (
              <p
                role="alert"
                className="mt-4 rounded-lg border border-danger/60 bg-danger/10 px-4 py-3 text-sm text-danger"
              >
                {restoreError}
              </p>
            )}

            {selectedBackup && (
              <div className="mt-6 rounded-xl border border-warning/40 bg-warning/10 p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />

                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-warning">
                      Confirm data replacement
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-muted">
                      This restore will replace all current Watch Log V2 local
                      data with the selected backup.
                    </p>

                    <div className="mt-4 rounded-lg border border-border bg-app-bg/60 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-primary">
                        <FileJson className="h-4 w-4 text-accent-text" />
                        <span className="truncate">
                          {selectedBackup.fileName}
                        </span>
                      </div>

                      <dl className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        <div>
                          <dt className="text-xs uppercase tracking-wider text-muted">
                            Exported
                          </dt>

                          <dd className="mt-1 text-sm text-primary">
                            {formatExportedAt(selectedBackup.backup.exportedAt)}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-xs uppercase tracking-wider text-muted">
                            Library items
                          </dt>

                          <dd className="mt-1 text-sm text-primary">
                            {selectedBackup.backup.data.media.length}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-xs uppercase tracking-wider text-muted">
                            Episodes
                          </dt>

                          <dd className="mt-1 text-sm text-primary">
                            {selectedBackup.backup.data.episodes.length}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-xs uppercase tracking-wider text-muted">
                            Watch events
                          </dt>

                          <dd className="mt-1 text-sm text-primary">
                            {selectedBackup.backup.data.watchHistory.length}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-xs uppercase tracking-wider text-muted">
                            Settings
                          </dt>

                          <dd className="mt-1 text-sm text-primary">
                            {selectedBackup.backup.data.settings.length}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-xs uppercase tracking-wider text-muted">
                            Backup version
                          </dt>

                          <dd className="mt-1 text-sm text-primary">
                            {selectedBackup.backup.version}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => void handleRestoreBackup()}
                        disabled={isRestoring}
                        className="inline-flex items-center gap-2 rounded-lg bg-danger px-4 py-2.5 text-sm font-medium text-inverted transition hover:bg-danger/80 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <RotateCcw className="h-4 w-4" />

                        {isRestoring
                          ? "Restoring..."
                          : "Restore and Replace Data"}
                      </button>

                      <button
                        type="button"
                        onClick={handleCancelRestore}
                        disabled={isRestoring}
                        className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
      <section className="rounded-xl border border-border bg-surface p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-accent/15 p-3 text-accent-text">
            <Database className="h-6 w-6" />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold text-primary">
              Import from TV Time
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Select your TV Time GDPR ZIP export. Watch Log will validate the
              archive and import your library, watch progress, and ratings.
            </p>

            <input
              ref={tvTimeInputRef}
              type="file"
              accept=".zip"
              onChange={handleTvTimeFileSelected}
              className="hidden"
            />

            <button
              type="button"
              onClick={handleChooseTvTimeExport}
              className="mt-5 inline-flex items-center gap-2 rounded-lg border border-muted bg-input-bg px-4 py-2.5 text-sm font-medium text-primary transition hover:bg-surface-hover"
            >
              <Database className="h-4 w-4" />
              Choose TV Time ZIP
            </button>
            {tvTimeFileName && (
              <div className="mt-4 flex items-center gap-2 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" />
                <span>{tvTimeFileName}</span>
              </div>
            )}
            {isTvTimePlanning && (
              <p
                aria-live="polite"
                className="mt-4 flex items-center gap-2 text-sm text-muted"
              >
                <LoaderCircle
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin"
                />
                Analyzing TV Time export...
              </p>
            )}

            {tvTimePlanningError && (
              <p
                role="alert"
                className="mt-4 rounded-lg border border-danger/60 bg-danger/10 px-4 py-3 text-sm text-danger"
              >
                {tvTimePlanningError}
              </p>
            )}

            {tvTimeExecutionError && (
              <p
                role="alert"
                className="mt-4 rounded-lg border border-danger/60 bg-danger/10 px-4 py-3 text-sm text-danger"
              >
                {tvTimeExecutionError}
              </p>
            )}

            {tvTimePlan && (
              <>
                <TvTimeImportPreview
                  fileName={tvTimeFileName ?? undefined}
                  plan={tvTimePlan}
                  resolutions={tvTimeResolutions}
                  onResolve={handleResolveTvTimeMatch}
                />

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void handleTvTimeImport()}
                    disabled={!canImportTvTime}
                    className="rounded-lg bg-success px-4 py-2 text-sm font-medium text-inverted transition hover:bg-success/80 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isTvTimeImporting
                      ? "Importing..."
                      : getTvTimeImportLabel(tvTimePlan)}
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelTvTimePreview}
                    disabled={isTvTimeImporting}
                    className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-muted transition hover:bg-surface-hover hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  {isTvTimeImporting && (
                    <div className="w-full rounded-lg border border-border bg-app-bg/60 p-3">
                      <div className="flex min-w-0 items-center justify-between gap-3">
                        <span className="min-w-0 break-words text-sm font-medium text-primary">
                          Importing TV Time export...
                        </span>

                        {tvTimeProgress && (
                          <span className="shrink-0 text-xs text-muted">
                            {getTvTimePhaseLabel(tvTimeProgress.phase)} ·{" "}
                            {tvTimeProgress.current} of {tvTimeProgress.total}
                          </span>
                        )}
                      </div>

                      {tvTimeProgress && (
                        <div
                          role="progressbar"
                          aria-label="Importing TV Time export"
                          aria-valuemin={0}
                          aria-valuemax={tvTimeProgress.total}
                          aria-valuenow={tvTimeProgress.current}
                          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-accent/15"
                        >
                          <div
                            className="h-full rounded-full bg-accent transition-all"
                            style={{
                              width: `${
                                tvTimeProgress.total > 0
                                  ? Math.round(
                                      (tvTimeProgress.current /
                                        tvTimeProgress.total) *
                                        100,
                                    )
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      )}

                      <p className="sr-only" aria-live="polite">
                        {tvTimeAnnouncement}
                      </p>
                    </div>
                  )}

                  {pendingTvTimeReviewCount > 0 && (
                    <p className="w-full text-sm text-warning">
                      Resolve all items marked Needs review before importing.
                    </p>
                  )}
                </div>
              </>
            )}
            {tvTimeImportResult && (
              <div className="mt-5 rounded-lg border border-border bg-surface/60 p-4">
                <h3 className="font-medium text-primary">Import Complete</h3>

                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div>
                    <div className="text-xs text-muted">Shows imported</div>

                    <div className="mt-1 text-xl font-semibold text-primary">
                      {tvTimeImportResult.importedShows}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-muted">Shows skipped</div>

                    <div className="mt-1 text-xl font-semibold text-primary">
                      {tvTimeImportResult.skippedShows}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-muted">Shows failed</div>

                    <div className="mt-1 text-xl font-semibold text-primary">
                      {tvTimeImportResult.failedShows}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-muted">
                      Watched episodes imported
                    </div>

                    <div className="mt-1 text-xl font-semibold text-primary">
                      {tvTimeImportResult.importedWatchedEpisodes}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-muted">Already watched</div>

                    <div className="mt-1 text-xl font-semibold text-primary">
                      {tvTimeImportResult.alreadyWatchedEpisodes}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-muted">Missing episodes</div>

                    <div className="mt-1 text-xl font-semibold text-primary">
                      {tvTimeImportResult.missingWatchedEpisodes}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-muted">
                      Watched episodes skipped
                    </div>

                    <div className="mt-1 text-xl font-semibold text-primary">
                      {tvTimeImportResult.skippedWatchedEpisodes}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-muted">
                      Watched episodes failed
                    </div>

                    <div className="mt-1 text-xl font-semibold text-primary">
                      {tvTimeImportResult.failedWatchedEpisodes}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-accent/15 p-3 text-accent-text">
            <History className="h-6 w-6" />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold text-primary">
              Import history
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Past TV Time imports with their outcome and summary. History is
              stored locally in your browser and never leaves this device.
            </p>

            <ImportHistoryList refreshToken={importHistoryRefreshToken} />
          </div>
        </div>
      </section>
    </div>
  );
}
