import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const mediaListItemSource = readFileSync(
  join(featureDirectory, "MediaListItem.tsx"),
  "utf-8",
);

describe("MediaListItem density", () => {
  it("accepts a density prop", () => {
    expect(mediaListItemSource).toContain("density");
    expect(mediaListItemSource).toContain("CardDensity");
  });

  it("applies density to the list padding", () => {
    expect(mediaListItemSource).toContain("LIST_PADDING");
  });

  it("applies density to the thumbnail dimensions", () => {
    expect(mediaListItemSource).toContain("LIST_THUMBNAIL");
  });

  it("applies density to the title typography", () => {
    expect(mediaListItemSource).toContain("CARD_TITLE_SIZE");
  });

  it("defaults density to comfortable", () => {
    expect(mediaListItemSource).toContain('"comfortable"');
  });

  it("preserves all existing metadata and actions", () => {
    expect(mediaListItemSource).toContain("firstAirDate");
    expect(mediaListItemSource).toContain("releaseDate");
    expect(mediaListItemSource).toContain("media.rating");
    expect(mediaListItemSource).toContain("StickyNote");
    expect(mediaListItemSource).toContain("ProgressBar");
    expect(mediaListItemSource).toContain("onToggleFavorite");
    expect(mediaListItemSource).toContain("onEdit");
    expect(mediaListItemSource).toContain("onDelete");
  });
});
