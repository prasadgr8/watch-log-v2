import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const resultsSource = readFileSync(
  join(featureDirectory, "SmartResultsSection.tsx"),
  "utf-8",
);

describe("smart results section", () => {
  it("reuses the existing MediaCard and MediaListItem presentations", () => {
    expect(resultsSource).toContain("MediaCard");
    expect(resultsSource).toContain("MediaListItem");
  });

  it("reuses the existing view-mode infrastructure", () => {
    expect(resultsSource).toContain("useViewMode(");
    expect(resultsSource).toContain("LIBRARY_VIEW_MODE_SETTING_KEY");
    expect(resultsSource).toContain("<ViewModeToggle");
  });

  it("reuses the existing density infrastructure without a Smart-specific key", () => {
    expect(resultsSource).toContain("useDensity(");
    expect(resultsSource).toContain('const SMART_DENSITY_KEY = "library-card-density"');
    expect(resultsSource).toContain("<DensityToggle");
  });

  it("shows a zero-results state that is not an error", () => {
    expect(resultsSource).toContain("0 titles match");
    expect(resultsSource).toContain("No media currently matches these filters.");
  });

  it("shows the live evaluation count", () => {
    expect(resultsSource).toContain("{media.length} {media.length === 1 ? \"title\" : \"titles\"} match");
  });

  it("never exposes collection membership controls", () => {
    expect(resultsSource).not.toContain("onRemove");
    expect(resultsSource).not.toContain("Add to collection");
    expect(resultsSource).not.toContain("Remove from collection");
  });
});