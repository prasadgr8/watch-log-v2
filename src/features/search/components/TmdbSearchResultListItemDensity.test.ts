import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const searchListItemSource = readFileSync(
  join(featureDirectory, "TmdbSearchResultListItem.tsx"),
  "utf-8",
);

describe("TmdbSearchResultListItem density", () => {
  it("accepts a density prop", () => {
    expect(searchListItemSource).toContain("density");
    expect(searchListItemSource).toContain("CardDensity");
  });

  it("applies density to the list padding", () => {
    expect(searchListItemSource).toContain("LIST_PADDING");
  });

  it("applies density to the thumbnail dimensions", () => {
    expect(searchListItemSource).toContain("LIST_THUMBNAIL");
  });

  it("applies density to the title typography", () => {
    expect(searchListItemSource).toContain("CARD_TITLE_SIZE");
  });

  it("defaults density to comfortable", () => {
    expect(searchListItemSource).toContain('"comfortable"');
  });

  it("preserves existing search result behavior", () => {
    expect(searchListItemSource).toContain("release_date");
    expect(searchListItemSource).toContain("first_air_date");
    expect(searchListItemSource).toContain("vote_average");
    expect(searchListItemSource).toContain("onAdd");
    expect(searchListItemSource).toContain("isInLibrary");
  });
});
