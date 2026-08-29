import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const settingsSource = readFileSync(
  join(featureDirectory, "SettingsPage.tsx"),
  "utf-8",
);

const previewSource = readFileSync(
  join(featureDirectory, "components/TvTimeImportPreview.tsx"),
  "utf-8",
);

const combinedSources = [settingsSource, previewSource].join("\n");

/*
 * Responsive regression coverage for the Settings feature's TV Time import
 * workflow. These are source-level assertions (matching the mobile navigation,
 * dashboard, library, TV details, search, and statistics test patterns) and
 * guard the mobile-first breakpoints plus the narrow-width hardening that
 * keeps the import preview free of horizontal overflow.
 */
describe("settings responsive layout", () => {
  it("wraps section text blocks instead of forcing a fixed row", () => {
    // Each section header uses a min-w-0 flex text block so long description
    // text reflows on narrow screens.
    expect(settingsSource).toContain("flex items-start gap-4");
    expect(settingsSource).toContain("min-w-0 flex-1");
  });

  it("stacks backup metadata mobile-first on standard breakpoints", () => {
    // One column by default, two at sm, three only at xl.
    expect(settingsSource).toContain(
      "grid gap-4 sm:grid-cols-2 xl:grid-cols-3",
    );
  });

  it("renders the preview summary as a mobile-first grid", () => {
    // Four summary cards: stacked by default, two at sm, four only at xl.
    expect(previewSource).toContain("grid gap-3 sm:grid-cols-2 xl:grid-cols-4");
  });

  it("stacks the TV Time import result grid mobile-first", () => {
    // Three columns only from sm upward.
    expect(settingsSource).toContain("grid gap-3 sm:grid-cols-3");
  });

  it("wraps the ready-to-import controls so they reflow on narrow screens", () => {
    // The Import action row allows wrapping so the button takes the full width
    // without colliding with the status text on small screens.
    expect(settingsSource).toContain("flex flex-wrap items-center gap-3");
  });

  it("uses native disclosure elements for show-level detail", () => {
    // Native details/summary keeps expandable sections keyboard accessible
    // without a custom ARIA disclosure widget.
    expect(previewSource).toContain("<details");
    expect(previewSource).toContain("<summary");
  });

  it("keeps long show titles wrapped instead of overflowing", () => {
    expect(previewSource).toContain("min-w-0");
    expect(previewSource).toContain("break-words");
  });

  it("styles unmatched shows and warnings with attention semantics", () => {
    // Attention is warning-toned rather than fatal danger styling so users
    // can tell informational issues from real failures.
    expect(previewSource).toContain("text-warning");
    expect(previewSource).toContain("border-warning/40");
    expect(previewSource).toContain("bg-warning/10");
  });

  it("plans before allowing execution instead of importing raw files", () => {
    // The page builds a read-only plan and executes that exact plan, never a
    // raw File — guaranteeing matching happens exactly once.
    expect(settingsSource).toContain("buildTvTimeImportPlan(file)");
    expect(settingsSource).toMatch(/executeTvTimeImportPlan\(/);
    expect(settingsSource).not.toMatch(/executeTvTimeImport\(/);
  });

  it("announces planning progress accessibly", () => {
    expect(settingsSource).toContain('aria-live="polite"');
  });

  it("exposes conflict resolution with native radio semantics", () => {
    expect(previewSource).toContain('type="radio"');
    expect(previewSource).toContain("Needs review");
    expect(previewSource).toContain("Skip this show");
  });

  it("keys resolutions by stable show identity in the page", () => {
    expect(settingsSource).toContain("onResolve={handleResolveTvTimeMatch}");
    expect(settingsSource).toContain("resolutions={tvTimeResolutions}");
    expect(settingsSource).toContain("applyImportResolutions(");
  });

  it("does not introduce arbitrary fixed-width constraints that can overflow", () => {
    expect(combinedSources).not.toMatch(/min-w-\[|max-w-\[|w-\[\d+px\]/);
  });

  it("reports execution progress accessibly", () => {
    expect(settingsSource).toContain('role="progressbar"');
    expect(settingsSource).toContain("aria-valuemin");
    expect(settingsSource).toContain("aria-valuenow");
    expect(settingsSource).toContain('aria-live="polite"');
    expect(settingsSource).toContain("Importing TV Time export");
  });
});