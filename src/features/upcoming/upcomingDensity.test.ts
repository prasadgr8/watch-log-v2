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

describe("upcoming show-card density", () => {
  it("uses the dedicated upcoming-card-density persistence key", () => {
    expect(pageSource).toContain(
      'UPCOMING_DENSITY_KEY = "upcoming-card-density"',
    );
  });

  it("loads density through the shared useDensity hook", () => {
    expect(pageSource).toContain("useDensity(UPCOMING_DENSITY_KEY)");
    expect(pageSource).toContain('from "../ui/useDensity"');
  });

  it("renders DensityToggle", () => {
    expect(pageSource).toContain("<DensityToggle");
  });

  it("reuses the existing WatchLog density architecture", () => {
    expect(pageSource).toContain('from "../ui/density"');
    expect(pageSource).toContain("CARD_GAP[density]");
    expect(pageSource).toContain("LIBRARY_GRID_COLUMNS[density]");
    expect(pageSource).not.toContain("EPISODE_GRID_COLUMNS");
    expect(densitySource).not.toContain("UPCOMING_SHOW_GRID_COLUMNS");
    expect(showCardSource).toContain("CARD_TITLE_SIZE[density]");
  });
});

describe("upcoming month show grouping", () => {
  it("groups by Month derived from the YYYY-MM airDate prefix", () => {
    expect(pageSource).toContain("groupUpcomingByMonthAndShow");
    expect(pageSource).toContain("airDate.slice(0, 7)");
  });

  it("renders Month Year section labels in chronological order", () => {
    expect(pageSource).toContain("MONTH_NAMES");
    expect(pageSource).toContain("OCTOBER");
    expect(pageSource).toContain("yearMonth < b.yearMonth");
  });

  it("collapses each month to one card per show with seasons", () => {
    expect(pageSource).toContain("interface ShowGroup");
    expect(pageSource).toContain("seasons: Array.from(seasonSet)");
  });

  it("renders one show-level card per show per month", () => {
    expect(pageSource).toContain("<UpcomingShowCard");
    expect(pageSource).not.toContain("<UpcomingEpisodeListItem");
  });

  it("derives seasons from seasonNumbers with no new data model", () => {
    expect(pageSource).toContain("item.episode.seasonNumber");
    expect(pageSource).toContain("sort((a, b) => a - b)");
  });

  it("shows season lines plus a date hint, not an episode list", () => {
    expect(showCardSource).toContain("Season ${");
    expect(showCardSource).toContain("Premiering ${");
    expect(showCardSource).toContain("New episodes from ${");
    expect(showCardSource).toContain("seasons.map");
    expect(showCardSource).not.toContain("episodes.map");
    expect(showCardSource).not.toContain("formatEpisodeCode");
  });

  it("links each show card to the TV show details route", () => {
    expect(showCardSource).toContain("/library/tv/${media.id}");
    expect(showCardSource).toContain("View Show");
  });
});

describe("upcoming card layout contract", () => {
  it("uses a vertical card layout with natural height", () => {
    expect(showCardSource).toContain("flex w-full flex-col self-start");
  });

  it("lets show titles wrap instead of single-line truncation", () => {
    expect(showCardSource).toContain("{media.title}");
  });

  it("renders no episode titles inside the card", () => {
    expect(showCardSource).not.toContain("episode.title");
  });

  it("uses a responsive auto-fill grid with no JS viewport math", () => {
    expect(pageSource).toContain("items-start");
    expect(densitySource).toContain("repeat(auto-fill");
    expect(pageSource).not.toContain("window.innerWidth");
    expect(pageSource).not.toContain("useMediaQuery");
  });
});

describe("upcoming performance contract", () => {
  it("loads data once with an empty-effect dependency array", () => {
    expect(pageSource).toContain("}, []);");
    expect(pageSource).toContain("upcomingEpisodesService.getItems");
  });

  it("derives grouping from episode data via useMemo, not density", () => {
    expect(pageSource).toContain("groupUpcomingByMonthAndShow(items)");
    expect(pageSource).not.toContain("[items, density]");
  });

  it("introduces no network or TMDB logic for the show-card UI", () => {
    expect(pageSource).not.toContain("fetch(");
    expect(pageSource).not.toContain("tmdbSearchService");
    expect(showCardSource).not.toContain("fetch(");
    expect(showCardSource).not.toContain("tmdbSearchService");
  });
});

describe("upcoming scope boundary", () => {
  it("leaves UpcomingEpisodeListItem Dashboard-compatible", () => {
    expect(listItemSource).toContain("UpcomingEpisodeListItem");
    expect(listItemSource).not.toContain("UpcomingShowCard");
    expect(listItemSource).not.toContain("groupUpcomingByMonthAndShow");
    expect(listItemSource).not.toContain("LIBRARY_GRID_COLUMNS");
    expect(listItemSource).not.toContain("useDensity");
  });

  it("does NOT duplicate episode filtering or date logic", () => {
    expect(pageSource).not.toContain("isValidAirDate");
    expect(pageSource).not.toContain("getAirDateRelation");
    expect(pageSource).not.toContain("compareAirDates");
    expect(pageSource).not.toContain("getRelativeAirDateLabel");
  });

  it("adds no watch or edit controls", () => {
    expect(showCardSource).not.toContain("onToggleWatched");
    expect(showCardSource).not.toContain("Mark Watched");
    expect(showCardSource).not.toContain("onEdit");
    expect(showCardSource).not.toContain("episode.watched");
  });

  it("does NOT persist evaluated results", () => {
    expect(pageSource).not.toContain("db.episodes.add");
    expect(pageSource).not.toContain("db.media.add");
  });
});
