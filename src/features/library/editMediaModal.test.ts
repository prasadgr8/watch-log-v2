import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const modalSource = readFileSync(
  join(featureDirectory, "components/EditMediaModal.tsx"),
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
 * Source-level regression coverage for the Edit Progress dialog, matching the
 * libraryTheme and settingsResponsive test conventions. The modal mirrors the
 * established ConfirmDialog behavior: dialog semantics, Escape and backdrop
 * cancellation guarded by the save state, initial focus on the status control,
 * and focus restoration to the previously focused element. Runtime DOM
 * behavior cannot be exercised in the node test environment, so these
 * assertions pin the implementation contract instead.
 */
describe("edit media modal dialog semantics", () => {
  it("renders a modal dialog with modal semantics", () => {
    expect(modalSource).toContain('role="dialog"');
    expect(modalSource).toContain('aria-modal="true"');
  });

  it("names the dialog with a stable title id", () => {
    expect(modalSource).toContain('aria-labelledby="edit-media-modal-title"');
    expect(modalSource).toContain('id="edit-media-modal-title"');
  });

  it("describes the dialog with the edited media title and type", () => {
    expect(modalSource).toContain(
      'aria-describedby="edit-media-modal-media-title edit-media-modal-media-type"',
    );
    expect(modalSource).toContain('id="edit-media-modal-media-title"');
    expect(modalSource).toContain('id="edit-media-modal-media-type"');
  });

  it("separates an aria-hidden backdrop from the positioned dialog panel", () => {
    expect(backdropElement).toContain('aria-hidden="true"');
    expect(backdropElement).toContain("absolute inset-0 bg-black/60");
    expect(modalSource).toContain("relative w-full max-w-lg");
  });
});

describe("edit media modal keyboard and focus behavior", () => {
  it("closes on Escape through a document listener only while not saving", () => {
    expect(modalSource).toContain('document.addEventListener("keydown"');
    expect(modalSource).toContain('event.key === "Escape"');
    expect(modalSource).toContain("!isSavingRef.current");
  });

  it("removes the Escape listener when the dialog closes", () => {
    expect(modalSource).toContain('document.removeEventListener("keydown"');
  });

  it("opens with focus on the status control passed from the modal owner", () => {
    expect(modalSource).toContain("statusSelectRef.current?.focus()");
    expect(modalSource).toContain("statusSelectRef={statusSelectRef}");
    expect(modalSource).toContain("ref={statusSelectRef}");
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
    expect(modalSource).toContain("if (!isOpen) {");
    expect(modalSource).toContain("}, [isOpen]);");
  });
});

describe("edit media modal preserved functionality", () => {
  it("keeps per-media form state reset through the media key", () => {
    expect(modalSource).toContain("key={media.id}");
  });

  it("keeps the save action disabled while a save is running", () => {
    expect(modalSource).toContain("disabled={isSaving}");
  });

  it("keeps the dialog unrendered until the library opens it", () => {
    expect(modalSource).toContain("if (!isOpen || media === null) {");
    expect(modalSource).toContain("return null;");
  });
});
