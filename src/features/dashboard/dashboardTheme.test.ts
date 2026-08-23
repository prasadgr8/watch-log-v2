import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const dashboardSource = readFileSync(
  join(featureDirectory, "DashboardPage.tsx"),
  "utf-8",
);

const stylesheet = readFileSync(
  join(featureDirectory, "..", "..", "index.css"),
  "utf-8",
);

/*
 * Tailwind palette utilities that only render correctly on the dark theme.
 * The dashboard must style itself exclusively through semantic theme
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
  "#[0-9a-fA-F]{3,8}\\b",
] as const;

/*
 * Semantic utilities the dashboard is expected to consume after the Stage
 * 2B-1 conversion.
 */
const REQUIRED_SEMANTIC_UTILITIES = [
  "text-primary",
  "text-muted",
  "text-inverted",
  "border-border",
  "bg-surface",
  "bg-surface-elevated",
  "bg-app-bg/60",
  "bg-accent",
  "bg-accent/15",
  "hover:bg-accent-hover",
  "text-accent-text",
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
  "--color-accent",
  "--color-accent-hover",
  "--color-accent-text",
  "--color-danger",
] as const;

/*
 * Tokens with a single shared definition because their value works on both
 * themes without an override.
 */
const THEME_INVARIANT_TOKENS = ["--color-inverted"] as const;

describe("dashboard theme conversion", () => {
  it("no longer hard-codes the dark palette or arbitrary colors", () => {
    for (const pattern of HARD_CODED_DARK_PATTERNS) {
      expect(dashboardSource, pattern).not.toMatch(new RegExp(pattern));
    }
  });

  it("styles the dashboard through semantic theme utilities", () => {
    for (const utility of REQUIRED_SEMANTIC_UTILITIES) {
      expect(dashboardSource, utility).toContain(utility);
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
