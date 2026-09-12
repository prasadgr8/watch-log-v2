import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const pageSource = readFileSync(
  join(featureDirectory, "CollectionsPage.tsx"),
  "utf-8",
);

/*
 * Source-level regression coverage for the Collections page, matching the
 * editMediaModal and mobileNavigation test conventions. Runtime DOM behavior
 * cannot be exercised in the node test environment, so these assertions pin
 * the implementation contract instead.
 */
describe("collections page", () => {
  it("renders a labelled create form with a name input", () => {
    expect(pageSource).toContain('htmlFor="new-collection-name"');
    expect(pageSource).toContain('id="new-collection-name"');
    expect(pageSource).toContain('type="text"');
    expect(pageSource).toContain('placeholder="Collection name"');
  });

  it("validates empty collection names", () => {
    expect(pageSource).toContain("Collection name is required.");
    expect(pageSource).toContain("trimmed.length === 0");
  });

  it("disables the create control while saving", () => {
    expect(pageSource).toContain("disabled={isSaving}");
    expect(pageSource).toContain("Create Collection");
  });

  it("renders a loading state while collections load", () => {
    expect(pageSource).toContain("Loading your collections...");
    expect(pageSource).toContain("isLoading");
  });

  it("renders an empty state when there are no collections", () => {
    expect(pageSource).toContain("No collections yet");
    expect(pageSource).toContain("Create your first collection");
  });

  it("renders collection cards with name and media count", () => {
    expect(pageSource).toContain("collection.name");
    expect(pageSource).toContain("collection.id");
  });

  it("provides labelled open, rename, and delete controls per collection", () => {
    expect(pageSource).toContain("aria-label={`Open ${collection.name}`}");
    expect(pageSource).toContain("aria-label={`Rename ${collection.name}`}");
    expect(pageSource).toContain("aria-label={`Delete ${collection.name}`}");
  });

  it("opens the collection detail on open", () => {
    expect(pageSource).toContain("/collections/${collection.id}");
  });

  it("uses the existing ConfirmDialog for delete confirmation", () => {
    expect(pageSource).toContain("ConfirmDialog");
    expect(pageSource).toContain("Delete Collection");
    expect(pageSource).toContain("will not delete any media");
  });

  it("uses RenameCollectionModal for rename", () => {
    expect(pageSource).toContain("RenameCollectionModal");
    expect(pageSource).toContain("isRenameModalOpen");
  });
});
describe("collections page smart collection UI", () => {
  it("renders All/Manual/Smart navigation tabs", () => {
    expect(pageSource).toContain('{ key: "all", label: "All" }');
    expect(pageSource).toContain('{ key: "manual", label: "Manual" }');
    expect(pageSource).toContain('{ key: "smart", label: "Smart" }');
    expect(pageSource).toContain('aria-label="Filter collections"');
    expect(pageSource).toContain("setActiveFilter(tab.key)");
  });

  it("opens the Create Collection chooser from the primary action", () => {
    expect(pageSource).toContain("+ Create Collection");
    expect(pageSource).toContain('aria-haspopup="dialog"');
    expect(pageSource).toContain("setIsTypeSelectorOpen(true)");
  });

  it("wires the CollectionTypeSelector to manual and smart flows", () => {
    expect(pageSource).toContain("<CollectionTypeSelector");
    expect(pageSource).toContain("onSelectManual={openCreateManualModal}");
    expect(pageSource).toContain("onSelectSmart={openSmartEditor}");
  });

  it("classifies collections through the smart definition source of truth", () => {
    expect(pageSource).toContain("collectionsService.classifyCollections");
    expect(pageSource).toContain("classification.isSmart");
  });

  it("marks Smart collections with an accessible indicator", () => {
    expect(pageSource).toContain('aria-label="Smart Collection"');
    expect(pageSource).toContain("isSmart ? \"Auto-updating\" : \"Manual\"");
  });

  it("keeps the manual creation form as the Manual flow", () => {
    expect(pageSource).toContain("htmlFor=\"new-collection-name\"");
    expect(pageSource).toContain("isCreateModalOpen");
  });

  it("opens the Smart Collection editor for Smart creation", () => {
    expect(pageSource).toContain("<SmartCollectionEditor");
    expect(pageSource).toContain("onSaved={(smartCollectionId: number) =>");
  });

  it("deletes Smart collections through the definition-aware service", () => {
    expect(pageSource).toContain("collectionsService.deleteSmartCollection");
    expect(pageSource).toContain("Deleting this Smart Collection will delete its saved filters");
  });
});
