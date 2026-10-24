import { describe, expect, it } from "vitest";

import type { ArtworkEnrichmentResult } from "./artworkEnrichmentService";

import { formatArtworkEnrichmentSummary } from "./formatArtworkEnrichmentSummary";

/**
 * Unit tests for {@link formatArtworkEnrichmentSummary}.
 *
 * This module covers the pure formatting function only. It does not assert on
 * component rendering, event handlers, or lifecycle behavior, which are covered
 * by the LibraryPage integration test suite.
 */
describe("formatArtworkEnrichmentSummary", () => {
  const result = (overrides: Partial<ArtworkEnrichmentResult> = {}): ArtworkEnrichmentResult => ({
    updatedCount: 0,
    noArtworkCount: 0,
    skippedNoTmdbIdCount: 0,
    failedCount: 0,
    failures: [],
    ...overrides,
  });

  it("includes every applicable outcome category in a mixed result", () => {
    const summary = formatArtworkEnrichmentSummary(
      result({
        updatedCount: 3,
        noArtworkCount: 1,
        skippedNoTmdbIdCount: 2,
        failedCount: 4,
      }),
    );

    expect(summary).toContain("Updated artwork for 3 items.");
    expect(summary).toContain("1 item has no artwork.");
    expect(summary).toContain("2 items skipped - no TMDB ID.");
    expect(summary).toContain("4 records failed to sync.");
  });

  it("applies singular labels when a count is one", () => {
    const summary = formatArtworkEnrichmentSummary(
      result({
        noArtworkCount: 1,
        failedCount: 1,
      }),
    );

    expect(summary).toContain("1 item has no artwork.");
    expect(summary).toContain("1 record failed to sync.");
    expect(summary).not.toContain("items have no artwork");
    expect(summary).not.toContain("records failed to sync");
  });

  it("reports all counts are zero as up to date", () => {
    const summary = formatArtworkEnrichmentSummary(result());

    expect(summary).toBe("No artwork missing. All records are up to date.");
  });

  it("omits zero-count categories but keeps non-zero ones", () => {
    const summary = formatArtworkEnrichmentSummary(
      result({
        updatedCount: 2,
        failedCount: 0,
      }),
    );

    expect(summary).toContain("Updated artwork for 2 items.");
    expect(summary).not.toContain("no artwork");
    expect(summary).not.toContain("skipped");
    expect(summary).not.toContain("failed");
  });

  it("returns the up-to-date message when all counts are zero", () => {
    const summary = formatArtworkEnrichmentSummary(
      result({
        updatedCount: 0,
        noArtworkCount: 0,
        skippedNoTmdbIdCount: 0,
        failedCount: 0,
      }),
    );

    expect(summary).toBe("No artwork missing. All records are up to date.");
  });
});
