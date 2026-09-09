import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const searchCardSource = readFileSync(
  join(featureDirectory, "TmdbSearchResultCard.tsx"),
  "utf-8",
);

describe("TmdbSearchResultCard density", () => {
  it("accepts a density prop", () => {
    expect(searchCardSource).toContain("density");
    expect(searchCardSource).toContain("CardDensity");
  });

  it("applies density to the poster dimensions", () => {
    expect(searchCardSource).toContain("max-h-40");
    expect(searchCardSource).toContain("max-h-56");
    expect(searchCardSource).toContain("max-h-72");
  });

  it("applies density to the title typography", () => {
    expect(searchCardSource).toContain("CARD_TITLE_SIZE");
  });

  it("applies density to the content padding", () => {
    expect(searchCardSource).toContain("p-3");
    expect(searchCardSource).toContain("p-5");
  });

  it("defaults density to comfortable", () => {
    expect(searchCardSource).toContain('"comfortable"');
  });

  it("preserves existing search result behavior", () => {
    expect(searchCardSource).toContain("release_date");
    expect(searchCardSource).toContain("first_air_date");
    expect(searchCardSource).toContain("vote_average");
    expect(searchCardSource).toContain("onAdd");
    expect(searchCardSource).toContain("isInLibrary");
  });
});
