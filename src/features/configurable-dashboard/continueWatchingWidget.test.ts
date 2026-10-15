import { describe, expect, it } from "vitest";

import {
  episodeRepository,
  mediaRepository,
} from "../../database/repositories";

import type { Episode, TVShow } from "../../types";

import {
  CONTINUE_WATCHING_PREVIEW_LIMIT,
  getContinueWatchingWidgetItems,
} from "./services/continueWatchingWidgetService";

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

describe("continue watching widget service", () => {
  it("exposes the next unwatched episode with last-watch context", async () => {
    const showId = await mediaRepository.add(createTvShow());

    await episodeRepository.add(
      createEpisode(showId, {
        episodeNumber: 1,
        title: "Pilot",
        watched: true,
        watchedAt: new Date("2026-07-10T18:30:00.000Z"),
      }),
    );

    const nextEpisodeId = await episodeRepository.add(
      createEpisode(showId, {
        episodeNumber: 2,
        title: "Cat's in the Bag...",
      }),
    );

    const items = await getContinueWatchingWidgetItems();

    expect(items).toHaveLength(1);
    expect(items[0]?.media).toMatchObject({
      id: showId,
      title: "Breaking Bad",
      mediaType: "tv",
    });
    expect(items[0]?.nextEpisode).toMatchObject({
      id: nextEpisodeId,
      seasonNumber: 1,
      episodeNumber: 2,
      title: "Cat's in the Bag...",
      watched: false,
    });
    expect(items[0]?.lastWatchedAt).toEqual(
      new Date("2026-07-10T18:30:00.000Z"),
    );
  });

  it("excludes completed shows", async () => {
    const activeShowId = await mediaRepository.add(
      createTvShow({ title: "Active Show" }),
    );
    const completedShowId = await mediaRepository.add(
      createTvShow({ title: "Completed Show", tmdbId: 9999 }),
    );

    await episodeRepository.add(
      createEpisode(activeShowId, {
        episodeNumber: 1,
        watched: true,
        watchedAt: new Date("2026-07-10T18:30:00.000Z"),
      }),
    );
    await episodeRepository.add(
      createEpisode(activeShowId, { episodeNumber: 2 }),
    );

    await episodeRepository.add(
      createEpisode(completedShowId, {
        episodeNumber: 1,
        watched: true,
        watchedAt: new Date("2026-07-09T18:30:00.000Z"),
      }),
    );
    await episodeRepository.add(
      createEpisode(completedShowId, {
        episodeNumber: 2,
        watched: true,
        watchedAt: new Date("2026-07-10T18:30:00.000Z"),
      }),
    );

    const items = await getContinueWatchingWidgetItems();

    expect(items).toHaveLength(1);
    expect(items[0]?.media.title).toBe("Active Show");
  });

  it("carries no progress values across the widget boundary", async () => {
    const showId = await mediaRepository.add(createTvShow());

    await episodeRepository.add(
      createEpisode(showId, {
        episodeNumber: 1,
        watched: true,
        watchedAt: new Date("2026-07-10T18:30:00.000Z"),
      }),
    );
    await episodeRepository.add(
      createEpisode(showId, { episodeNumber: 2 }),
    );

    const items = await getContinueWatchingWidgetItems();

    expect(items).toHaveLength(1);
    expect(items[0]).not.toHaveProperty("progressPercentage");
    expect(items[0]).not.toHaveProperty("watchedEpisodeCount");
    expect(items[0]).not.toHaveProperty("totalEpisodeCount");
  });

  it("caps the widget to the compact preview limit", async () => {
    for (let index = 0; index < CONTINUE_WATCHING_PREVIEW_LIMIT + 2; index++) {
      const showId = await mediaRepository.add(
        createTvShow({ title: `Show ${index}`, tmdbId: 1000 + index }),
      );

      await episodeRepository.add(
        createEpisode(showId, {
          episodeNumber: 1,
          watched: true,
          watchedAt: new Date(`2026-07-1${index}T18:30:00.000Z`),
        }),
      );
      await episodeRepository.add(
        createEpisode(showId, { episodeNumber: 2 }),
      );
    }

    const items = await getContinueWatchingWidgetItems();

    expect(items).toHaveLength(CONTINUE_WATCHING_PREVIEW_LIMIT);
  });
});
