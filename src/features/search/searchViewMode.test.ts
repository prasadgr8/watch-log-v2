import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const searchPageSource = readFileSync(
  join(featureDirectory, "SearchPage.tsx"),
  "utf-8",
);

const resultCardSource = readFileSync(
  join(featureDirectory, "components/TmdbSearchResultCard.tsx"),
  "utf-8",
);

const resultListItemSource = readFileSync(
  join(featureDirectory, "components/TmdbSearchResultListItem.tsx"),
  "utf-8",
);

const toggleSource = readFileSync(
  join(featureDirectory, "..", "..", "components", "ui", "ViewModeToggle.tsx"),
  "utf-8",
);

/*
 * Source-level regression coverage for the search Grid/List presentation
 * toggle, matching the searchTheme and settingsResponsive test conventions.
 */
describe("search grid/list view mode", () => {
  it("renders both grid and list presentations from the same results array", () => {
    expect(searchPageSource).toContain("viewMode === \"list\"");
    expect(searchPageSource).toContain("results.map");
    expect(searchPageSource).toContain("<TmdbSearchResultCard");
    expect(searchPageSource).toContain("<TmdbSearchResultListItem");
  });

  it("persists the search view mode through the settings preference hook", () => {
    expect(searchPageSource).toContain("SEARCH_VIEW_MODE_SETTING_KEY");
    expect(searchPageSource).toContain("useViewMode");
  });

  it("preserves the add-to-library behavior in both presentations", () => {
    expect(resultCardSource).toContain("onAdd(result)");
    expect(resultListItemSource).toContain("onAdd(result)");
    expect(resultListItemSource).toContain("isInLibrary");
    expect(resultListItemSource).toContain("isAdding");
    expect(searchPageSource).toContain("handleAddToLibrary");
  });

  it("keeps the media type behavior in the list presentation", () => {
    expect(resultListItemSource).toContain("result.media_type");
    expect(resultListItemSource).toContain("Movie");
    expect(resultListItemSource).toContain("TV Show");
  });

  it("styles the view mode toggle with accessible state semantics", () => {
    expect(toggleSource).toContain('role="group"');
    expect(toggleSource).toContain("aria-pressed");
    expect(toggleSource).toContain("aria-label");
    expect(toggleSource).toContain("title");
    expect(toggleSource).toContain("focus-visible:ring");
  });
});
