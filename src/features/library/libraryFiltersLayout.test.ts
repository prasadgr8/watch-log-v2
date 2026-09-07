import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const libraryPageSource = readFileSync(
  join(featureDirectory, "LibraryPage.tsx"),
  "utf-8",
);

/*
 * Source-level regression coverage for the Library filter bar layout,
 * matching the libraryTheme and libraryViewMode source-assertion
 * conventions. The filter controls previously rendered inside an unstyled
 * block container, so controls visually touched at most widths; these
 * assertions pin the wrapping flex layout and the accessible genre
 * multi-select dropdown contract documented in docs/UI_GUIDELINES.md.
 */
describe("library filter bar layout", () => {
  it("lays the filter controls out with a wrapping flex container", () => {
    expect(libraryPageSource).toContain(
      'className="flex flex-wrap items-center gap-3"',
    );

    expect(libraryPageSource).not.toContain("library-filters");
  });

  it("renders the genre filter through the dropdown component", () => {
    expect(libraryPageSource).toContain("<GenreMultiSelect");
    expect(libraryPageSource).toContain("genres={TMDB_GENRES_LIST}");
    expect(libraryPageSource).toContain("selectedGenres={selectedGenres}");
    expect(libraryPageSource).toContain("onChange={setSelectedGenres}");

    expect(libraryPageSource).not.toContain("multiple");
    expect(libraryPageSource).not.toContain("size={5}");
  });
});