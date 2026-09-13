import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const pageSource = readFileSync(
  join(featureDirectory, "UpcomingPage.tsx"),
  "utf-8",
);

const showCardSource = readFileSync(
  join(featureDirectory, "components/UpcomingShowCard.tsx"),
  "utf-8",
);

const listItemSource = readFileSync(
  join(featureDirectory, "components/UpcomingEpisodeListItem.tsx"),
  "utf-8",
);

const densitySource = readFileSync(
  join(featureDirectory, "..", "ui", "density.ts"),
  "utf-8",
);

/*
 * Source-level regression coverage for the A25.7 Upcoming release-cards
 * rework, matching the repo's upcomingPage / dashboardUpcoming /
 * episodesDensity test conventions. Runtime DOM behavior cannot be
 * exercised in the node test environment, so these assertions pin the
 * implementation contract instead.
 */
describe("upcoming release-cards density", () => {
  it("uses the dedicated upcoming-card-density persistence key", () => {
    expect(pageSource).toContain(
      'UPCOMING_DENSITY_KEY = "upcoming-card-density"',
    );
  });

  it("loads density through the shared useDensity hook", () => {
    expect(pageSource).toContain("useDensity(UPCOMING_DENSITY_KEY)");
    expect(pageSource).toContain('from "../ui/useDensity"');
  });

  it("renders DensityToggle and does NOT introduce a List/Grid toggle", () => {
    expect(pageSource).toContain("<DensityToggle");
    expect(pageSource).not.toContain("ViewModeToggle");
    expect(pageSource).not.toContain("viewMode");
  });

  it("reuses the existing WatchLog density architecture", () => {
    expect(pageSource).toContain('from "../ui/density"');
    expect(pageSource).toContain("CARD_GAP[density]");
    // Episode grid mapping is the preferred reference for the vertical
    // show-card grid; no independent Upcoming sizing system is introduced.
    expect(pageSource).toContain("EPISODE_GRID_COLUMNS[density]");
    expect(pageSource).not.toContain("UPCOMING_SHOW_GRID_COLUMNS");
    expect(pageSource).not.toContain("UPCOMING_GRID_COLUMNS");
    expect(densitySource).not.toContain("UPCOMING_SHOW_GRID_COLUMNS");
    expect(densitySource).not.toContain("UPCOMING_GRID_COLUMNS");
    expect(showCardSource).toContain("CARD_TITLE_SIZE[density]");
  });
});
describe("upcoming month/year plus show grouping", () => {
  it("groups by Month/Year derived from the YYYY-MM airDate prefix", () => {
    expect(pageSource).toContain("groupUpcomingByMonthAndShow");
    expect(pageSource).toContain("airDate.slice(0, 7)");
  });

  it("renders Month/Year section labels in chronological order", () => {
    expect(pageSource).toContain("MONTH_NAMES");
    expect(pageSource).toContain("OCTOBER");
    expect(pageSource).toContain("yearMonth < b.yearMonth");
  });

  it("groups episodes by show within each month", () => {
    expect(pageSource).toContain("ShowGroup");
    expect(pageSource).toContain("shows: Array.from(showMap.values())");
  });

  it("keeps same show across months in separate month cards", () => {
    // One card per (show, month) pair; months never merge.
    expect(pageSource).toContain("${show.media.id}-${monthGroup.yearMonth}");
  });

  it("renders one show-level card per show per month", () => {
    expect(pageSource).toContain("<UpcomingShowCard");
    expect(pageSource).toContain('from "./components/UpcomingShowCard"');
    expect(pageSource).not.toContain("<UpcomingEpisodeListItem");
  });

  it("preserves exact air dates inside each show card", () => {
    expect(showCardSource).toContain("item.airDate");
    expect(showCardSource).toContain("getRelativeAirDateLabel");
    expect(showCardSource).toContain("formatShortDate");
  });

  it("supports both single and multiple episodes per show card", () => {
    expect(showCardSource).toContain("episodes.map");
    expect(showCardSource).toContain("formatEpisodeCode");
  });

  it("keeps watched future episodes visible with an indicator", () => {
    expect(showCardSource).toContain("episode.watched");
    expect(showCardSource).toContain("Watched");
  });

  it("links each show card to the TV show details route", () => {
    expect(showCardSource).toContain("/library/tv/${media.id}");
  });
});

describe("upcoming show-card layout contract", () => {
  it("uses a vertical card layout with natural height", () => {
    expect(showCardSource).toContain("flex flex-col overflow-hidden");
    expect(showCardSource).not.toMatch(/<article[^>]*h-full/);
    expect(showCardSource).not.toMatch(/<article[^>]*flex-1/);
    expect(showCardSource).not.toMatch(/h-\[\d+px\]/);
  });

  it("lets show titles wrap instead of single-line truncation", () => {
    expect(showCardSource).toContain("{media.title}");
    expect(showCardSource).not.toMatch(/<h2[^>]*truncate/);
  });

  it("renders episode titles without clipping truncation", () => {
    expect(showCardSource).toContain("{item.episode.title}");
    expect(showCardSource).not.toMatch(/truncate/);
  });

  it("uses a responsive auto-fill grid with no JS viewport math", () => {
    expect(pageSource).toContain("items-start");
    expect(densitySource).toContain("repeat(auto-fill");
    expect(pageSource).not.toContain("resize");
    expect(pageSource).not.toContain("window.innerWidth");
    expect(pageSource).not.toContain("useMediaQuery");
  });
});
describe("upcoming density performance contract", () => {
  it("loads data once with an empty-effect dependency array", () => {
    expect(pageSource).toContain("}, []);");
    expect(pageSource).toContain("upcomingEpisodesService.getItems");
  });

  it("derives grouping from episode data via useMemo, not density", () => {
    expect(pageSource).toContain(
      "useMemo(() => groupUpcomingByMonthAndShow(items), [items])",
    );
    expect(pageSource).not.toContain("[items, density]");
  });

  it("does NOT tie getItems to density state", () => {
    expect(pageSource).not.toContain("}, [density]);");
    expect(pageSource).not.toContain("getItems(density");
  });

  it("introduces no network or TMDB logic for the release-card UI", () => {
    expect(pageSource).not.toContain("fetch(");
    expect(pageSource).not.toContain("tmdbSearchService");
    expect(pageSource).not.toContain("TMDB");
    expect(showCardSource).not.toContain("fetch(");
    expect(showCardSource).not.toContain("tmdbSearchService");
  });

  it("introduces no background polling or notifications", () => {
    expect(pageSource).not.toContain("setInterval");
    expect(pageSource).not.toContain("Notification");
  });
});
describe("upcoming rework scope boundary", () => {
  it("leaves UpcomingEpisodeListItem Dashboard-compatible", () => {
    expect(listItemSource).toContain("UpcomingEpisodeListItem");
    expect(listItemSource).not.toContain("UpcomingShowCard");
    expect(listItemSource).not.toContain("groupUpcomingByMonthAndShow");
    expect(listItemSource).not.toContain("EPISODE_GRID_COLUMNS");
    expect(listItemSource).not.toContain("useDensity");
  });

  it("does NOT modify navigation or sidebar", () => {
    expect(pageSource).not.toContain("Sidebar");
  });

  it("does NOT duplicate episode filtering or date logic", () => {
    expect(pageSource).not.toContain("isValidAirDate");
    expect(pageSource).not.toContain("getAirDateRelation");
    expect(pageSource).not.toContain("compareAirDates");
  });

  it("does NOT parse Dates or invent timezone semantics", () => {
    expect(pageSource).not.toContain("new Date(item.airDate");
    expect(pageSource).not.toContain("toISOString");
    expect(showCardSource).not.toContain("new Date(item.airDate");
    expect(showCardSource).not.toContain("toISOString");
    expect(showCardSource).not.toContain("getTimezoneOffset");
  });

  it("adds no watch, edit, notification, streaming, or collection controls", () => {
    expect(showCardSource).not.toContain("onToggleWatched");
    expect(showCardSource).not.toContain("Mark Watched");
    expect(showCardSource).not.toContain("Mark Unwatched");
    expect(showCardSource).not.toContain("onEdit");
    expect(showCardSource).not.toContain("Notification");
    expect(showCardSource).not.toContain("streaming");
    expect(showCardSource).not.toContain("SmartCollection");
  });

  it("does NOT persist evaluated results", () => {
    expect(pageSource).not.toContain("db.episodes.add");
    expect(pageSource).not.toContain("db.media.add");
  });
});
