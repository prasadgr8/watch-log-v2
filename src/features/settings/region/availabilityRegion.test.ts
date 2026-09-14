import { describe, expect, it } from "vitest";

import { db } from "../../../database/db";
import { settingsRepository } from "../../../database/repositories";

import {
  AVAILABILITY_REGIONS,
  AVAILABILITY_REGION_SETTING_KEY,
  DEFAULT_AVAILABILITY_REGION,
  detectAvailabilityRegionFromLocale,
  getBrowserLocale,
  getRegionFlag,
  getRegionLabel,
  getRegionName,
  isAvailabilityRegion,
  loadAvailabilityRegion,
  parseRegionFromLocale,
  resolveAvailabilityRegionState,
  saveAvailabilityRegion,
} from "./availabilityRegion";

describe("availability region setting contract", () => {
  it("uses the availability-region setting key", () => {
    expect(AVAILABILITY_REGION_SETTING_KEY).toBe("availability-region");
  });

  it("defaults to India", () => {
    expect(DEFAULT_AVAILABILITY_REGION).toBe("IN");
  });

  it("supports the required initial catalogue", () => {
    const codes = AVAILABILITY_REGIONS.map((region) => region.code);

    for (const code of ["IN", "US", "GB", "CA", "AU"]) {
      expect(codes).toContain(code);
    }
  });

  it("keeps the catalogue to the initial supported set", () => {
    expect(AVAILABILITY_REGIONS).toHaveLength(5);
  });

  it("defines unique ISO alpha-2 codes", () => {
    const codes = AVAILABILITY_REGIONS.map((region) => region.code);

    expect(new Set(codes).size).toBe(codes.length);

    for (const code of codes) {
      expect(code).toMatch(/^[A-Z]{2}$/);
    }
  });
});

describe("isAvailabilityRegion", () => {
  it("accepts every supported region code", () => {
    for (const region of AVAILABILITY_REGIONS) {
      expect(isAvailabilityRegion(region.code)).toBe(true);
    }
  });

  it("rejects unsupported or malformed values", () => {
    expect(isAvailabilityRegion("XX")).toBe(false);
    expect(isAvailabilityRegion("DE")).toBe(false);
    expect(isAvailabilityRegion("in")).toBe(false);
    expect(isAvailabilityRegion("india")).toBe(false);
    expect(isAvailabilityRegion("")).toBe(false);
    expect(isAvailabilityRegion(42)).toBe(false);
    expect(isAvailabilityRegion(undefined)).toBe(false);
    expect(isAvailabilityRegion(null)).toBe(false);
  });
});

describe("region display helpers", () => {
  it("maps catalogue codes to country names", () => {
    expect(getRegionName("IN")).toBe("India");
    expect(getRegionName("US")).toBe("United States");
    expect(getRegionName("GB")).toBe("United Kingdom");
    expect(getRegionName("CA")).toBe("Canada");
    expect(getRegionName("AU")).toBe("Australia");
  });

  it("maps catalogue codes to flag emoji and labels", () => {
    expect(getRegionFlag("IN")).toBe("🇮🇳");
    expect(getRegionLabel("US")).toBe("🇺🇸 United States");
  });
});

describe("availability region persistence", () => {
  it("loads an existing saved setting", async () => {
    await settingsRepository.set(AVAILABILITY_REGION_SETTING_KEY, "GB");

    expect(await loadAvailabilityRegion()).toBe("GB");
  });

  it("returns undefined when the setting is missing", async () => {
    expect(await loadAvailabilityRegion()).toBeUndefined();
  });

  it("never writes on load", async () => {
    await loadAvailabilityRegion();

    expect(await db.settings.count()).toBe(0);
  });

  it("returns undefined for an invalid stored value without removing it", async () => {
    await settingsRepository.set(AVAILABILITY_REGION_SETTING_KEY, "india");

    expect(await loadAvailabilityRegion()).toBeUndefined();

    const stored = await settingsRepository.get<string>(
      AVAILABILITY_REGION_SETTING_KEY,
    );

    expect(stored).toBe("india");
  });

  it("persists a saved setting through the generic settings repository", async () => {
    await saveAvailabilityRegion("CA");

    expect(await loadAvailabilityRegion()).toBe("CA");

    const stored = await settingsRepository.get<string>(
      AVAILABILITY_REGION_SETTING_KEY,
    );

    expect(stored).toBe("CA");
  });
});
describe("parseRegionFromLocale", () => {
  it("extracts the region from BCP-47 and Posix locale tags", () => {
    expect(parseRegionFromLocale("en-US")).toBe("US");
    expect(parseRegionFromLocale("hi-IN")).toBe("IN");
    expect(parseRegionFromLocale("en_US")).toBe("US");
    expect(parseRegionFromLocale("zh-Hans-CN")).toBe("CN");
    expect(parseRegionFromLocale("fil-PH")).toBe("PH");
  });

  it("returns undefined for language-only, numeric, or empty locales", () => {
    expect(parseRegionFromLocale("en")).toBeUndefined();
    expect(parseRegionFromLocale("es-419")).toBeUndefined();
    expect(parseRegionFromLocale("")).toBeUndefined();
    expect(parseRegionFromLocale(undefined)).toBeUndefined();
  });
});

describe("detectAvailabilityRegionFromLocale", () => {
  it("suggests a supported country from the browser locale", () => {
    expect(detectAvailabilityRegionFromLocale("en-US")).toBe("US");
    expect(detectAvailabilityRegionFromLocale("en-GB")).toBe("GB");
    expect(detectAvailabilityRegionFromLocale("en-CA")).toBe("CA");
    expect(detectAvailabilityRegionFromLocale("en-AU")).toBe("AU");
    expect(detectAvailabilityRegionFromLocale("en-IN")).toBe("IN");
    expect(detectAvailabilityRegionFromLocale("hi-IN")).toBe("IN");
  });

  it("returns undefined for unsupported or unreadable locales", () => {
    // language-only, numeric UN M49, and unsupported region subtags
    expect(detectAvailabilityRegionFromLocale("de-DE")).toBeUndefined();
    expect(detectAvailabilityRegionFromLocale("fr-FR")).toBeUndefined();
    expect(detectAvailabilityRegionFromLocale("pt-BR")).toBeUndefined();
    expect(detectAvailabilityRegionFromLocale("en")).toBeUndefined();
    expect(detectAvailabilityRegionFromLocale("es-419")).toBeUndefined();

    // When neither navigator.languages nor navigator.language is available
    // (e.g. a non-browser build), the default locale fallback is undefined, so
    // an explicit undefined argument must also resolve to undefined.
    const originalLanguages = navigator.languages;
    const originalLanguage = navigator.language;
    Object.defineProperties(navigator, {
      languages: { value: undefined, configurable: true },
      language: { value: undefined, configurable: true },
    });
    try {
      expect(detectAvailabilityRegionFromLocale(undefined)).toBeUndefined();
    } finally {
      Object.defineProperties(navigator, {
        languages: { value: originalLanguages, configurable: true },
        language: { value: originalLanguage, configurable: true },
      });
    }
  });

  it("never persists anything itself", async () => {
    detectAvailabilityRegionFromLocale("en-US");

    expect(await loadAvailabilityRegion()).toBeUndefined();

    expect(await db.settings.toArray()).toHaveLength(0);
  });
});

describe("getBrowserLocale", () => {
  it("returns a browser locale string without requesting permission", () => {
    expect(typeof getBrowserLocale()).toBe("string");
  });
});

describe("resolveAvailabilityRegionState", () => {
  it("keeps a saved region and never consults the locale hint", () => {
    expect(resolveAvailabilityRegionState("US", "GB")).toEqual({
      region: "US",
      status: "ready",
      suggestedRegion: null,
    });

    expect(resolveAvailabilityRegionState("US", undefined)).toEqual({
      region: "US",
      status: "ready",
      suggestedRegion: null,
    });
  });

  it("offers a suggestion when nothing is saved and a supported hint exists", () => {
    expect(resolveAvailabilityRegionState(undefined, "GB")).toEqual({
      region: "GB",
      status: "suggest",
      suggestedRegion: "GB",
    });
  });

  it("opens manual selection with the default preset when the hint is missing", () => {
    expect(resolveAvailabilityRegionState(undefined, undefined)).toEqual({
      region: "IN",
      status: "choose",
      suggestedRegion: null,
    });
  });
});