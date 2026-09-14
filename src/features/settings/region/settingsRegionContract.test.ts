import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const regionSources = ["availabilityRegion.ts", "RegionProvider.tsx"].map(
  (fileName) => ({
    fileName,
    source: readFileSync(join(featureDirectory, fileName), "utf-8"),
  }),
);

const moduleSource =
  regionSources.find((entry) => entry.fileName === "availabilityRegion.ts")
    ?.source ?? "";

const providerSource =
  regionSources.find((entry) => entry.fileName === "RegionProvider.tsx")
    ?.source ?? "";

const headerSource = readFileSync(
  join(
    featureDirectory,
    "..",
    "..",
    "..",
    "components",
    "layout",
    "Header.tsx",
  ),
  "utf-8",
);

const settingsSource = readFileSync(
  join(featureDirectory, "..", "SettingsPage.tsx"),
  "utf-8",
);

const combinedRegionSource = regionSources
  .map((entry) => entry.source)
  .join("\n");

/*
 * Source-contract coverage for Alpha 26.1, matching the layoutAccessibility /
 * settingsResponsive conventions. These assertions pin the shared
 * Header/Settings persistence contract, the browser-settings-only hint, the
 * first-run suggestion wording and actions, and the geolocation/timezone
 * boundary of the feature.
 */
describe("availability region persistence contract", () => {
  it("persists under the availability-region key through settingsRepository", () => {
    expect(moduleSource).toContain(
      'AVAILABILITY_REGION_SETTING_KEY = "availability-region"',
    );
    expect(moduleSource).toContain(
      "settingsRepository.get<string>(AVAILABILITY_REGION_SETTING_KEY)",
    );
    expect(moduleSource).toContain(
      "settingsRepository.set(AVAILABILITY_REGION_SETTING_KEY, code)",
    );
  });

  it("defaults the region to IN", () => {
    expect(moduleSource).toContain('DEFAULT_AVAILABILITY_REGION = "IN"');
  });

  it("Header and Settings consume the same useRegion context", () => {
    expect(headerSource).toContain(
      'from "../../features/settings/region/regionContext"',
    );
    expect(headerSource).toContain("useRegion()");

    expect(settingsSource).toContain('from "./region/regionContext"');
    expect(settingsSource).toContain("useRegion()");
  });

  it("Header and Settings render the same RegionSelect catalogue control", () => {
    expect(headerSource).toContain("<RegionSelect");
    expect(headerSource).toContain('variant="compact"');

    expect(settingsSource).toContain("<RegionSelect");
  });

  it("keeps the header interactive button count unchanged", () => {
    const buttons = headerSource.match(/<button[\s\S]*?<\/button>/g) ?? [];

    expect(buttons).toHaveLength(2);
  });
});

describe("browser-settings hint boundary", () => {
  it("uses the locale-derived hint function in the first-run flow", () => {
    expect(moduleSource).toContain("detectAvailabilityRegionFromLocale(");
    expect(providerSource).toContain("detectAvailabilityRegionFromLocale()");
    expect(providerSource).toContain("resolveAvailabilityRegionState(");
  });

  it("suggests instead of claiming physical detection", () => {
    expect(providerSource).toContain("We suggest");
    expect(providerSource).toContain("based on your browser settings.");
    expect(providerSource).not.toContain("We detected");
    expect(providerSource).not.toContain("detected your region");
  });

  it("never uses geolocation, coordinates, IP, or timezone signals", () => {
    const forbiddenLookups = [
      "navigator.geolocation",
      "getCurrentPosition",
      "coords",
      "timeZone",
      "getTimezoneOffset",
      "Intl.DateTimeFormat",
      "localStorage",
      "sessionStorage",
      "fetch(",
      "api.themoviedb",
    ];

    for (const pattern of forbiddenLookups) {
      expect(combinedRegionSource, pattern).not.toContain(pattern);
    }
  });

  it("keeps Header and Settings free of geolocation references", () => {
    for (const source of [headerSource, settingsSource]) {
      expect(source).not.toContain("navigator.geolocation");
      expect(source).not.toContain("getCurrentPosition");
      expect(source).not.toContain("coords");
    }
  });
});

describe("first-run flow", () => {
  it("offers exactly Use <country> and Choose another on suggestion", () => {
    expect(providerSource).toContain("Use {getRegionLabel(");
    expect(providerSource).toContain("Choose another…");
    expect(providerSource).not.toContain("Not now");
    expect(providerSource).not.toContain("Not later");
  });

  it("opens the region selector from Choose another", () => {
    expect(providerSource).toContain("openRegionSelection");
    expect(providerSource).toContain('status: "choose"');
    expect(providerSource).toContain("<RegionSelect");
  });

  it("presents a manual selector with India as an explicit default", () => {
    expect(providerSource).toContain(
      "Choose the country used for streaming availability.",
    );
  });

  it("keeps a previously saved region authoritative", () => {
    // The provider resolves from the stored value first and never calls the
    // locale hint when a stored region exists.
    expect(providerSource.indexOf("loadAvailabilityRegion()")).toBeLessThan(
      providerSource.indexOf("detectAvailabilityRegionFromLocale()"),
    );
    expect(moduleSource).toContain(
      "A previously saved valid region always wins",
    );
  });
});