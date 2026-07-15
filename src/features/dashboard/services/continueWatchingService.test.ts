import { describe, expect, it } from "vitest";

import {
  episodeRepository,
  mediaRepository,
} from "../../../database/repositories";

import type { Episode, TVShow } from "../../../types";

import { continueWatchingService } from "./continueWatchingService";

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

describe("continueWatchingService", () => {
  it("returns progress and the next unwatched episode", async () => {
    const showId = await mediaRepository.add(createTvShow());

    await episodeRepository.add(
      createEpisode(showId, {
        episodeNumber: 1,
        title: "Pilot",
        watched: true,
        watchedAt: new Date("2026-07-10T18:30:00.000Z"),
      }),
    );

    await episodeRepository.add(
      createEpisode(showId, {
        episodeNumber: 2,
        title: "Cat's in the Bag...",
        watched: true,
        watchedAt: new Date("2026-07-11T18:30:00.000Z"),
      }),
    );

    const nextEpisodeId = await episodeRepository.add(
      createEpisode(showId, {
        episodeNumber: 3,
        title: "...And the Bag's in the River",
      }),
    );

    await episodeRepository.add(
      createEpisode(showId, {
        episodeNumber: 4,
        title: "Cancer Man",
      }),
    );

    const items = await continueWatchingService.getItems();

    expect(items).toHaveLength(1);

    expect(items[0]).toMatchObject({
      watchedEpisodeCount: 2,
      totalEpisodeCount: 4,
      progressPercentage: 50,
    });

    expect(items[0]?.media).toMatchObject({
      id: showId,
      title: "Breaking Bad",
      mediaType: "tv",
    });

    expect(items[0]?.nextEpisode).toMatchObject({
      id: nextEpisodeId,
      seasonNumber: 1,
      episodeNumber: 3,
      title: "...And the Bag's in the River",
      watched: false,
    });
  });

  it("selects the next episode using season and episode order", async () => {
    const showId = await mediaRepository.add(createTvShow());

    await episodeRepository.add(
      createEpisode(showId, {
        seasonNumber: 2,
        episodeNumber: 1,
        title: "Seven Thirty-Seven",
      }),
    );

    const nextEpisodeId = await episodeRepository.add(
      createEpisode(showId, {
        seasonNumber: 1,
        episodeNumber: 3,
        title: "...And the Bag's in the River",
      }),
    );

    await episodeRepository.add(
      createEpisode(showId, {
        seasonNumber: 1,
        episodeNumber: 1,
        title: "Pilot",
        watched: true,
        watchedAt: new Date("2026-07-10T18:30:00.000Z"),
      }),
    );

    await episodeRepository.add(
      createEpisode(showId, {
        seasonNumber: 1,
        episodeNumber: 2,
        title: "Cat's in the Bag...",
        watched: true,
        watchedAt: new Date("2026-07-11T18:30:00.000Z"),
      }),
    );

    const items = await continueWatchingService.getItems();

    expect(items).toHaveLength(1);

    expect(items[0]?.nextEpisode).toMatchObject({
      id: nextEpisodeId,
      seasonNumber: 1,
      episodeNumber: 3,
    });
  });

  it("excludes season zero episodes from progress and next episode selection", async () => {
    const showId = await mediaRepository.add(createTvShow());

    await episodeRepository.add(
      createEpisode(showId, {
        seasonNumber: 0,
        episodeNumber: 1,
        title: "Special",
      }),
    );

    await episodeRepository.add(
      createEpisode(showId, {
        seasonNumber: 1,
        episodeNumber: 1,
        title: "Pilot",
        watched: true,
        watchedAt: new Date("2026-07-10T18:30:00.000Z"),
      }),
    );

    const nextEpisodeId = await episodeRepository.add(
      createEpisode(showId, {
        seasonNumber: 1,
        episodeNumber: 2,
        title: "Cat's in the Bag...",
      }),
    );

    const items = await continueWatchingService.getItems();

    expect(items).toHaveLength(1);

    expect(items[0]).toMatchObject({
      watchedEpisodeCount: 1,
      totalEpisodeCount: 2,
      progressPercentage: 50,
    });

    expect(items[0]?.nextEpisode.id).toBe(nextEpisodeId);
  });

  it("excludes a show when no regular episodes have been watched", async () => {
    const showId = await mediaRepository.add(createTvShow());

    await episodeRepository.add(createEpisode(showId));

    await episodeRepository.add(
      createEpisode(showId, {
        episodeNumber: 2,
        title: "Cat's in the Bag...",
      }),
    );

    const items = await continueWatchingService.getItems();

    expect(items).toHaveLength(0);
  });

  it("excludes a completed show", async () => {
    const showId = await mediaRepository.add(createTvShow());

    await episodeRepository.add(
      createEpisode(showId, {
        watched: true,
        watchedAt: new Date("2026-07-10T18:30:00.000Z"),
      }),
    );

    await episodeRepository.add(
      createEpisode(showId, {
        episodeNumber: 2,
        title: "Cat's in the Bag...",
        watched: true,
        watchedAt: new Date("2026-07-11T18:30:00.000Z"),
      }),
    );

    const items = await continueWatchingService.getItems();

    expect(items).toHaveLength(0);
  });

  it("excludes shows without synchronized regular episodes", async () => {
    await mediaRepository.add(createTvShow());

    const items = await continueWatchingService.getItems();

    expect(items).toHaveLength(0);
  });

  it("calculates progress independently and orders shows by recent activity", async () => {
    const breakingBadId = await mediaRepository.add(createTvShow());

    const strangerThingsId = await mediaRepository.add(
      createTvShow({
        tmdbId: 66732,
        title: "Stranger Things",
      }),
    );

    await episodeRepository.add(
      createEpisode(breakingBadId, {
        watched: true,
        watchedAt: new Date("2026-07-10T18:30:00.000Z"),
      }),
    );

    await episodeRepository.add(
      createEpisode(breakingBadId, {
        episodeNumber: 2,
        title: "Cat's in the Bag...",
      }),
    );

    await episodeRepository.add(
      createEpisode(strangerThingsId, {
        watched: true,
        watchedAt: new Date("2026-07-12T18:30:00.000Z"),
      }),
    );

    await episodeRepository.add(
      createEpisode(strangerThingsId, {
        episodeNumber: 2,
        title: "The Weirdo on Maple Street",
      }),
    );

    await episodeRepository.add(
      createEpisode(strangerThingsId, {
        episodeNumber: 3,
        title: "Holly, Jolly",
      }),
    );

    const items = await continueWatchingService.getItems();

    expect(items).toHaveLength(2);

    expect(items.map((item) => item.media.title)).toEqual([
      "Stranger Things",
      "Breaking Bad",
    ]);

    expect(items[0]).toMatchObject({
      watchedEpisodeCount: 1,
      totalEpisodeCount: 3,
      progressPercentage: 33,
      lastWatchedAt: new Date("2026-07-12T18:30:00.000Z"),
    });

    expect(items[1]).toMatchObject({
      watchedEpisodeCount: 1,
      totalEpisodeCount: 2,
      progressPercentage: 50,
      lastWatchedAt: new Date("2026-07-10T18:30:00.000Z"),
    });
  });
  it("excludes a show when watched state has no watch timestamp", async () => {
    const showId = await mediaRepository.add(createTvShow());

    await episodeRepository.add(
      createEpisode(showId, {
        watched: true,
        watchedAt: undefined,
      }),
    );

    await episodeRepository.add(
      createEpisode(showId, {
        episodeNumber: 2,
        title: "Cat's in the Bag...",
      }),
    );

    const items = await continueWatchingService.getItems();

    expect(items).toHaveLength(0);
  });
});
