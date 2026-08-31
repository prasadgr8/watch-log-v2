import { describe, expect, it } from "vitest";

import { settingsRepository } from "../database/repositories";

import {
  DEFAULT_VIEW_MODE,
  EPISODES_VIEW_MODE_SETTING_KEY,
  isViewMode,
  LIBRARY_VIEW_MODE_SETTING_KEY,
  loadViewMode,
  saveViewMode,
  SEARCH_VIEW_MODE_SETTING_KEY,
  VIEW_MODES,
} from "./viewMode";

describe("isViewMode", () => {
  it("accepts every supported view mode", () => {
    for (const viewMode of VIEW_MODES) {
      expect(isViewMode(viewMode)).toBe(true);
    }
  });

  it("rejects invalid view modes", () => {
    expect(isViewMode("cards")).toBe(false);

    expect(isViewMode(42)).toBe(false);

    expect(isViewMode(undefined)).toBe(false);
  });
});

describe("view mode preference persistence", () => {
  it("falls back to the default view mode when nothing is stored", async () => {
    expect(await loadViewMode(LIBRARY_VIEW_MODE_SETTING_KEY)).toBe(
      DEFAULT_VIEW_MODE,
    );
  });

  it("falls back to the default view mode for an invalid stored value", async () => {
    await settingsRepository.set(SEARCH_VIEW_MODE_SETTING_KEY, "cards");

    expect(await loadViewMode(SEARCH_VIEW_MODE_SETTING_KEY)).toBe(
      DEFAULT_VIEW_MODE,
    );
  });

  it("persists and loads the grid view mode through settingsRepository", async () => {
    await saveViewMode(LIBRARY_VIEW_MODE_SETTING_KEY, "grid");

    expect(
      await settingsRepository.get<string>(LIBRARY_VIEW_MODE_SETTING_KEY),
    ).toBe("grid");
    expect(await loadViewMode(LIBRARY_VIEW_MODE_SETTING_KEY)).toBe("grid");
  });

  it("persists and loads the list view mode through settingsRepository", async () => {
    await saveViewMode(LIBRARY_VIEW_MODE_SETTING_KEY, "list");

    expect(
      await settingsRepository.get<string>(LIBRARY_VIEW_MODE_SETTING_KEY),
    ).toBe("list");
    expect(await loadViewMode(LIBRARY_VIEW_MODE_SETTING_KEY)).toBe("list");
  });

  it("persists and loads the grid view mode for episodes through settingsRepository", async () => {
    await saveViewMode(EPISODES_VIEW_MODE_SETTING_KEY, "grid");

    expect(
      await settingsRepository.get<string>(EPISODES_VIEW_MODE_SETTING_KEY),
    ).toBe("grid");
    expect(await loadViewMode(EPISODES_VIEW_MODE_SETTING_KEY)).toBe("grid");
  });

  it("persists and loads the list view mode for episodes through settingsRepository", async () => {
    await saveViewMode(EPISODES_VIEW_MODE_SETTING_KEY, "list");

    expect(
      await settingsRepository.get<string>(EPISODES_VIEW_MODE_SETTING_KEY),
    ).toBe("list");
    expect(await loadViewMode(EPISODES_VIEW_MODE_SETTING_KEY)).toBe("list");
  });

  it("keeps the episodes, library, and search view mode preferences independent", async () => {
    await saveViewMode(LIBRARY_VIEW_MODE_SETTING_KEY, "list");
    await saveViewMode(SEARCH_VIEW_MODE_SETTING_KEY, "grid");
    await saveViewMode(EPISODES_VIEW_MODE_SETTING_KEY, "list");

    expect(await loadViewMode(LIBRARY_VIEW_MODE_SETTING_KEY)).toBe("list");
    expect(await loadViewMode(SEARCH_VIEW_MODE_SETTING_KEY)).toBe("grid");
    expect(await loadViewMode(EPISODES_VIEW_MODE_SETTING_KEY)).toBe("list");
  });

  it("keeps the library and search view mode preferences independent", async () => {
    await saveViewMode(LIBRARY_VIEW_MODE_SETTING_KEY, "list");
    await saveViewMode(SEARCH_VIEW_MODE_SETTING_KEY, "grid");

    expect(await loadViewMode(LIBRARY_VIEW_MODE_SETTING_KEY)).toBe("list");
    expect(await loadViewMode(SEARCH_VIEW_MODE_SETTING_KEY)).toBe("grid");
  });

  it("overwrites an existing view mode preference", async () => {
    await saveViewMode(LIBRARY_VIEW_MODE_SETTING_KEY, "list");
    await saveViewMode(LIBRARY_VIEW_MODE_SETTING_KEY, "grid");

    expect(await loadViewMode(LIBRARY_VIEW_MODE_SETTING_KEY)).toBe("grid");
  });
});
