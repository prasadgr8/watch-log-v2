import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const SEARCH_SOURCES = [
  "SearchPage.tsx",
  "components/TmdbSearchResultCard.tsx",
] as const;

const sources = SEARCH_SOURCES.map((fileName) => ({
  fileName,
  source: readFileSync(join(featureDirectory, fileName), "utf-8"),
}));

const stylesheet = readFileSync(
  join(featureDirectory, "..", "..", "index.css"),
  "utf-8",
);

/*
 * Tailwind palette utilities that only render correctly on the dark theme.
 * The search feature must style itself exclusively through semantic theme
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
 * Semantic utilities the search feature is expected to consume after the
 * Stage 2B-4 conversion.
 */
const REQUIRED_SEMANTIC_UTILITIES = [
  "text-primary",
  "text-muted",
  "text-inverted",
  "border-border",
  "bg-surface",
  "bg-surface/50",
  "bg-surface-elevated",
  "disabled:bg-surface-elevated",
  "disabled:text-muted",
  "bg-input-bg",
  "placeholder:text-muted",
  "focus:border-accent-hover",
  "focus:ring-accent-hover/20",
  "bg-app-bg",
  "bg-accent",
  "hover:bg-accent-hover",
  "border-danger/60",
  "bg-danger/10",
  "text-danger",
  "text-warning",
] as const;

/*
 * Tokens that both palettes declare explicitly. The dark @theme block is the
 * baseline and the html[data-theme="light"] block overrides each of these;
 * accent fills are re-declared with identical values on purpose so actions
 * stay consistent across themes. Warning darkens to amber-600 in light mode
 * so the TMDB rating star stays readable.
 */
const THEME_VARIANT_TOKENS = [
  "--color-app-bg",
  "--color-surface",
  "--color-surface-elevated",
  "--color-input-bg",
  "--color-border",
  "--color-primary",
  "--color-muted",
  "--color-accent",
  "--color-accent-hover",
  "--color-danger",
  "--color-warning",
] as const;

/*
 * Tokens with a single shared definition because their value works on both
 * themes without an override.
 */
const THEME_INVARIANT_TOKENS = ["--color-inverted"] as const;

describe("search theme conversion", () => {
  it("no longer hard-codes the dark palette or arbitrary colors", () => {
    for (const { fileName, source } of sources) {
      for (const pattern of HARD_CODED_DARK_PATTERNS) {
        expect(source, `${fileName}: ${pattern}`).not.toMatch(
          new RegExp(pattern),
        );
      }
    }
  });

  it("styles the search feature through semantic theme utilities", () => {
    const combined = sources.map((entry) => entry.source).join("\n");

    for (const utility of REQUIRED_SEMANTIC_UTILITIES) {
      expect(combined, utility).toContain(utility);
    }
  });

  it("only consumes tokens that exist in the theme stylesheet", () => {
    for (const token of THEME_VARIANT_TOKENS) {
      expect(stylesheet.split(`${token}:`).length - 1, token).toBe(2);
    }

    for (const token of THEME_INVARIANT_TOKENS) {
      expect(stylesheet.split(`${token}:`).length - 1, token).toBe(1);
    }
  });
});
