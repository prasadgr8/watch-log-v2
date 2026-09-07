import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const componentSource = readFileSync(
  join(featureDirectory, "GenreMultiSelect.tsx"),
  "utf-8",
);

const libraryPageSource = readFileSync(
  join(featureDirectory, "LibraryPage.tsx"),
  "utf-8",
);

/*
 * Source-level regression coverage for the accessible genre multi-select
 * dropdown, matching the libraryTheme and libraryViewMode source-assertion
 * conventions. The node test environment cannot render DOM, so these
 * assertions pin the behavioral contract: a real button trigger with
 * disclosure semantics, a labelled non-modal panel with real checkboxes,
 * immediate selection updates, Clear/Done/Escape/outside-click handling,
 * and search that only filters the displayed options.
 */
describe("genre multi-select dropdown", () => {
  it("renders a real button trigger with disclosure semantics", () => {
    expect(componentSource).toContain("aria-expanded={isOpen}");
    expect(componentSource).toContain('aria-haspopup="dialog"');
    expect(componentSource).toContain('aria-controls="library-genre-popover"');
    expect(componentSource).toContain('type="button"');
  });

  it("shows the selected count on the trigger label", () => {
    expect(componentSource).toContain("`Genre (${selectedGenres.length})`");
    expect(componentSource).toContain('"Genre"');
  });

  it("opens a labelled non-modal panel anchored to the trigger", () => {
    expect(componentSource).toContain('role="dialog"');
    expect(componentSource).toContain('aria-modal="false"');
    expect(componentSource).toContain('aria-label="Filter by genres"');
  });

  it("renders real checkboxes bound to the current selection", () => {
    expect(componentSource).toContain('type="checkbox"');
    expect(componentSource).toContain("checked={isSelected}");
    expect(componentSource).toContain("onChange={() => toggleGenre(genre)}");
    expect(componentSource).toContain("selectedGenres.includes(genre)");
  });

  it("applies checkbox changes immediately through onChange", () => {
    expect(componentSource).toContain(
      "onChange(selectedGenres.filter((selected) => selected !== genre))",
    );
    expect(componentSource).toContain("onChange([...selectedGenres, genre])");
  });

  it("clears the selection and closes from the panel footer", () => {
    expect(componentSource).toContain("onClick={() => onChange([])}");
    expect(componentSource).toMatch(/Clear\s*<\/button>/);
    expect(componentSource).toMatch(/Done\s*<\/button>/);
    expect(componentSource).toContain("{selectedGenres.length} selected");
  });

  it("closes on Escape and restores focus to the trigger", () => {
    expect(componentSource).toContain('event.key === "Escape"');
    expect(componentSource).toContain("triggerRef.current?.focus()");
  });

  it("closes on pointer-down outside the control", () => {
    expect(componentSource).toContain(
      'document.addEventListener("pointerdown", handleDocumentPointerDown);',
    );
    expect(componentSource).toContain(
      "!containerRef.current.contains(event.target)",
    );
  });

  it("filters only the displayed options without touching the selection", () => {
    expect(componentSource).toContain('aria-label="Search genres"');
    expect(componentSource).toContain('placeholder="Search genres..."');
    expect(componentSource).toContain("No genres match your search.");
    expect(componentSource).toMatch(
      /genres\.filter\(\(genre\) =>\s*genre\.toLowerCase\(\)\.includes\(normalizedQuery\),?\s*\)/,
    );
  });

  it("receives the shared TMDB genre list instead of duplicating it", () => {
    expect(libraryPageSource).toContain("<GenreMultiSelect");
    expect(libraryPageSource).toContain("genres={TMDB_GENRES_LIST}");
    expect(componentSource).not.toMatch(/"(Action|Drama|Comedy)"/);
  });
});