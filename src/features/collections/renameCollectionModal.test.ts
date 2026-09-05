import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const modalSource = readFileSync(
  join(featureDirectory, "components/RenameCollectionModal.tsx"),
  "utf-8",
);

/*
 * The backdrop is the aria-hidden scrim layer; extracting it lets the
 * cancellation assertions target the backdrop itself instead of any
 * `if (!isSaving)` occurrence in the file.
 */
const backdropElement =
  modalSource.match(/<div\s+aria-hidden="true"[\s\S]*?<\/div>/)?.[0] ?? "";

/*
 * Source-level regression coverage for the Rename Collection modal, matching
 * the editMediaModal test conventions. The modal mirrors the established
 * EditMediaModal dialog behavior: dialog semantics, Escape and backdrop
 * cancellation guarded by the save state, initial focus on the name control,
 * and focus restoration to the previously focused element. Runtime DOM
 * behavior cannot be exercised in the node test environment, so these
 * assertions pin the implementation contract instead.
 */
describe("rename collection modal dialog semantics", () => {
  it("renders a modal dialog with modal semantics", () => {
    expect(modalSource).toContain('role="dialog"');
    expect(modalSource).toContain('aria-modal="true"');
  });

  it("names the dialog with a stable title id", () => {
    expect(modalSource).toContain(
      'aria-labelledby="rename-collection-modal-title"',
    );
    expect(modalSource).toContain('id="rename-collection-modal-title"');
  });

  it("describes the dialog with a stable description id", () => {
    expect(modalSource).toContain(
      'aria-describedby="rename-collection-modal-description"',
    );
    expect(modalSource).toContain('id="rename-collection-modal-description"');
  });

  it("separates an aria-hidden backdrop from the positioned dialog panel", () => {
    expect(backdropElement).toContain('aria-hidden="true"');
    expect(backdropElement).toContain("absolute inset-0 bg-app-bg/80");
    expect(modalSource).toContain("relative w-full max-w-md");
  });
});

describe("rename collection modal keyboard and focus behavior", () => {
  it("closes on Escape through a document listener only while not saving", () => {
    expect(modalSource).toContain('document.addEventListener("keydown"');
    expect(modalSource).toContain('event.key === "Escape"');
    expect(modalSource).toContain("!isSavingRef.current");
  });

  it("removes the Escape listener when the dialog closes", () => {
    expect(modalSource).toContain('document.removeEventListener("keydown"');
  });

  it("opens with focus on the name control", () => {
    expect(modalSource).toContain("nameInputRef.current?.focus()");
    expect(modalSource).toContain("ref={nameInputRef}");
  });

  it("restores focus to the previously focused element on close", () => {
    expect(modalSource).toContain(
      "document.activeElement instanceof HTMLElement",
    );
    expect(modalSource).toContain("previouslyFocusedRef.current?.focus()");
  });

  it("closes from the backdrop only while a save is not running", () => {
    expect(backdropElement).toContain("onClick={() => {");
    expect(backdropElement).toContain("if (!isSaving) {");
    expect(backdropElement).toContain("onClose();");
  });

  it("gates the dialog behavior on the isOpen state", () => {
    expect(modalSource).toContain("if (!isOpen || collection === null) {");
    expect(modalSource).toContain("}, [isOpen]);");
  });
});

describe("rename collection modal preserved functionality", () => {
  it("validates empty collection names", () => {
    expect(modalSource).toContain("Collection name is required.");
    expect(modalSource).toContain("trimmed.length === 0");
  });

  it("disables the save control while saving", () => {
    expect(modalSource).toContain("disabled={isSaving}");
  });

  it("renders a labelled name input", () => {
    expect(modalSource).toContain('htmlFor="collection-name"');
    expect(modalSource).toContain('id="collection-name"');
  });

  it("renders the dialog only when a collection is provided", () => {
    expect(modalSource).toContain("collection === null");
    expect(modalSource).toContain("return null;");
  });
});