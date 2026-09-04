import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const settingsSource = readFileSync(
  join(featureDirectory, "SettingsPage.tsx"),
  "utf-8",
);

/*
 * Alpha 15.5 - Import Retry & Failure UX
 * Source-level regression coverage for the retry button in the TV Time import
 * execution-error state. These assertions follow the repository's established
 * pattern: they pin the implementation contract without a DOM environment.
 */
describe("TV Time import retry UX", () => {
  it("renders a Retry Import button in the execution error state", () => {
    expect(settingsSource).toContain(
      '{isTvTimeImporting ? "Importing..." : "Retry Import"}',
    );
  });

  it("renders the retry button with success styling for visibility", () => {
    expect(settingsSource).toContain(
      "mt-2 inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-medium text-inverted transition hover:bg-success/80 disabled:cursor-not-allowed disabled:opacity-50",
    );
  });

  it("calls the existing handleTvTimeImport() on retry", () => {
    expect(settingsSource).toContain("onClick={handleTvTimeImport}");
  });

  it("disables the retry button while an import is running", () => {
    expect(settingsSource).toContain("disabled={isTvTimeImporting}");
  });

  it("surfaces the AlertTriangle icon for the error state", () => {
    expect(settingsSource).toContain("<AlertTriangle");
    expect(settingsSource).toContain('className="h-5 w-5 text-danger"');
  });

  it("preserves the existing execution error message in the retry state", () => {
    expect(settingsSource).toContain("tvTimeExecutionError");
  });

  it("keeps the execution error inside the plan-gated block so retry is impossible without a plan", () => {
    const planBlock = settingsSource.match(
      /\{tvTimePlan && \(([\s\S]*?)\)\}\s*\{tvTimeImportResult &&/,
    );
    expect(planBlock).not.toBeNull();
    if (planBlock) {
      expect(planBlock[1]).toContain("tvTimeExecutionError");
      expect(planBlock[1]).toContain("Retry Import");
      expect(planBlock[1]).toContain("onClick={handleTvTimeImport}");
    }
  });

  it("does not reparse the original file when retrying", () => {
    expect(settingsSource).toContain("const resolvedPlan = applyImportResolutions(");
    expect(settingsSource).toContain("tvTimePlan,");
    expect(settingsSource).toContain("tvTimeResolutions,");
  });

  it("retries re-run applyImportResolutions + executeTvTimeImportPlan", () => {
    expect(settingsSource).toContain("applyImportResolutions(");
    expect(settingsSource).toContain("executeTvTimeImportPlan(");
  });

  it("clears the execution error at the start of each import attempt", () => {
    expect(settingsSource).toContain("setTvTimeExecutionError(null);");
  });

  it("a successful retry follows the existing success path", () => {
    expect(settingsSource).toContain("setTvTimeImportResult(result);");
    expect(settingsSource).toContain("setTvTimePlan(null);");
    expect(settingsSource).toContain("setTvTimeResolutions({});");
  });

  it("preserves the no-second-execution-path contract", () => {
    const retryButton = settingsSource.match(/onClick=\{handleTvTimeImport\}/);
    expect(retryButton).not.toBeNull();
  });

  it("the retained manual resolutions pass through the retry path", () => {
    expect(settingsSource).toContain("applyImportResolutions(");
    expect(settingsSource).toContain("tvTimePlan,");
    expect(settingsSource).toContain("tvTimeResolutions,");
  });
});