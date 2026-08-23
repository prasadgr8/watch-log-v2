import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const STATISTICS_SOURCES = [
  "StatisticsPage.tsx",
  "components/StatisticCard.tsx",
] as const;

const sources = STATISTICS_SOURCES.map((fileName) => ({
  fileName,
  source: readFileSync(join(featureDirectory, fileName), "utf-8"),
}));

const stylesheet = readFileSync(
  join(featureDirectory, "..", "..", "index.css"),
  "utf-8",
);

/*
 * Tailwind palette utilities that only render correctly on the dark theme.
 * The statistics feature must style itself exclusively through semantic theme
 * utilities so light mode stays readable.
 */
const HARD_CODED_DARK_PATTERNS = [
  "\\bslate-",
  "\\btext-white\\b",
  "\\bbg-white\\b",
  "\\bblue-",
  "\\bred-",
  "\\bgreen-",
  "\\bemerald-",
  "\\bamber-",
  "\\byellow-",
  "\\bgray-",
  "\\bzinc-",
  "\\bneutral-",
  "\\bstone-",
  "\\bindigo-",
  "\\bpurple-",
  "\\bviolet-",
  "\\bsky-",
  "\\bteal-",
  "\\bcyan-",
  "\\borange-",
  "\\bfuchsia-",
  "\\bpink-",
  "#[0-9a-fA-F]{3,8}\\b",
] as const;

/*
 * Semantic utilities the statistics feature is expected to consume after the
 * Stage 2B-5 conversion. Category icon colors normalize onto the semantic
 * families: blue informational (accent), amber pending/caution/ratings
 * (warning), green positive (success), red negative (danger).
 */
const REQUIRED_SEMANTIC_UTILITIES = [
  "text-primary",
  "text-muted",
  "border-border",
  "bg-surface",
  "hover:border-accent-hover",
  "text-accent-text",
  "text-warning",
  "text-success",
  "text-danger",
] as const;

/*
 * Tokens that both palettes declare explicitly. The dark @theme block is the
 * baseline and the html[data-theme="light"] block overrides each of these;
 * accent fills are re-declared with identical values on purpose so actions
 * stay consistent across themes.
 */
const THEME_VARIANT_TOKENS = [
  "--color-surface",
  "--color-border",
  "--color-primary",
  "--color-muted",
  "--color-accent-hover",
  "--color-accent-text",
  "--color-danger",
  "--color-success",
  "--color-warning",
] as const;

describe("statistics theme conversion", () => {
  it("no longer hard-codes the dark palette or arbitrary colors", () => {
    for (const { fileName, source } of sources) {
      for (const pattern of HARD_CODED_DARK_PATTERNS) {
        expect(source, `${fileName}: ${pattern}`).not.toMatch(
          new RegExp(pattern),
        );
      }
    }
  });

  it("styles the statistics feature through semantic theme utilities", () => {
    const combined = sources.map((entry) => entry.source).join("\n");

    for (const utility of REQUIRED_SEMANTIC_UTILITIES) {
      expect(combined, utility).toContain(utility);
    }
  });

  it("only consumes tokens that are defined for both the dark and light themes", () => {
    for (const token of THEME_VARIANT_TOKENS) {
      expect(stylesheet.split(`${token}:`).length - 1, token).toBe(2);
    }
  });
});
