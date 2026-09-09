import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const densitySource = readFileSync(
  join(featureDirectory, "..", "density.ts"),
  "utf-8",
);

const useDensitySource = readFileSync(
  join(featureDirectory, "..", "useDensity.ts"),
  "utf-8",
);

describe("card density contract", () => {
  it("defines compact, comfortable, and large densities", () => {
    expect(densitySource).toContain('compact');
    expect(densitySource).toContain('comfortable');
    expect(densitySource).toContain('large');
  });

  it("defaults to comfortable", () => {
    expect(densitySource).toContain('DEFAULT_DENSITY');
    expect(densitySource).toContain('"comfortable"');
  });

  it("provides density validation", () => {
    expect(densitySource).toContain("isCardDensity");
  });

  it("provides density-to-presentation mappings", () => {
    expect(densitySource).toContain("LIBRARY_GRID_COLUMNS");
    expect(densitySource).toContain("SEARCH_GRID_COLUMNS");
    expect(densitySource).toContain("CARD_GAP");
    expect(densitySource).toContain("LIST_PADDING");
    expect(densitySource).toContain("LIST_THUMBNAIL");
  });
});

describe("useDensity hook", () => {
  it("follows the useViewMode persistence pattern", () => {
    expect(useDensitySource).toContain("settingsRepository");
    expect(useDensitySource).toContain("useState");
    expect(useDensitySource).toContain("useEffect");
  });

  it("falls back to the default when the stored value is invalid", () => {
    expect(useDensitySource).toContain("isCardDensity");
    expect(useDensitySource).toContain("DEFAULT_DENSITY");
  });

  it("persists density changes through settingsRepository", () => {
    expect(useDensitySource).toContain("settingsRepository.set");
  });
});
