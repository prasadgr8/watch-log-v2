import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const cardSource = readFileSync(
  join(featureDirectory, "components/CollectionMediaCard.tsx"),
  "utf-8",
);

/*
 * Source-level regression coverage for the Collection Media Card. The card
 * visually follows MediaCard but intentionally omits every destructive media
 * action: removing an item from a collection must never delete the underlying
 * media, episodes, or watch history. Runtime DOM behavior cannot be exercised
 * in the node test environment, so these assertions pin the contract instead.
 */
describe("collection media card", () => {
  it("renders the media title", () => {
    expect(cardSource).toContain("media.title");
  });

  it("renders the media type label", () => {
    expect(cardSource).toContain("TV Show");
    expect(cardSource).toContain("Movie");
  });

  it("deep-links TV media to the library detail page", () => {
    expect(cardSource).toContain("/library/tv/${media.id}");
  });

  it("does NOT expose media deletion", () => {
    expect(cardSource).not.toContain("handleDelete");
    expect(cardSource).not.toContain("deleteMedia");
    expect(cardSource).not.toContain("onDelete");
  });

  it("does NOT expose destructive media editing", () => {
    expect(cardSource).not.toContain("EditMediaModal");
    expect(cardSource).not.toContain("onEdit");
  });

  it("provides a labelled Remove-from-collection control", () => {
    expect(cardSource).toContain("Remove");
    expect(cardSource).toContain(
      "aria-label={`Remove ${media.title} from collection`}",
    );
    expect(cardSource).toContain("onRemove");
  });
});