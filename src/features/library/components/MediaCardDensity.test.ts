import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const mediaCardSource = readFileSync(
  join(featureDirectory, "MediaCard.tsx"),
  "utf-8",
);

describe("MediaCard density", () => {
  it("accepts a density prop", () => {
    expect(mediaCardSource).toContain("density");
    expect(mediaCardSource).toContain("CardDensity");
  });

  it("applies density to the title typography", () => {
    expect(mediaCardSource).toContain("CARD_TITLE_SIZE");
  });

  it("applies density to the content padding", () => {
    expect(mediaCardSource).toContain("density");
  });

  it("applies density to the poster dimensions", () => {
    expect(mediaCardSource).toContain("max-h-48");
    expect(mediaCardSource).toContain("max-h-64");
    expect(mediaCardSource).toContain("max-h-80");
  });

  it("defaults density to comfortable", () => {
    expect(mediaCardSource).toContain('"comfortable"');
  });

  it("preserves all existing richer-card behavior", () => {
    expect(mediaCardSource).toContain("firstAirDate");
    expect(mediaCardSource).toContain("releaseDate");
    expect(mediaCardSource).toContain("media.rating");
    expect(mediaCardSource).toContain("StickyNote");
    expect(mediaCardSource).toContain("ProgressBar");
    expect(mediaCardSource).toContain("onToggleFavorite");
    expect(mediaCardSource).toContain("onEdit");
    expect(mediaCardSource).toContain("onDelete");
  });
});
