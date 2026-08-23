import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

import { settingsRepository } from "../database/repositories";

import {
  applyThemeAttribute,
  DEFAULT_THEME_PREFERENCE,
  getSystemPrefersLight,
  isThemePreference,
  loadThemePreference,
  resolveTheme,
  saveThemePreference,
  THEME_PREFERENCES,
  THEME_SETTING_KEY,
} from "./theme";

const stylesheetPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "index.css",
);

const stylesheet = readFileSync(stylesheetPath, "utf-8");

describe("resolveTheme", () => {
  it("resolves the dark preference to the dark theme regardless of the system preference", () => {
    expect(resolveTheme("dark", false)).toBe("dark");

    expect(resolveTheme("dark", true)).toBe("dark");
  });

  it("resolves the light preference to the light theme regardless of the system preference", () => {
    expect(resolveTheme("light", false)).toBe("light");

    expect(resolveTheme("light", true)).toBe("light");
  });

  it("resolves the system preference using the system color scheme", () => {
    expect(resolveTheme("system", false)).toBe("dark");

    expect(resolveTheme("system", true)).toBe("light");
  });
});

describe("isThemePreference", () => {
  it("accepts every supported theme preference", () => {
    for (const preference of THEME_PREFERENCES) {
      expect(isThemePreference(preference)).toBe(true);
    }
  });

  it("rejects invalid theme preferences", () => {
    expect(isThemePreference("neon")).toBe(false);

    expect(isThemePreference(42)).toBe(false);

    expect(isThemePreference(undefined)).toBe(false);
  });
});

describe("getSystemPrefersLight", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns true when the system prefers a light color scheme", () => {
    vi.stubGlobal("window", {
      matchMedia: vi.fn().mockReturnValue({ matches: true }),
    });

    expect(getSystemPrefersLight()).toBe(true);
  });

  it("returns false when the system prefers a dark color scheme", () => {
    vi.stubGlobal("window", {
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
    });

    expect(getSystemPrefersLight()).toBe(false);
  });

  it("returns false when matchMedia is unavailable", () => {
    vi.stubGlobal("window", {});

    expect(getSystemPrefersLight()).toBe(false);
  });
});

describe("applyThemeAttribute", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("applies the dark theme attribute to the document element", () => {
    const setAttribute = vi.fn();

    vi.stubGlobal("document", {
      documentElement: { setAttribute },
    });

    applyThemeAttribute("dark");

    expect(setAttribute).toHaveBeenCalledWith("data-theme", "dark");
  });

  it("applies the light theme attribute to the document element", () => {
    const setAttribute = vi.fn();

    vi.stubGlobal("document", {
      documentElement: { setAttribute },
    });

    applyThemeAttribute("light");

    expect(setAttribute).toHaveBeenCalledWith("data-theme", "light");
  });
});

describe("theme preference persistence", () => {
  it("persists and loads the dark preference through settingsRepository", async () => {
    await saveThemePreference("dark");

    expect(await settingsRepository.get<string>(THEME_SETTING_KEY)).toBe(
      "dark",
    );

    expect(await loadThemePreference()).toBe("dark");
  });

  it("persists and loads the light preference through settingsRepository", async () => {
    await saveThemePreference("light");

    expect(await settingsRepository.get<string>(THEME_SETTING_KEY)).toBe(
      "light",
    );

    expect(await loadThemePreference()).toBe("light");
  });

  it("persists and loads the system preference through settingsRepository", async () => {
    await saveThemePreference("system");

    expect(await loadThemePreference()).toBe("system");
  });

  it("overwrites an existing theme preference", async () => {
    await saveThemePreference("dark");

    await saveThemePreference("light");

    expect(await loadThemePreference()).toBe("light");
  });

  it("falls back to the default preference when nothing is stored", async () => {
    expect(await loadThemePreference()).toBe(DEFAULT_THEME_PREFERENCE);
  });

  it("falls back to the default preference for an invalid stored value", async () => {
    await settingsRepository.set(THEME_SETTING_KEY, "neon");

    expect(await loadThemePreference()).toBe(DEFAULT_THEME_PREFERENCE);
  });
});

describe("theme stylesheet foundation", () => {
  it("defines both the dark and light palettes", () => {
    expect(stylesheet).toContain('html[data-theme="dark"]');

    expect(stylesheet).toContain('html[data-theme="light"]');

    expect(stylesheet.match(/--app-background:/g)).toHaveLength(2);

    expect(stylesheet.match(/--app-text:/g)).toHaveLength(2);
  });

  it("consumes the theme variables in the body rule instead of hard-coded colors", () => {
    const bodyRule = stylesheet.match(/body\s*\{[^}]*\}/)?.[0] ?? "";

    expect(bodyRule).not.toBe("");

    expect(bodyRule).toContain("var(--app-background)");

    expect(bodyRule).toContain("var(--app-text)");

    expect(bodyRule).not.toContain("#");
  });
});

const REQUIRED_SHELL_TOKENS = [
  "--color-app-bg",
  "--color-surface",
  "--color-surface-elevated",
  "--color-surface-hover",
  "--color-input-bg",
  "--color-border",
  "--color-primary",
  "--color-muted",
  "--color-accent",
  "--color-accent-hover",
  "--color-danger",
  "--color-success",
  "--color-warning",
] as const;

function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

describe("semantic shell tokens", () => {
  it("defines every required token for both the dark and light themes", () => {
    for (const token of REQUIRED_SHELL_TOKENS) {
      expect(countOccurrences(stylesheet, `${token}:`)).toBe(2);
    }
  });
});

describe("application shell conversion", () => {
  const layoutDirectory = join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "components",
    "layout",
  );

  const shellSources = ["AppLayout.tsx", "Sidebar.tsx", "Header.tsx"].map(
    (fileName) => ({
      fileName,
      source: readFileSync(join(layoutDirectory, fileName), "utf-8"),
    }),
  );

  it("no longer hard-codes the dark palette in shell components", () => {
    for (const { fileName, source } of shellSources) {
      expect(source, fileName).not.toContain("slate-");

      expect(source, fileName).not.toContain("text-white");

      expect(source, fileName).not.toContain("text-blue-");
      expect(source, fileName).not.toContain("bg-blue-");
    }
  });

  it("styles the shell through semantic theme utilities", () => {
    const [appLayout, sidebar, header] = shellSources.map(
      (entry) => entry.source,
    );

    expect(appLayout).toContain("bg-app-bg");

    expect(appLayout).toContain("text-primary");

    expect(sidebar).toContain("bg-surface");

    expect(sidebar).toContain("border-border");

    expect(sidebar).toContain("bg-accent");

    expect(sidebar).toContain("text-inverted");

    expect(sidebar).toContain("hover:bg-surface-hover");

    expect(header).toContain("bg-surface");

    expect(header).toContain("border-border");

    expect(header).toContain("hover:text-accent");
  });
});
