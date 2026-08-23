import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const LIBRARY_SOURCES = [
  "LibraryPage.tsx",
  "components/MediaCard.tsx",
  "components/AddMediaForm.tsx",
  "components/EditMediaModal.tsx",
  "components/EpisodeList.tsx",
] as const;

const sources = LIBRARY_SOURCES.map((fileName) => ({
  fileName,
  source: readFileSync(join(featureDirectory, fileName), "utf-8"),
}));

const stylesheet = readFileSync(
  join(featureDirectory, "..", "..", "index.css"),
  "utf-8",
);

/*
 * Tailwind palette utilities that only render correctly on the dark theme.
 * The library must style itself exclusively through semantic theme utilities
 * so light mode stays readable. The modal scrim (bg-black/60) is excluded on
 * purpose: a black overlay is theme-invariant and dims content in both modes.
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
 * Semantic utilities the library is expected to consume after the Stage 2B-2
 * conversion.
 */
const REQUIRED_SEMANTIC_UTILITIES = [
  "text-primary",
  "text-muted",
  "text-inverted",
  "border-border",
  "bg-surface",
  "bg-surface/50",
  "bg-surface-elevated",
  "hover:bg-surface-elevated",
  "hover:bg-surface-hover",
  "bg-input-bg",
  "bg-accent",
  "bg-danger/10",
  "border-danger/60",
  "text-danger",
  "bg-success/10",
  "text-success",
  "hover:bg-accent/15",
  "hover:text-accent-text",
  "hover:bg-danger/10",
  "hover:text-danger",
  "hover:bg-accent-hover",
  "text-accent-text",
  "focus:border-accent-hover",
  "focus:ring-accent-hover/20",
  "focus:ring-accent-hover/40",
  "placeholder:text-muted",
] as const;

/*
 * Tokens that both palettes declare explicitly. The dark @theme block is the
 * baseline and the html[data-theme="light"] block overrides each of these;
 * accent fills are re-declared with identical values on purpose so actions
 * stay consistent across themes.
 */
const THEME_VARIANT_TOKENS = [
  "--color-surface",
  "--color-surface-elevated",
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
] as const;

/*
 * Tokens with a single shared definition because their value works on both
 * themes without an override.
 */
const THEME_INVARIANT_TOKENS = ["--color-inverted"] as const;

describe("library theme conversion", () => {
  it("no longer hard-codes the dark palette or arbitrary colors", () => {
    for (const { fileName, source } of sources) {
      for (const pattern of HARD_CODED_DARK_PATTERNS) {
        expect(source, `${fileName}: ${pattern}`).not.toMatch(
          new RegExp(pattern),
        );
      }
    }
  });

  it("keeps the modal scrim theme-invariant instead of palette-based", () => {
    const modal = sources.find(
      (entry) => entry.fileName === "components/EditMediaModal.tsx",
    );

    expect(modal?.source).toContain("bg-black/60");
  });

  it("styles the library through semantic theme utilities", () => {
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
