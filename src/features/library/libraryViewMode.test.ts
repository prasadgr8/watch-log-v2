import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const libraryPageSource = readFileSync(
  join(featureDirectory, "LibraryPage.tsx"),
  "utf-8",
);

const mediaCardSource = readFileSync(
  join(featureDirectory, "components/MediaCard.tsx"),
  "utf-8",
);

const mediaListItemSource = readFileSync(
  join(featureDirectory, "components/MediaListItem.tsx"),
  "utf-8",
);

const toggleSource = readFileSync(
  join(featureDirectory, "..", "..", "components", "ui", "ViewModeToggle.tsx"),
  "utf-8",
);

/*
 * Source-level regression coverage for the library Grid/List presentation
 * toggle, matching the libraryTheme and settingsResponsive test conventions.
 */
describe("library grid/list view mode", () => {
  it("renders both grid and list presentations from the same visibleMedia array", () => {
    expect(libraryPageSource).toContain("viewMode === \"list\"");
    expect(libraryPageSource).toContain("visibleMedia.map");
    expect(libraryPageSource).toContain("<MediaCard");
    expect(libraryPageSource).toContain("<MediaListItem");
  });

  it("persists the library view mode through the settings preference hook", () => {
    expect(libraryPageSource).toContain("LIBRARY_VIEW_MODE_SETTING_KEY");
    expect(libraryPageSource).toContain("useViewMode");
  });

  it("preserves the TV details navigation target in both presentations", () => {
    expect(mediaCardSource).toContain("/library/tv/${media.id}");
    expect(mediaListItemSource).toContain("/library/tv/${media.id}");
  });

  it("keeps edit and delete actions available in both presentations", () => {
    expect(mediaCardSource).toContain("onEdit(media)");
    expect(mediaCardSource).toContain("onDelete(media.id)");
    expect(mediaListItemSource).toContain("onEdit(media)");
    expect(mediaListItemSource).toContain("onDelete(media.id)");
  });

  it("styles the view mode toggle with accessible state semantics", () => {
    expect(toggleSource).toContain('role="group"');
    expect(toggleSource).toContain("aria-pressed");
    expect(toggleSource).toContain("aria-label");
    expect(toggleSource).toContain("title");
    expect(toggleSource).toContain("focus-visible:ring");
  });
});
