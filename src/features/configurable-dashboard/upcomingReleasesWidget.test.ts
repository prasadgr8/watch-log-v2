import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  episodeRepository,
  mediaRepository,
} from "../../database/repositories";

import type { Episode, TVShow } from "../../types";

import type { UpcomingEpisodeItem } from "../upcoming/services/upcomingEpisodesService";

import {
  getUpcomingReleaseLabel,
  getUpcomingReleasesPreview,
  UPCOMING_RELEASES_PREVIEW_LIMIT,
} from "./services/upcomingReleasesWidgetService";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const upcomingWidgetSource = readFileSync(
  join(featureDirectory, "components", "UpcomingReleasesWidget.tsx"),
  "utf-8",
);
const widgetCardSource = readFileSync(
  join(featureDirectory, "components", "DashboardWidgetCard.tsx"),
  "utf-8",
);

function createTvShow(overrides: Partial<TVShow> = {}): TVShow {
  const now = new Date("2026-07-15T00:00:00.000Z");

  return {
    tmdbId: 1396,
    mediaType: "tv",
    title: "Breaking Bad",
    userStatus: "watching",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createEpisode(
  showId: number,
  overrides: Partial<Episode> = {},
): Episode {
  const now = new Date("2026-07-15T00:00:00.000Z");

  return {
    showId,
    seasonNumber: 1,
    episodeNumber: 1,
    title: "Pilot",
    watched: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("upcoming releases widget service", () => {
  it("renders upcoming episode data with release date and relative label", async () => {
    const showId = await mediaRepository.add(createTvShow());

    await episodeRepository.add(
      createEpisode(showId, {
        episodeNumber: 1,
        title: "Pilot",
        airDate: "2026-07-16",
      }),
    );

    const { upcomingEpisodesService } = await import(
      "../upcoming/services/upcomingEpisodesService"
    );
    const items = await upcomingEpisodesService.getItems(
      new Date("2026-07-15T12:00:00"),
    );

    expect(items).toHaveLength(1);

    const preview = getUpcomingReleasesPreview(items);

    expect(preview).toHaveLength(1);
    expect(preview[0]?.airDate).toBe("2026-07-16");
    expect(preview[0]?.episode.title).toBe("Pilot");
    expect(preview[0]?.media.title).toBe("Breaking Bad");
    expect(getUpcomingReleaseLabel("2026-07-16", "2026-07-15")).toBe(
      "Airs tomorrow",
    );
  });

  it("caps the compact preview while preserving service order", async () => {
    const showId = await mediaRepository.add(createTvShow());

    for (let index = 0; index < UPCOMING_RELEASES_PREVIEW_LIMIT + 2; index++) {
      const day = String(16 + index).padStart(2, "0");

      await episodeRepository.add(
        createEpisode(showId, {
          episodeNumber: index + 1,
          title: `Episode ${index + 1}`,
          airDate: `2026-07-${day}`,
        }),
      );
    }

    const { upcomingEpisodesService } = await import(
      "../upcoming/services/upcomingEpisodesService"
    );
    const items = await upcomingEpisodesService.getItems(
      new Date("2026-07-15T12:00:00"),
    );
    const preview = getUpcomingReleasesPreview(items);

    expect(preview).toHaveLength(UPCOMING_RELEASES_PREVIEW_LIMIT);
    expect(preview.map((item: UpcomingEpisodeItem) => item.airDate)).toEqual([
      "2026-07-16",
      "2026-07-17",
      "2026-07-18",
      "2026-07-19",
      "2026-07-20",
    ]);
  });

  it("stays compact: links to the full page instead of a calendar", () => {
    expect(widgetCardSource).toContain('destination: "/upcoming"');
    expect(widgetCardSource).toContain("View All");
    expect(upcomingWidgetSource).not.toContain("View Upcoming");
    expect(upcomingWidgetSource).not.toContain("groupUpcomingByMonthAndShow");
    expect(upcomingWidgetSource).not.toContain("UpcomingShowCard");
    expect(upcomingWidgetSource).not.toContain("fetch(");
  });
});
