import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const tvDetailsSource = readFileSync(
  join(featureDirectory, "TvShowDetailsPage.tsx"),
  "utf-8",
);

const stylesheet = readFileSync(
  join(featureDirectory, "..", "..", "index.css"),
  "utf-8",
);

/*
 * Tailwind palette utilities that only render correctly on the dark theme.
 * The TV details page must style itself exclusively through semantic theme
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
  "\\bfuchsia-",
  "\\bpink-",
  "#[0-9a-fA-F]{3,8}\\b",
] as const;

/*
 * Semantic utilities the TV details page is expected to consume after the
 * Stage 2B-3 conversion.
 */
const REQUIRED_SEMANTIC_UTILITIES = [
  "text-primary",
  "text-muted",
  "text-accent-text",
  "hover:text-accent-hover",
  "border-border",
  "bg-surface",
  "bg-app-bg",
  "bg-surface-elevated",
  "bg-accent/15",
  "border-accent-hover",
  "hover:border-muted",
  "border-danger/60",
  "bg-danger/10",
  "text-danger",
] as const;

/*
 * Tokens that both palettes declare explicitly. The dark @theme block is the
 * baseline and the html[data-theme="light"] block overrides each of these;
 * accent fills are re-declared with identical values on purpose so actions
 * stay consistent across themes.
 */
const THEME_VARIANT_TOKENS = [
  "--color-app-bg",
  "--color-surface",
  "--color-surface-elevated",
  "--color-border",
  "--color-primary",
  "--color-muted",
  "--color-accent-hover",
  "--color-accent-text",
  "--color-danger",
] as const;

describe("tv details theme conversion", () => {
  it("no longer hard-codes the dark palette or arbitrary colors", () => {
    for (const pattern of HARD_CODED_DARK_PATTERNS) {
      expect(tvDetailsSource, pattern).not.toMatch(new RegExp(pattern));
    }
  });

  it("styles the tv details page through semantic theme utilities", () => {
    for (const utility of REQUIRED_SEMANTIC_UTILITIES) {
      expect(tvDetailsSource, utility).toContain(utility);
    }
  });

  it("only consumes tokens that are defined for both the dark and light themes", () => {
    for (const token of THEME_VARIANT_TOKENS) {
      expect(stylesheet.split(`${token}:`).length - 1, token).toBe(2);
    }
  });
});
