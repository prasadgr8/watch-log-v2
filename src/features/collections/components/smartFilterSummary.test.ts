import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const summarySource = readFileSync(
  join(featureDirectory, "SmartFilterSummary.tsx"),
  "utf-8",
);

describe("SmartFilterSummary (source contract)", () => {
  it("renders short summaries fully without a +N more control", () => {
    expect(summarySource).toContain("const VISIBLE_TAGS = 4;");
    expect(summarySource).toContain("hiddenCount <= 0");
    expect(summarySource).toContain("hiddenCount > 0 &&");
  });

  it("hides overflow tags behind a deterministic +N more control", () => {
    expect(summarySource).toContain("tags.slice(0, VISIBLE_TAGS)");
    expect(summarySource).toContain("+${hiddenCount} more");
  });

  it("allows expansion and collapse of the remaining tags", () => {
    expect(summarySource).toContain("Show less");
    expect(summarySource).toContain("aria-expanded={isExpanded}");
    expect(summarySource).toContain("setIsExpanded((expanded) => !expanded)");
  });

  it("preserves OR semantics for genres and the empty-filters state", () => {
    expect(summarySource).toContain('join(" OR ")');
    expect(summarySource).toContain("All library media");
  });
});
