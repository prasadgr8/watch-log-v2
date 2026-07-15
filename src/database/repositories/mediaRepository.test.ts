import { describe, expect, it } from "vitest";

import { db } from "../db";

import type { Episode, Media } from "../../types";

import { episodeRepository } from "./episodeRepository";

import { mediaRepository } from "./mediaRepository";

function createTvShow(overrides: Partial<Media> = {}): Media {
  const now = new Date("2026-07-15T00:00:00.000Z");

  return {
    tmdbId: 1396,
    mediaType: "tv",
    title: "Breaking Bad",
    userStatus: "watching",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as Media;
}

function createEpisode(
  showId: number,
  overrides: Partial<Episode> = {},
): Episode {
  const now = new Date("2026-07-15T00:00:00.000Z");

  return {
    showId,
    tmdbId: 62085,
    seasonNumber: 1,
    episodeNumber: 1,
    title: "Pilot",
    runtime: 58,
    watched: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("mediaRepository", () => {
  it("adds media and retrieves it by generated ID", async () => {
    const mediaId = await mediaRepository.add(createTvShow());

    const storedMedia = await mediaRepository.getById(mediaId);

    expect(mediaId).toBeGreaterThan(0);
    expect(storedMedia).toMatchObject({
      id: mediaId,
      tmdbId: 1396,
      mediaType: "tv",
      title: "Breaking Bad",
      userStatus: "watching",
    });
  });

  it("updates media and refreshes updatedAt", async () => {
    const originalUpdatedAt = new Date("2026-07-14T00:00:00.000Z");

    const mediaId = await mediaRepository.add(
      createTvShow({
        updatedAt: originalUpdatedAt,
      }),
    );

    await mediaRepository.update(mediaId, {
      title: "Breaking Bad Updated",
      userStatus: "completed",
    });

    const storedMedia = await mediaRepository.getById(mediaId);

    expect(storedMedia).toMatchObject({
      id: mediaId,
      title: "Breaking Bad Updated",
      userStatus: "completed",
    });

    expect(storedMedia?.updatedAt.getTime()).toBeGreaterThan(
      originalUpdatedAt.getTime(),
    );
  });

  it("filters media by type", async () => {
    await mediaRepository.add(createTvShow());

    await mediaRepository.add({
      ...createTvShow(),
      tmdbId: 157336,
      mediaType: "movie",
      title: "Interstellar",
      userStatus: "completed",
      releaseDate: "2014-11-05",
    });

    const tvShows = await mediaRepository.getByType("tv");
    const movies = await mediaRepository.getByType("movie");

    expect(tvShows).toHaveLength(1);
    expect(tvShows[0]?.title).toBe("Breaking Bad");

    expect(movies).toHaveLength(1);
    expect(movies[0]?.title).toBe("Interstellar");
  });

  it("filters media by watch status", async () => {
    await mediaRepository.add(createTvShow());

    await mediaRepository.add(
      createTvShow({
        tmdbId: 66732,
        title: "Stranger Things",
        userStatus: "planned",
      }),
    );

    const watchingMedia = await mediaRepository.getByStatus("watching");

    const plannedMedia = await mediaRepository.getByStatus("planned");

    expect(watchingMedia).toHaveLength(1);
    expect(watchingMedia[0]?.title).toBe("Breaking Bad");

    expect(plannedMedia).toHaveLength(1);
    expect(plannedMedia[0]?.title).toBe("Stranger Things");
  });

  it("removes a media record", async () => {
    const mediaId = await mediaRepository.add(createTvShow());

    await mediaRepository.remove(mediaId);

    const storedMedia = await mediaRepository.getById(mediaId);

    expect(storedMedia).toBeUndefined();
  });

  it("removes related episodes and watch history when a TV show is removed", async () => {
    const showId = await mediaRepository.add(createTvShow());

    const otherShowId = await mediaRepository.add(
      createTvShow({
        tmdbId: 66732,
        title: "Stranger Things",
      }),
    );

    const firstEpisodeId = await episodeRepository.add(createEpisode(showId));

    const secondEpisodeId = await episodeRepository.add(
      createEpisode(showId, {
        tmdbId: 62086,
        episodeNumber: 2,
        title: "Cat's in the Bag...",
      }),
    );

    const otherShowEpisodeId = await episodeRepository.add(
      createEpisode(otherShowId, {
        tmdbId: 119123,
        title: "Chapter One",
      }),
    );

    const now = new Date("2026-07-15T00:00:00.000Z");

    await db.watchHistory.bulkAdd([
      {
        episodeId: firstEpisodeId,
        watchedAt: new Date("2026-07-10T18:30:00.000Z"),
        source: "manual",
        createdAt: now,
      },
      {
        episodeId: secondEpisodeId,
        watchedAt: new Date("2026-07-11T18:30:00.000Z"),
        source: "manual",
        createdAt: now,
      },
      {
        episodeId: otherShowEpisodeId,
        watchedAt: new Date("2026-07-12T18:30:00.000Z"),
        source: "manual",
        createdAt: now,
      },
    ]);

    await mediaRepository.remove(showId);

    const removedShow = await mediaRepository.getById(showId);

    const removedShowEpisodes = await db.episodes
      .where("showId")
      .equals(showId)
      .toArray();

    const otherShowEpisodes = await db.episodes
      .where("showId")
      .equals(otherShowId)
      .toArray();

    const removedEpisodeWatchHistory = await db.watchHistory
      .where("episodeId")
      .anyOf(firstEpisodeId, secondEpisodeId)
      .toArray();

    const otherEpisodeWatchHistory = await db.watchHistory
      .where("episodeId")
      .equals(otherShowEpisodeId)
      .toArray();

    expect(removedShow).toBeUndefined();
    expect(removedShowEpisodes).toHaveLength(0);
    expect(removedEpisodeWatchHistory).toHaveLength(0);

    expect(otherShowEpisodes).toHaveLength(1);
    expect(otherShowEpisodes[0]?.title).toBe("Chapter One");

    expect(otherEpisodeWatchHistory).toHaveLength(1);
    expect(otherEpisodeWatchHistory[0]?.episodeId).toBe(otherShowEpisodeId);
  });
});
