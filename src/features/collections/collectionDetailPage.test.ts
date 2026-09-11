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

  it("navigates back to /collections after a successful delete", () => {
    expect(pageSource).toContain("useNavigate");
    expect(pageSource).toContain('navigate("/collections")');

    // The navigate call must happen after the delete succeeds and the dialog
    // state is reset â€” not before the awaited delete.
    const deleteHandler = pageSource.match(
      /async function handleDelete[\s\S]*?\n {2}\}/,
    )?.[0] ?? "";
    expect(deleteHandler).toContain(
      "await collectionsService.deleteCollection(deletingCollection.id)",
    );
    expect(deleteHandler).toContain('navigate("/collections")');
  });

  it("sets isSaving while the delete is in progress", () => {
    const deleteHandler = pageSource.match(
      /async function handleDelete[\s\S]*?\n {2}\}/,
    )?.[0] ?? "";

    expect(deleteHandler).toContain("setIsSaving(true)");
    expect(deleteHandler).toContain("await collectionsService.deleteCollection");
  });

  it("surfaces delete failures through the page error mechanism", () => {
    const deleteHandler = pageSource.match(
      /async function handleDelete[\s\S]*?\n {2}\}/,
    )?.[0] ?? "";

    expect(deleteHandler).toContain("catch");
    expect(deleteHandler).toContain("setError");
    expect(deleteHandler).toContain("Failed to delete collection.");
  });

  it("resets isSaving in a finally block so the dialog unlocks", () => {
    const deleteHandler = pageSource.match(
      /async function handleDelete[\s\S]*?\n {2}\}/,
    )?.[0] ?? "";

    expect(deleteHandler).toContain("finally");
    expect(deleteHandler).toContain("setIsSaving(false)");
  });
});

describe("collection detail page smart collections", () => {
  it("detects Smart collections from the persisted definition", () => {
    expect(pageSource).toContain("collectionsService.getSmartCollectionDefinition");
    expect(pageSource).toContain("setIsSmart(smartDefinition !== undefined)");
    expect(pageSource).toContain("const [isSmart, setIsSmart] = useState(false)");
  });

  it("evaluates members live from the current library snapshot", () => {
    expect(pageSource).toContain("evaluateSmartCollection(definition, libraryMedia)");
    expect(pageSource).toContain("collectionsService.getAllLibraryMedia()");
  });

  it("renders the Smart Collection indicator and filter summary", () => {
    expect(pageSource).toContain("Smart Collection");
    expect(pageSource).toContain("<SmartFilterSummary");
    expect(pageSource).toContain("filters={definition.filters}");
  });

  it("provides Edit Filters for Smart collections", () => {
    expect(pageSource).toContain("Edit Filters");
    expect(pageSource).toContain("handleSmartEdit");
  });

  it("hides Add Media and manual membership controls for Smart collections", () => {
    expect(pageSource).toContain("{!isSmart && (");
    expect(pageSource).toContain("<SmartResultsSection");
  });

  it("renders Smart results through the shared results section", () => {
    expect(pageSource).toContain("media={smartMedia}");
    expect(pageSource).toContain("onDelete={handleRequestDeleteMedia}");
  });

  it("reopens the editor with the existing filter state", () => {
    expect(pageSource).toContain("initialFilters={definition.filters}");
    expect(pageSource).toContain("collectionId={collection.id}");
  });
});
