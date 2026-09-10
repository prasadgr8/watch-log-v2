import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { settingsRepository } from "../../../database/repositories";

import {
  DEFAULT_SIDEBAR_COLLAPSED,
  isSidebarCollapsed,
  loadSidebarCollapsed,
  SIDEBAR_COLLAPSE_SETTING_KEY,
  saveSidebarCollapsed,
} from "../sidebarCollapse";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const sidebarCollapseSource = readFileSync(
  join(featureDirectory, "..", "sidebarCollapse.ts"),
  "utf-8",
);

describe("sidebar collapse contract", () => {
  it("uses the dedicated settings key", () => {
    expect(SIDEBAR_COLLAPSE_SETTING_KEY).toBe("watchlog_ui_sidebar_collapsed");
  });

  it("defaults to expanded", () => {
    expect(DEFAULT_SIDEBAR_COLLAPSED).toBe(false);
  });

  it("accepts boolean stored values", () => {
    expect(isSidebarCollapsed(true)).toBe(true);
    expect(isSidebarCollapsed(false)).toBe(true);
  });

  it("rejects invalid stored values", () => {
    expect(isSidebarCollapsed("true")).toBe(false);
    expect(isSidebarCollapsed(1)).toBe(false);
    expect(isSidebarCollapsed(undefined)).toBe(false);
    expect(isSidebarCollapsed(null)).toBe(false);
  });
});

describe("sidebar collapse preference persistence", () => {
  it("defaults to expanded when nothing is stored", async () => {
    expect(await loadSidebarCollapsed()).toBe(DEFAULT_SIDEBAR_COLLAPSED);
  });

  it("falls back to expanded for an invalid stored value", async () => {
    await settingsRepository.set(SIDEBAR_COLLAPSE_SETTING_KEY, "collapsed");

    expect(await loadSidebarCollapsed()).toBe(DEFAULT_SIDEBAR_COLLAPSED);
  });

  it("loads a persisted collapsed state", async () => {
    await settingsRepository.set(SIDEBAR_COLLAPSE_SETTING_KEY, true);

    expect(await loadSidebarCollapsed()).toBe(true);
  });

  it("loads a persisted expanded state", async () => {
    await settingsRepository.set(SIDEBAR_COLLAPSE_SETTING_KEY, false);

    expect(await loadSidebarCollapsed()).toBe(false);
  });

  it("persists a collapsed state through settingsRepository", async () => {
    await saveSidebarCollapsed(true);

    expect(
      await settingsRepository.get<boolean>(SIDEBAR_COLLAPSE_SETTING_KEY),
    ).toBe(true);
    expect(await loadSidebarCollapsed()).toBe(true);
  });

  it("persists an expanded state through settingsRepository", async () => {
    await saveSidebarCollapsed(false);

    expect(
      await settingsRepository.get<boolean>(SIDEBAR_COLLAPSE_SETTING_KEY),
    ).toBe(false);
    expect(await loadSidebarCollapsed()).toBe(false);
  });

  it("overwrites an existing sidebar collapse preference", async () => {
    await saveSidebarCollapsed(true);
    await saveSidebarCollapsed(false);

    expect(await loadSidebarCollapsed()).toBe(false);
  });

  it("never writes the preference back while loading", async () => {
    await loadSidebarCollapsed();

    expect(
      await settingsRepository.get<boolean>(SIDEBAR_COLLAPSE_SETTING_KEY),
    ).toBeUndefined();
  });
});

describe("useSidebarCollapsed hook", () => {
  it("follows the established settingsRepository preference pattern", () => {
    expect(sidebarCollapseSource).toContain("settingsRepository");
    expect(sidebarCollapseSource).toContain("useState");
    expect(sidebarCollapseSource).toContain("useEffect");
  });

  it("falls back to the default when the stored value is invalid", () => {
    expect(sidebarCollapseSource).toContain("isSidebarCollapsed");
    expect(sidebarCollapseSource).toContain("DEFAULT_SIDEBAR_COLLAPSED");
  });

  it("persists only explicit toggle changes through settingsRepository", () => {
    expect(sidebarCollapseSource).toContain("saveSidebarCollapsed");
    expect(sidebarCollapseSource).toContain("settingsRepository.set");
  });
});
