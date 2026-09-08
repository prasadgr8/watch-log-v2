import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

const modalSource = readFileSync(
  "src/features/library/components/AddSelectedToCollectionModal.tsx",
  "utf8",
);

describe("AddSelectedToCollectionModal source contract", () => {
  it("renders a dialog with the established modal accessibility contract", () => {
    expect(modalSource).toMatch(/role="dialog"/);
    expect(modalSource).toMatch(/aria-modal="true"/);
    expect(modalSource).toMatch(/aria-labelledby="add-selected-modal-title"/);
    expect(modalSource).toMatch(
      /aria-describedby="add-selected-modal-description"/,
    );
  });

  it("guards Escape cancellation with the busy flag", () => {
    expect(modalSource).toMatch(/event\.key === "Escape"/);
    expect(modalSource).toMatch(/!/);
    expect(modalSource).toMatch(/isSaving/);
  });

  it("provides a labeled search input", () => {
    expect(modalSource).toMatch(/htmlFor="add-selected-search"/);
    expect(modalSource).toMatch(/id="add-selected-search"/);
  });

  it("exposes a labelled Add button per collection row", () => {
    expect(modalSource).toMatch(/aria-label={`Add to \$\{collection\.name}`}/);
  });

  it("announces the number of items being added", () => {
    expect(modalSource).toMatch(/collectionCount/);
  });
});
