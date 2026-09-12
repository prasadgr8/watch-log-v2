import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const editorSource = readFileSync(
  join(featureDirectory, "SmartCollectionEditor.tsx"),
  "utf-8",
);

/*
 * Source-level regression coverage for the Smart Collection editor, matching
 * the collectionDetailPage / renameCollectionModal test conventions. Runtime
 * DOM behavior cannot be exercised in the node test environment, so these
 * assertions pin the binding between the form controls and the shared A24.3
 * filter model / A24.4-P1 evaluator.
 */
describe("smart collection editor", () => {
  it("seeds the form from the empty filter state when creating", () => {
    expect(editorSource).toContain("initialFilters ?? EMPTY_MEDIA_FILTERS");
    expect(editorSource).toContain("EMPTY_MEDIA_FILTERS");
  });

  it("renders every supported filter control with a real label", () => {
    expect(editorSource).toContain('id="sce-name"');
    expect(editorSource).toContain('id="sce-search"');
    expect(editorSource).toContain('id="sce-status"');
    expect(editorSource).toContain('id="sce-rating"');
    expect(editorSource).toContain("Favorites only");
  });

  it("provides All/Movies/TV Shows media type options", () => {
    expect(editorSource).toContain('aria-label="Media type"');
    expect(editorSource).toContain('{ label: "All", value: "all" }');
    expect(editorSource).toContain('{ label: "Movies", value: "movie" }');
    expect(editorSource).toContain('{ label: "TV Shows", value: "tv" }');
  });

  it("provides all watch status options plus Any status", () => {
    expect(editorSource).toContain('{ label: "Any status", value: "all" }');
    for (const status of ["planned", "watching", "completed", "on-hold", "dropped"]) {
      expect(editorSource).toContain(`value: "${status}"`);
    }
  });

  it("offers No minimum plus 0.5 increment rating thresholds", () => {
    expect(editorSource).toContain('{ label: "No minimum", value: null }');
    expect(editorSource).toContain("Array.from({ length: 21 }");
    expect(editorSource).toContain("v % 1 === 0 ? String(v) : v.toFixed(1)");
  });

  it("binds favorites to the shared favoritesOnly flag", () => {
    expect(editorSource).toContain("setFilter(\"favoritesOnly\", e.target.checked)");
  });

  it("explains that multiple genres use OR semantics", () => {
    expect(editorSource).toContain("Multiple genres use OR");
    expect(editorSource).toContain("toggleGenre(g)");
  });

  it("clears filters back to the shared empty state", () => {
    expect(editorSource).toContain('function clearFilters() { setFilters(EMPTY_MEDIA_FILTERS); setDebouncedSearch(""); }');
  });

  it("feeds every filter update through the shared MediaFilterState", () => {
    expect(editorSource).toContain("setFilter<K extends keyof MediaFilterState>");
    expect(editorSource).toContain("onChange={(e) => setFilter(\"search\", e.target.value)}");
    expect(editorSource).toContain('setFilter("mediaType", o.value)');
  });

  it("computes the preview through the shared evaluator", () => {
    expect(editorSource).toContain("evaluateSmartCollection(");
    expect(editorSource).toContain("filters: { ...filters, search: debouncedSearch }");
  });

  it("reports the complete match count, not just the preview slice", () => {
    expect(editorSource).toContain("matches.length");
    expect(editorSource).toContain("const previewMedia = matches.slice(0, PREVIEW_LIMIT)");
  });

  it("shows a dedicated zero-results state", () => {
    expect(editorSource).toContain("0 titles match");
    expect(editorSource).toContain("No media currently matches these filters.");
  });

  it("debounces search preview updates by 250ms", () => {
    expect(editorSource).toContain("debounceFn((v: string) => setDebouncedSearch(v), 250)");
  });

  it("validates that the name is required after trimming", () => {
    expect(editorSource).toContain("Collection name is required.");
    expect(editorSource).toContain("name.trim()");
  });

  it("creates a Smart Collection through the atomic repository service", () => {
    expect(editorSource).toContain("collectionsService.createSmartCollection(t, filters)");
    expect(editorSource).toContain("onSaved(r.collection.id)");
  });

  it("edits an existing definition without recreating the collection", () => {
    expect(editorSource).toContain("collectionsService.updateSmartCollectionFilters(collectionId, filters)");
    expect(editorSource).toContain("const isEditing = collectionId !== undefined");
  });

  it("renders edit mode title and primary action", () => {
    expect(editorSource).toContain("{isEditing ? \"Edit Smart Collection\" : \"Create Smart Collection\"}");
    expect(editorSource).toContain("isEditing ? \"Save Changes\" : \"Create Smart Collection\"");
  });

  it("locks the form while saving", () => {
    expect(editorSource).toContain("const isBusy = isSaving || isSubmitting;");
    expect(editorSource).toContain('isBusy ? "Saving..." : isEditing ? "Save Changes" : "Create Smart Collection"');
    const lockedControls = editorSource.split("disabled={isBusy}").length - 1;
    expect(lockedControls).toBeGreaterThanOrEqual(3);
  });

  it("loads the current library snapshot once when the editor opens", () => {
    expect(editorSource).toContain("collectionsService.getAllLibraryMedia()");
    expect(editorSource).toContain("setIsLoadingLibrary(true)");
  });

  it("restores focus and closes on Escape like the other dialogs", () => {
    expect(editorSource).toContain("prevFocus.current?.focus()");
    expect(editorSource).toContain('e.key === "Escape"');
  });

  it("blocks re-entrant submits while a save is already in flight", () => {
    expect(editorSource).toContain("if (isSubmittingRef.current || isSavingRef.current) return;");
  });

  it("raises the local busy flag before awaiting persistence and clears it afterwards", () => {
    expect(editorSource).toContain("isSubmittingRef.current = true;");
    expect(editorSource).toContain("setIsSubmitting(true);");
    const handler = editorSource.slice(
      editorSource.indexOf("async function submitHandler"),
      editorSource.indexOf("if (!isOpen) return null;"),
    );
    expect(handler).toContain("finally {");
    expect(handler).toContain("isSubmittingRef.current = false;");
    expect(handler).toContain("setIsSubmitting(false);");
    expect(handler.indexOf("finally {")).toBeGreaterThan(
      handler.indexOf("await collectionsService.createSmartCollection"),
    );
  });

  it("prevents closing the dialog while the editor save is in flight", () => {
    expect(editorSource).toContain("if (!isBusy) onClose();");
    expect(editorSource).toContain("!isSavingRef.current && !isSubmittingRef.current) onCloseRef.current();");
  });

  it("resets the busy state when the editor is reopened", () => {
    expect(editorSource).toContain("setIsSubmitting(false);");
    expect(editorSource).toContain("isSubmittingRef.current = false;");
  });
});