import {
  buildTvTimeImportPreview,
  executeTvTimeImport,
  type TvTimeImportResult,
} from "../import/services/tvTimeImportService";
import type { ValidationResult } from "../import/services/tvTimeValidator";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileJson,
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
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);

  const [tvShowCount, setTvShowCount] = useState<number | null>(null);
  const [progressCount, setProgressCount] = useState<number | null>(null);
  const [tvTimeImportFile, setTvTimeImportFile] = useState<File | null>(null);
  const [isTvTimeImporting, setIsTvTimeImporting] = useState(false);
  const [tvTimeImportResult, setTvTimeImportResult] =
    useState<TvTimeImportResult | null>(null);
  //const [tvTimeZip, setTvTimeZip] = useState<TvTimeZipData | null>(null);
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

  async function handleTvTimeFileSelected(
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setTvTimeFileName(file.name);

    try {
      const preview = await buildTvTimeImportPreview(file);

      setValidationResult(preview.validation);

      if (!preview.valid) {
        setTvShowCount(null);
        setProgressCount(null);
        return;
      }

      setTvShowCount(preview.tvShows);
      setProgressCount(preview.tvShowData);
      setTvTimeImportFile(file);
    } catch (error) {
      console.error("Failed to preview TV Time export:", error);
    } finally {
      event.target.value = "";
    }
  }
  async function handleTvTimeImport(): Promise<void> {
    if (!tvTimeImportFile) {
      return;
    }

    setIsTvTimeImporting(true);

    try {
      const result = await executeTvTimeImport(tvTimeImportFile);

      setTvTimeImportResult(result);
      setTvTimeImportFile(null);
    } catch (error) {
      console.error("Failed to import TV Time export:", error);
    } finally {
      setIsTvTimeImporting(false);
    }
  }
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
              className="mt-5 inline-flex items-center gap-2 rounded-lg border border-border bg-input-bg px-4 py-2.5 text-sm font-medium text-primary transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
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
              className="mt-5 inline-flex items-center gap-2 rounded-lg border border-border bg-input-bg px-4 py-2.5 text-sm font-medium text-primary transition hover:bg-surface-hover"
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
            {validationResult && (
              <div className="mt-5 rounded-lg border border-border bg-app-bg/60 p-4">
                <h3 className="mb-3 font-medium text-primary">
                  TV Time Export Validation
                </h3>

                <div className="space-y-2">
                  {validationResult.found.map((file) => (
                    <div
                      key={file}
                      className="flex items-center gap-2 text-success"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{file}</span>
                    </div>
                  ))}
                </div>

                {validationResult.valid ? (
                  <>
                    {tvShowCount !== null && (
                      <div className="mt-4 rounded-lg border border-border bg-surface/60 p-3">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <div className="text-sm text-muted">
                              TV Shows
                            </div>

                            <div className="mt-1 text-2xl font-bold text-primary">
                              {tvShowCount}
                            </div>
                          </div>

                          <div>
                            <div className="text-sm text-muted">
                              TV Show Data
                            </div>

                            <div className="mt-1 text-2xl font-bold text-primary">
                              {progressCount ?? "-"}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-4 flex items-center gap-3">
                      <p className="text-sm text-success">
                        Ready to import.
                      </p>

                      <button
                        type="button"
                        onClick={handleTvTimeImport}
                        disabled={!tvTimeImportFile || isTvTimeImporting}
                        className="rounded-lg bg-success px-4 py-2 text-sm font-medium text-inverted transition hover:bg-success/80 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isTvTimeImporting ? "Importing..." : "Import"}
                      </button>
                    </div>
                    {tvTimeImportResult && (
                      <div className="mt-5 rounded-lg border border-border bg-surface/60 p-4">
                        <h3 className="font-medium text-primary">
                          Import Complete
                        </h3>

                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                          <div>
                            <div className="text-xs text-muted">
                              Shows imported
                            </div>
                            <div className="text-xl font-semibold text-primary">
                              {tvTimeImportResult.importedShows}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs text-muted">
                              Shows skipped
                            </div>
                            <div className="text-xl font-semibold text-primary">
                              {tvTimeImportResult.skippedShows}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs text-muted">
                              Shows failed
                            </div>
                            <div className="text-xl font-semibold text-primary">
                              {tvTimeImportResult.failedShows}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs text-muted">
                              Watched episodes imported
                            </div>
                            <div className="text-xl font-semibold text-primary">
                              {tvTimeImportResult.importedWatchedEpisodes}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs text-muted">
                              Watched episodes skipped
                            </div>
                            <div className="text-xl font-semibold text-primary">
                              {tvTimeImportResult.skippedWatchedEpisodes}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs text-muted">
                              Watched episodes failed
                            </div>
                            <div className="text-xl font-semibold text-primary">
                              {tvTimeImportResult.failedWatchedEpisodes}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="mt-4 text-sm text-danger">
                    Missing required files.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
