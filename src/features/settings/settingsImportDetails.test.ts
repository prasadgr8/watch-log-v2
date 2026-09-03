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
 * Regression coverage for the transient per-show import report (Alpha 15.3,
 * Slice 2). These are source-level assertions matching the repository's
 * established convention: they pin the implementation contract without a DOM
 * environment. The detailed report renders nothing when the execution result
 * produced no show outcomes, and each outcome group is hidden when empty.
 */
describe("TV Time import details report", () => {
  it("renders the details section from the executed import result", () => {
    expect(settingsSource).toContain(
      "<ImportDetailsSection shows={tvTimeImportResult.shows} />",
    );
  });

  it("uses a native disclosure for the collapsible breakdown", () => {
    // Native details/summary keeps the section keyboard and screen-reader
    // accessible without a custom disclosure widget.
    expect(settingsSource).toContain("<details");
    expect(settingsSource).toContain("<summary");
  });

  it("renders the Imported group with success semantics", () => {
    expect(settingsSource).toContain('label: "Imported"');
    expect(settingsSource).toContain("bg-success/10 text-success");
  });

  it("renders the Already in Library group with accent semantics", () => {
    expect(settingsSource).toContain('label: "Already in Library"');
    expect(settingsSource).toContain("bg-accent/15 text-accent-text");
  });

  it("renders the Skipped group with muted semantics", () => {
    expect(settingsSource).toContain('label: "Skipped"');
    expect(settingsSource).toContain("bg-surface-elevated text-muted");
  });

  it("renders the Not Matched group with warning semantics", () => {
    expect(settingsSource).toContain('label: "Not Matched"');
    expect(settingsSource).toContain("bg-warning/10 text-warning");
  });

  it("renders the Failed group with danger semantics", () => {
    expect(settingsSource).toContain('label: "Failed"');
    expect(settingsSource).toContain("bg-danger/10 text-danger");
  });

  it("skips outcome groups that contain no items", () => {
    // Only groups with at least one item are rendered, so zero-count groups
    // never clutter the report.
    expect(settingsSource).toMatch(
      /filter\(\(group\) => group\.items\.length > 0\)/,
    );
    expect(settingsSource).toContain("groups.length === 0");
    expect(settingsSource).toContain("return null");
  });

  it("groups outcomes by their execution classification", () => {
    // Each outcome constant from the service maps to exactly one label.
    for (const outcome of [
      "imported",
      "already-existed",
      "skipped",
      "unmatched",
      "failed",
    ]) {
      expect(settingsSource).toContain(`outcome: "${outcome}"`);
    }

    expect(settingsSource).toContain(
      "shows.filter((show) => show.outcome === group.outcome)",
    );
  });

  it("shows the display name with the TMDB id and a reason when present", () => {
    // Rows fall back to the TV Time title when no TMDB name was captured
    // (e.g. unmatched shows), surface the TMDB id when available, and show a
    // human-readable reason for skipped/unmatched/failed outcomes.
    expect(settingsSource).toContain("{show.tmdbName ?? show.title}");
    expect(settingsSource).toMatch(/TMDB\s*\{\s*show\.tmdbId\s*\}/);
    expect(settingsSource).toContain("{show.tmdbId !== undefined");
    expect(settingsSource).toContain("{show.reason");
  });

  it("keeps the aggregate counters rendered alongside the details", () => {
    // The nine aggregate counters remain the top-level outcome, unchanged by
    // the new breakdown.
    for (const label of [
      "Shows imported",
      "Shows skipped",
      "Shows failed",
      "Watched episodes imported",
      "Already watched",
      "Missing episodes",
      "Watched episodes skipped",
      "Watched episodes failed",
    ]) {
      expect(settingsSource).toContain(label);
    }
  });

  it("marks the summary toggle with accessible focus styling", () => {
    expect(settingsSource).toContain("focus-visible:ring-accent-hover/40");
  });
});