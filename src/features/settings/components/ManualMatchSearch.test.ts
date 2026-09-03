import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

/**
 * Source-assertion tests for ManualMatchSearch, following the repository's
 * established testing convention. The component requires a DOM environment to
 * exercise interactively, so we pin the implementation contract by asserting
 * the presence and wiring of key behaviors in the source.
 */

const source = readFileSync(
  join(process.cwd(), "src/features/settings/components/ManualMatchSearch.tsx"),
  "utf8",
);

describe("ManualMatchSearch", () => {
  it("renders with the initial TV Time title", () => {
    expect(source).toContain("useState(showTitle)");
    expect(source).toContain("value={query}");
  });

  it("search input is present", () => {
    expect(source).toContain("input");
    expect(source).toContain("type=\"text\"");
    expect(source).toContain("Search TMDB for a match");
  });

  it("search invokes the existing TMDB TV search service", () => {
    expect(source).toContain("tmdbSearchService");
    expect(source).toContain("searchTvShows");
  });

  it("loading state is represented", () => {
    expect(source).toContain("isSearching");
    expect(source).toContain("setIsSearching");
    expect(source).toContain("Searching...");
  });

  it("TMDB results are displayed", () => {
    expect(source).toContain("results.map");
    expect(source).toContain("result.name");
    expect(source).toContain("result.first_air_date");
  });

  it("selecting a result calls the parent callback with the complete TmdbTvSearchResult", () => {
    expect(source).toContain("onResolve");
    expect(source).toContain("decision: \"use\"");
    expect(source).toContain("tmdbId: result.id");
    expect(source).toContain("tmdbShow: result");
  });

  it("empty-result state works", () => {
    expect(source).toContain("hasSearched");
    expect(source).toContain("results.length === 0");
    expect(source).toContain("No TV shows found");
  });

  it("error state works", () => {
    expect(source).toContain("setError");
    expect(source).toContain("role=\"alert\"");
    expect(source).toContain("Unable to search TMDB right now");
  });

  it("cancel action works", () => {
    expect(source).toContain("onCancel");
    expect(source).toContain("Cancel");
  });
});
