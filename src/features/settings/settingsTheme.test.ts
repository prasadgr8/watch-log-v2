import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const settingsSource = readFileSync(
  join(featureDirectory, "SettingsPage.tsx"),
  "utf-8",
);

const stylesheet = readFileSync(
  join(featureDirectory, "..", "..", "index.css"),
  "utf-8",
);

/*
 * Tailwind palette utilities that only render correctly on the dark theme.
 * The settings page must style itself exclusively through semantic theme
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
 * Semantic utilities the settings page is expected to consume after the
 * Stage 2B-6 conversion.
 */
const REQUIRED_SEMANTIC_UTILITIES = [
  "text-primary",
  "text-muted",
  "text-inverted",
  "border-border",
  "bg-surface",
  "bg-surface/60",
  "hover:bg-surface-elevated",
  "hover:bg-surface-hover",
  "bg-input-bg",
  "bg-app-bg/60",
  "bg-accent",
  "bg-accent/15",
  "hover:bg-accent-hover",
  "text-accent-text",
  "border-warning/40",
  "bg-warning/10",
  "text-warning",
  "border-danger/60",
  "bg-danger/10",
  "text-danger",
  "bg-danger",
  "hover:bg-danger/80",
  "bg-success",
  "hover:bg-success/80",
  "text-success",
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
  "--color-surface-hover",
  "--color-input-bg",
  "--color-border",
  "--color-primary",
  "--color-muted",
  "--color-accent",
  "--color-accent-hover",
  "--color-accent-text",
  "--color-danger",
  "--color-success",
  "--color-warning",
] as const;

/*
 * Tokens with a single shared definition because their value works on both
 * themes without an override.
 */
const THEME_INVARIANT_TOKENS = ["--color-inverted"] as const;

describe("settings theme conversion", () => {
  it("no longer hard-codes the dark palette or arbitrary colors", () => {
    for (const pattern of HARD_CODED_DARK_PATTERNS) {
      expect(settingsSource, pattern).not.toMatch(new RegExp(pattern));
    }
  });

  it("styles the settings page through semantic theme utilities", () => {
    for (const utility of REQUIRED_SEMANTIC_UTILITIES) {
      expect(settingsSource, utility).toContain(utility);
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
