import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const pageSource = readFileSync(
  join(featureDirectory, "UpcomingPage.tsx"),
  "utf-8",
);

const listItemSource = readFileSync(
  join(featureDirectory, "components/UpcomingEpisodeListItem.tsx"),
  "utf-8",
);

/*
 * Source-level regression coverage for the Upcoming Episodes page, matching the
 * collectionsPage and editMediaModal test conventions. Runtime DOM behavior
 * cannot be exercised in the node test environment, so these assertions pin
 * the implementation contract instead.
 */
describe("upcoming episodes page", () => {
  it("renders the page title 'Upcoming Episodes'", () => {
    expect(pageSource).toContain("Upcoming Episodes");
  });

  it("consumes upcomingEpisodesService.getItems", () => {
    expect(pageSource).toContain("upcomingEpisodesService");
    expect(pageSource).toContain("getItems");
    expect(pageSource).toContain("import {");
    expect(pageSource).toContain("upcomingEpisodesService,");
    expect(pageSource).toContain("type UpcomingEpisodeItem,");
    expect(pageSource).toContain(
      '} from "./services/upcomingEpisodesService";',
    );
  });

  it("renders a loading state while loading", () => {
    expect(pageSource).toContain("Loading your upcoming episodes...");
    expect(pageSource).toContain("isLoading");
  });

  it("renders an empty-library state when the library has no media", () => {
    expect(pageSource).toContain("Your library is empty");
    expect(pageSource).toContain("mediaRepository.count");
  });

  it("renders a no-upcoming state when the library has media but no upcoming episodes", () => {
    expect(pageSource).toContain("No upcoming episodes");
    expect(pageSource).toContain(
      "Episodes airing today, tomorrow, and in the future",
    );
  });

  it("renders an error state with role=alert on service failure", () => {
    expect(pageSource).toContain('role="alert"');
    expect(pageSource).toContain("Unable to load upcoming episodes.");
  });

  it("groups episodes by Month/Year then show (release-card projection)", () => {
    expect(pageSource).toContain("groupUpcomingByMonthAndShow");
    expect(pageSource).toContain("airDate.slice(0, 7)");
  });

  it("renders Month/Year section labels in chronological order", () => {
    expect(pageSource).toContain("MONTH_NAMES");
    expect(pageSource).toContain("OCTOBER");
    expect(pageSource).toContain("yearMonth < b.yearMonth");
  });
});

describe("upcoming episode list item", () => {
  it("renders the show title", () => {
    expect(listItemSource).toContain("media.title");
  });

  it("links to the TV show detail route", () => {
    expect(listItemSource).toContain("/library/tv/${media.id}");
    expect(listItemSource).toContain("View ${media.title} details");
  });

  it("displays the SxxEyy episode code", () => {
    expect(listItemSource).toContain("S${season}E${episode}");
    expect(listItemSource).toContain('padStart(2, "0")');
  });

  it("displays the episode title", () => {
    expect(listItemSource).toContain("episode.title");
  });

  it("displays the air date", () => {
    expect(listItemSource).toContain("item.airDate");
    expect(listItemSource).toContain("CalendarDays");
  });

  it("displays a relative date label", () => {
    expect(listItemSource).toContain("relativeLabel");
  });

  it("shows a watched indicator for watched future episodes", () => {
    expect(listItemSource).toContain("episode.watched");
    expect(listItemSource).toContain("Watched");
    expect(listItemSource).toContain("Check");
  });

  it("does NOT expose watch-toggle controls (out of scope)", () => {
    expect(listItemSource).not.toContain("onToggleWatched");
    expect(listItemSource).not.toContain("Mark Watched");
    expect(listItemSource).not.toContain("Mark Unwatched");
  });

  it("renders the show poster", () => {
    expect(listItemSource).toContain("media.posterPath");
    expect(listItemSource).toContain("posterUrl");
  });
});

describe("upcoming episodes page scope boundary", () => {
  it("does NOT modify navigation/sidebar", () => {
    expect(pageSource).not.toContain("Sidebar");
    expect(pageSource).not.toContain("menu");
  });

  it("does NOT duplicate episode filtering/date logic", () => {
    expect(pageSource).not.toContain("isValidAirDate");
    expect(pageSource).not.toContain("getAirDateRelation");
    expect(pageSource).not.toContain("compareAirDates");
  });

  it("does NOT persist evaluated results", () => {
    expect(pageSource).not.toContain("db.episodes.add");
    expect(pageSource).not.toContain("db.media.add");
  });

  it("does NOT make network/TMDB calls", () => {
    expect(pageSource).not.toContain("tmdbSearchService");
    expect(pageSource).not.toContain("fetch(");
  });
});
