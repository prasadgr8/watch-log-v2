import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

const toolbarSource = readFileSync(
  "src/features/library/components/BulkActionsToolbar.tsx",
  "utf8",
);

describe("BulkActionsToolbar source contract", () => {
  it("renders a live region showing the selected count", () => {
    expect(toolbarSource).toMatch(/role="status"/);
    expect(toolbarSource).toMatch(/\{selectedCount\} selected/);
  });

  it("disables action buttons when nothing is selected", () => {
    // The disabled state is driven by `!hasSelection || isBusy`, and the
    // action buttons must reflect that.
    expect(toolbarSource).toMatch(/!hasSelection/);
    expect(toolbarSource).toMatch(/disabled={disabled}/);
  });

  it("uses semantic tokens only (no hard-coded dark palette)", () => {
    // Mirrors the searchTheme/settingsTheme convention: no raw gray/white
    // hex or tailwind color literals.
    expect(toolbarSource).not.toMatch(/bg-gray-/);
    expect(toolbarSource).not.toMatch(/text-white/);
    expect(toolbarSource).toMatch(/bg-surface/);
    expect(toolbarSource).toMatch(/border-border/);
  });

  it("provides a labeled status select control", () => {
    expect(toolbarSource).toMatch(/htmlFor="bulk-status-select"/);
    expect(toolbarSource).toMatch(/id="bulk-status-select"/);
  });

  it("exposes visible labels on all action buttons", () => {
    expect(toolbarSource).toMatch(/Favorite/);
    expect(toolbarSource).toMatch(/Unfavorite/);
    expect(toolbarSource).toMatch(/Add to Collection/);
    expect(toolbarSource).toMatch(/Delete/);
  });
});
