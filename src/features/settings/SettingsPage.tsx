import { parseCsvFromZip } from "../import/services/tvTimeCsvParser";
import type { FollowedTvShow } from "../import/types/tvTimeModels";
//import type { ImportPreview } from "../import/types/importPreview";
import {
  readTvTimeZip,
  // type TvTimeZipData,
} from "../import/services/tvTimeZipReader";

import {
  validateTvTimeFiles,
  type ValidationResult,
} from "../import/services/tvTimeValidator";
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
      const zipData = await readTvTimeZip(file);
      /*console.table(
        Object.values(zipData.zip.files).map((f) => ({
          name: f.name,
          dir: f.dir,
        })),
      );*/
      const result = validateTvTimeFiles(zipData.fileNames);

      setValidationResult(result);

      if (result.valid) {
        const shows = await parseCsvFromZip<FollowedTvShow>(
          zipData.zip,
          "followed_tv_show.csv",
        );

        setTvShowCount(shows.length);

        const progress = await parseCsvFromZip<Record<string, string>>(
          zipData.zip,
          "user_tv_show_data.csv",
        );

        console.log("Progress records:", progress.length);

        if (progress.length > 0) {
          console.log("First progress record:", progress[0]);
        }
      }

      //console.log(zipData);

      setValidationResult(result);
    } catch (error) {
      //console.error("Failed to read TV Time ZIP:", error);
      console.error(error);
    } finally {
      event.target.value = "";
    }
  }
  //console.log("tvShowCount state:", tvShowCount);
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-4xl font-bold text-white">Settings</h1>

        <p className="mt-2 text-lg text-slate-400">
          Manage your Watch Log V2 data and recovery options.
        </p>
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-blue-600/15 p-3 text-blue-400">
            <Download className="h-6 w-6" />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold text-white">
              Backup your data
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Create a JSON backup containing your library, episodes, watch
              history, and application settings.
            </p>

            <button
              type="button"
              onClick={() => void handleExportBackup()}
              disabled={isExporting}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download className="h-4 w-4" />

              {isExporting ? "Creating Backup..." : "Export Backup"}
            </button>

            {exportMessage && (
              <div className="mt-4 flex items-center gap-2 text-sm text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>{exportMessage}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-amber-500/15 p-3 text-amber-400">
            <RotateCcw className="h-6 w-6" />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold text-white">
              Restore from backup
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
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
              className="mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Upload className="h-4 w-4" />
              Choose Backup File
            </button>

            {restoreError && (
              <p
                role="alert"
                className="mt-4 rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300"
              >
                {restoreError}
              </p>
            )}

            {selectedBackup && (
              <div className="mt-6 rounded-xl border border-amber-900/70 bg-amber-950/20 p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />

                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-amber-200">
                      Confirm data replacement
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      This restore will replace all current Watch Log V2 local
                      data with the selected backup.
                    </p>

                    <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-white">
                        <FileJson className="h-4 w-4 text-blue-400" />
                        <span className="truncate">
                          {selectedBackup.fileName}
                        </span>
                      </div>

                      <dl className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        <div>
                          <dt className="text-xs uppercase tracking-wider text-slate-500">
                            Exported
                          </dt>

                          <dd className="mt-1 text-sm text-slate-200">
                            {formatExportedAt(selectedBackup.backup.exportedAt)}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-xs uppercase tracking-wider text-slate-500">
                            Library items
                          </dt>

                          <dd className="mt-1 text-sm text-slate-200">
                            {selectedBackup.backup.data.media.length}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-xs uppercase tracking-wider text-slate-500">
                            Episodes
                          </dt>

                          <dd className="mt-1 text-sm text-slate-200">
                            {selectedBackup.backup.data.episodes.length}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-xs uppercase tracking-wider text-slate-500">
                            Watch events
                          </dt>

                          <dd className="mt-1 text-sm text-slate-200">
                            {selectedBackup.backup.data.watchHistory.length}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-xs uppercase tracking-wider text-slate-500">
                            Settings
                          </dt>

                          <dd className="mt-1 text-sm text-slate-200">
                            {selectedBackup.backup.data.settings.length}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-xs uppercase tracking-wider text-slate-500">
                            Backup version
                          </dt>

                          <dd className="mt-1 text-sm text-slate-200">
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
                        className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
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
                        className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
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
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-purple-600/15 p-3 text-purple-400">
            <Database className="h-6 w-6" />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold text-white">
              Import from TV Time
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
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
              className="mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:bg-slate-700"
            >
              <Database className="h-4 w-4" />
              Choose TV Time ZIP
            </button>
            {tvTimeFileName && (
              <div className="mt-4 flex items-center gap-2 text-sm text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>{tvTimeFileName}</span>
              </div>
            )}
            {validationResult && (
              <div className="mt-5 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                <h3 className="mb-3 font-medium text-white">
                  TV Time Export Validation
                </h3>

                <div className="space-y-2">
                  {validationResult.found.map((file) => (
                    <div
                      key={file}
                      className="flex items-center gap-2 text-emerald-400"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{file}</span>
                    </div>
                  ))}
                </div>

                {validationResult.valid ? (
                  <>
                    {tvShowCount !== null && (
                      <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                        <div className="text-sm text-slate-400">
                          TV Shows Detected
                        </div>

                        <div className="mt-1 text-2xl font-bold text-white">
                          {tvShowCount}
                        </div>
                      </div>
                    )}

                    <p className="mt-4 text-sm text-emerald-400">
                      Ready to import.
                    </p>
                  </>
                ) : (
                  <p className="mt-4 text-sm text-red-400">
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
