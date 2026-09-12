import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const selectorSource = readFileSync(
  join(featureDirectory, "CollectionTypeSelector.tsx"),
  "utf-8",
);

describe("collection type selector", () => {
  it("offers Manual and Smart collection choices", () => {
    expect(selectorSource).toContain("Manual Collection");
    expect(selectorSource).toContain("Smart Collection");
  });

  it("exposes separate callbacks for each choice", () => {
    expect(selectorSource).toContain("onSelectManual");
    expect(selectorSource).toContain("onSelectSmart");
  });

  it("renders a Cancel escape hatch", () => {
    expect(selectorSource).toContain("Cancel");
  });

  it("is a labelled modal dialog", () => {
    expect(selectorSource).toContain('role="dialog"');
    expect(selectorSource).toContain('aria-modal="true"');
    expect(selectorSource).toContain("Choose collection type");
  });

  it("closes on Escape and restores focus", () => {
    expect(selectorSource).toContain('event.key === "Escape"');
    expect(selectorSource).toContain("previouslyFocusedRef.current?.focus()");
  });
});
