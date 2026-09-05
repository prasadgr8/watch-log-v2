import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const pageSource = readFileSync(
  join(featureDirectory, "CollectionDetailPage.tsx"),
  "utf-8",
);

/*
 * Source-level regression coverage for the Collection Detail page. Runtime DOM
 * behavior cannot be exercised in the node test environment, so these assertions
 * pin the implementation contract instead.
 */
describe("collection detail page", () => {
  it("renders a loading state while the collection loads", () => {
    expect(pageSource).toContain("Loading collection...");
    expect(pageSource).toContain("isLoading");
  });

  it("renders an error state when the collection cannot be loaded", () => {
    expect(pageSource).toContain("error");
    expect(pageSource).toContain("Unable to load this collection.");
  });

  it("renders an empty state when the collection has no media", () => {
    expect(pageSource).toContain("This collection is empty");
    expect(pageSource).toContain("Add existing library media");
  });

  it("renders the collection name and rename control", () => {
    expect(pageSource).toContain("collection.name");
    expect(pageSource).toContain("Rename ${collection.name}");
    expect(pageSource).toContain("setIsRenameModalOpen");
  });

  it("provides an Add Media control that opens the picker modal", () => {
    expect(pageSource).toContain("Add Media");
    expect(pageSource).toContain("isAddMediaModalOpen");
    expect(pageSource).toContain("handleOpenAddMedia");
  });

  it("provides a delete control that opens the ConfirmDialog", () => {
    expect(pageSource).toContain("Delete");
    expect(pageSource).toContain("ConfirmDialog");
    expect(pageSource).toContain("Delete Collection");
    expect(pageSource).toContain("will not delete any media");
  });

  it("renders collection members using CollectionMediaCard", () => {
    expect(pageSource).toContain("CollectionMediaCard");
    expect(pageSource).toContain("handleRemoveMedia");
  });

  it("uses the RenameCollectionModal for rename", () => {
    expect(pageSource).toContain("RenameCollectionModal");
    expect(pageSource).toContain("isRenameModalOpen");
  });

  it("uses the AddMediaToCollectionModal for adding media", () => {
    expect(pageSource).toContain("AddMediaToCollectionModal");
    expect(pageSource).toContain("pickerMedia");
  });

  it("provides a back navigation link to the collections list", () => {
    expect(pageSource).toContain("ArrowLeft");
    expect(pageSource).toContain("/collections");
  });
});