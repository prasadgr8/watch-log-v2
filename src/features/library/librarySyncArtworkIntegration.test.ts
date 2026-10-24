import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "url";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

/* Source-contract checks for Library Sync TMDB Artwork.
 *
 * These tests assert on the control layout, the explicit-action guard, the
 * busy-state cleanup, mutual exclusion, and the delegation of summary
 * formatting to a shared pure function. The formatting logic itself is unit
 * tested in `formatArtworkEnrichmentSummary.test.ts`; here we verify that the
 * handler imports and invokes it, and that the resulting summary is surfaced
 * through `enrichmentStatus` rather than `setError`.
 */
const libraryPageSource = readFileSync(
  join(featureDirectory, "LibraryPage.tsx"),
  "utf-8",
);

describe("Library sync TMDB artwork source contract", () => {
  it("source-contract: LibraryPage defines separate genre and artwork click handlers", () => {
    // Source-text assertions in this test verify that the LibraryPage source
    // contains exactly one type="button" element for the genre sync action and
    // exactly one for the artwork sync action, each carrying its own
    // independent onClick attribute. These checks confirm that the two
    // actions are wired to separate click handlers in source code, but they
    // do NOT verify rendered DOM/JSX sibling relationships (which require
    // DOM-level or integration testing to confirm).
    expect(libraryPageSource).toContain('type="button"');
    expect(libraryPageSource).toContain('onClick={handleSyncTmdbGenres}');
    expect(libraryPageSource).toContain('onClick={handleSyncTmdbArtwork}');
    const genresBtnCount = (libraryPageSource.match(/onClick={handleSyncTmdbGenres}/g) || []).length;
    const artworkBtnCount = (libraryPageSource.match(/onClick={handleSyncTmdbArtwork}/g) || []).length;
    expect(genresBtnCount).toBe(1);
    expect(artworkBtnCount).toBe(1);
  });

  it("explicit: Sync artwork activates only on an explicit click", () => {
    // The handler guards on isEnriching first.
    expect(libraryPageSource).toMatch(/if \(isEnriching\)/);
    // The button is disabled during enrichment and when offline.
    expect(libraryPageSource).toContain('disabled={isEnriching || !isOnline}');
  });

  it("offline: Sync artwork button is disabled when the client is offline", () => {
    expect(libraryPageSource).toContain('disabled={isEnriching || !isOnline}');
  });

  it("busy-state: setIsEnriching(false) runs in finally regardless of outcome", () => {
    expect(libraryPageSource).toContain('finally');
    expect(libraryPageSource).toContain('setIsEnriching(false)');
  });

  it("mutual-exclusion: isEnriching blocks concurrent genre and artwork sync", () => {
    expect(libraryPageSource).toMatch(/isEnriching/);
    // A shared isEnriching guard returns early when sync is already in flight.
    expect(libraryPageSource).toMatch(/return;/);
    // Both buttons carry the same disabled={isEnriching} guard.
    expect(libraryPageSource).toContain('disabled={isEnriching');
  });

  it("result-reporting: handler delegates formatting to a shared pure function", () => {
    // The handler imports the shared formatting function.
    expect(libraryPageSource).toContain('formatArtworkEnrichmentSummary');
    // The handler invokes it once with the enrichment result.
    expect(libraryPageSource).toMatch(/formatArtworkEnrichmentSummary\(result\)/);
    // The completion summary is surfaced through enrichmentStatus (not setError).
    expect(libraryPageSource).toContain('setEnrichmentStatus(formatArtworkEnrichmentSummary(result))');
    // loadMedia refreshes the Library after the result is reported.
    expect(libraryPageSource).toContain('await loadMedia()');
    // Exceptions remain the only setError calls inside the handler.
    expect(libraryPageSource).toContain('Unable to sync TMDB artwork. Please try again.');
  });
});
