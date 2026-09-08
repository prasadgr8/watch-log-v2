import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

const libraryPageSource = readFileSync(
  "src/features/library/LibraryPage.tsx",
  "utf8",
);

const mediaCardSource = readFileSync(
  "src/features/library/components/MediaCard.tsx",
  "utf8",
);

const mediaListItemSource = readFileSync(
  "src/features/library/components/MediaListItem.tsx",
  "utf8",
);

describe("Library bulk selection source contract", () => {
  it("owns selection state as a Set of ids", () => {
    expect(libraryPageSource).toMatch(/selectedIds.*Set<number>/);
    expect(libraryPageSource).toMatch(/isSelectionMode/);
  });

  it("clears selection when the filter signature changes", () => {
    // The clearing logic reads the filter inputs and compares against a
    // previous signature, so the dependency list must include every
    // user-facing filter and sort control.
    expect(libraryPageSource).toMatch(/filterSignature/);
    expect(libraryPageSource).toMatch(/previousFilterSignature/);
    expect(libraryPageSource).toMatch(/search/);
    expect(libraryPageSource).toMatch(/mediaType/);
    expect(libraryPageSource).toMatch(/status/);
    expect(libraryPageSource).toMatch(/sort/);
  });

  it("passes selection props to both MediaCard and MediaListItem", () => {
    expect(libraryPageSource).toMatch(/isSelectionMode={isSelectionMode}/);
    expect(libraryPageSource).toMatch(/isSelected={selectedIds\.has\(item\.id\)}/);
    expect(libraryPageSource).toMatch(/onToggleSelected={toggleSelected}/);
  });

  it("wires a labeled checkbox in MediaCard", () => {
    expect(mediaCardSource).toMatch(/aria-label={`Select \${media\.title}`}/);
    expect(mediaCardSource).toMatch(/type="checkbox"/);
  });

  it("wires a labeled checkbox in MediaListItem", () => {
    expect(mediaListItemSource).toMatch(/aria-label={`Select \${media\.title}`}/);
    expect(mediaListItemSource).toMatch(/type="checkbox"/);
  });

  it("renders a ConfirmDialog for single-item delete", () => {
    expect(libraryPageSource).toMatch(/deletingMedia !== null/);
    expect(libraryPageSource).toMatch(/Deleting this TV show will also delete/);
  });

  it("renders a ConfirmDialog for bulk delete", () => {
    expect(libraryPageSource).toMatch(/isBulkDeleteConfirmOpen/);
    expect(libraryPageSource).toMatch(/Deleting TV shows also deletes their episodes/);
  });
});
