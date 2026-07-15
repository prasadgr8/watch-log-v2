import { describe, expect, it } from "vitest";

import { settingsRepository } from "./settingsRepository";

describe("settingsRepository", () => {
  it("stores and retrieves a string setting", async () => {
    await settingsRepository.set("theme", "dark");

    const theme = await settingsRepository.get<string>("theme");

    expect(theme).toBe("dark");
  });

  it("stores and retrieves a structured setting", async () => {
    const preferences = {
      defaultMediaType: "tv",
      showCompletedMedia: true,
    };

    await settingsRepository.set("preferences", preferences);

    const storedPreferences =
      await settingsRepository.get<typeof preferences>("preferences");

    expect(storedPreferences).toEqual(preferences);
  });

  it("overwrites an existing setting value", async () => {
    await settingsRepository.set("theme", "dark");
    await settingsRepository.set("theme", "light");

    const theme = await settingsRepository.get<string>("theme");

    expect(theme).toBe("light");
  });

  it("returns undefined for a missing setting", async () => {
    const missingSetting =
      await settingsRepository.get<string>("missing-setting");

    expect(missingSetting).toBeUndefined();
  });

  it("removes a stored setting", async () => {
    await settingsRepository.set("tmdb-language", "en-US");

    await settingsRepository.remove("tmdb-language");

    const language = await settingsRepository.get<string>("tmdb-language");

    expect(language).toBeUndefined();
  });
});
