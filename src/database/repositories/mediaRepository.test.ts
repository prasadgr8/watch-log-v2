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

  it("updates only the provided fields during a partial update", async () => {
    const originalUpdatedAt = new Date("2026-07-14T00:00:00.000Z");

    const mediaId = await mediaRepository.add(
      createTvShow({
        rating: 7,
        favorite: true,
        updatedAt: originalUpdatedAt,
      }),
    );

    const before = await mediaRepository.getById(mediaId);

    await mediaRepository.update(mediaId, { genres: ["Action", "Drama"] });

    const after = await mediaRepository.getById(mediaId);

    expect(after?.genres).toEqual(["Action", "Drama"]);
    expect(after?.title).toBe("Breaking Bad");
    expect(after?.mediaType).toBe("tv");
    expect(after?.tmdbId).toBe(1396);
    expect(after?.userStatus).toBe("watching");
    expect(after?.rating).toBe(7);
    expect(after?.favorite).toBe(true);
    expect(after?.createdAt).toEqual(before?.createdAt);
    expect(after?.updatedAt.getTime()).toBeGreaterThan(
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

  it("removes collection memberships when the media is deleted", async () => {
    const now = new Date("2026-07-15T00:00:00.000Z");

    const removedShowId = await mediaRepository.add(createTvShow());
    const otherShowId = await mediaRepository.add(
      createTvShow({ title: "Other Show" }),
    );

    const collectionId = (await db.collections.add({
      name: "Favourites",
      createdAt: now,
      updatedAt: now,
    }))!;

    const otherCollectionId = (await db.collections.add({
      name: "Survivor",
      createdAt: now,
      updatedAt: now,
    }))!;

    await db.collectionMedia.add({
      collectionId,
      mediaId: removedShowId,
      createdAt: now,
    });

    await db.collectionMedia.add({
      collectionId,
      mediaId: otherShowId,
      createdAt: now,
    });

    await db.collectionMedia.add({
      collectionId: otherCollectionId,
      mediaId: removedShowId,
      createdAt: now,
    });

    await mediaRepository.remove(removedShowId);

    // Memberships referencing the deleted media are gone; the rest remain.
    expect(
      await db.collectionMedia
        .where("[collectionId+mediaId]")
        .equals([collectionId, removedShowId])
        .count(),
    ).toBe(0);
    expect(
      await db.collectionMedia
        .where("[collectionId+mediaId]")
        .equals([otherCollectionId, removedShowId])
        .count(),
    ).toBe(0);
    expect(
      await db.collectionMedia
        .where("[collectionId+mediaId]")
        .equals([collectionId, otherShowId])
        .count(),
    ).toBe(1);

    // Collections themselves are never deleted by a media removal.
    expect(await db.collections.count()).toBe(2);
  });

  it("fetches media by ids, skipping missing records", async () => {
    const firstShowId = await mediaRepository.add(createTvShow());
    const secondShowId = await mediaRepository.add(
      createTvShow({ title: "Other Show" }),
    );

    const result = await mediaRepository.getByIds([
      secondShowId,
      99999,
      firstShowId,
    ]);

    expect(result.map((media) => media.id)).toEqual([
      secondShowId,
      firstShowId,
    ]);
    expect(result.map((media) => media.title)).toEqual([
      "Other Show",
      "Breaking Bad",
    ]);
  });

  it("returns an empty array when asked for no ids", async () => {
    expect(await mediaRepository.getByIds([])).toEqual([]);
  });
});

describe("mediaRepository bulk status updates", () => {
  it("sets the watch status for many records and reports counts", async () => {
    const firstId = await mediaRepository.add(
      createTvShow({ userStatus: "watching" }),
    );
    const secondId = await mediaRepository.add(
      createTvShow({ title: "Other Show", userStatus: "completed" }),
    );
    const movieId = await mediaRepository.add({
      ...createTvShow({ title: "A Movie", mediaType: "movie" }),
      userStatus: "planned",
    });

    const result = await mediaRepository.setUserStatusMany(
      [firstId, secondId, movieId],
      "completed",
    );

    expect(result).toMatchObject({
      updatedCount: 2,
      unchangedCount: 1,
      missingCount: 0,
    });

    const [first, second, movie] = await Promise.all([
      mediaRepository.getById(firstId),
      mediaRepository.getById(secondId),
      mediaRepository.getById(movieId),
    ]);

    expect(first?.userStatus).toBe("completed");
    expect(second?.userStatus).toBe("completed");
    expect(movie?.userStatus).toBe("completed");
  });

  it("skips records already at the target status without refreshing updatedAt", async () => {
    const originalUpdatedAt = new Date("2026-07-14T00:00:00.000Z");
    const watchingId = await mediaRepository.add(
      createTvShow({ userStatus: "watching", updatedAt: originalUpdatedAt }),
    );
    const completedId = await mediaRepository.add(
      createTvShow({
        title: "Done",
        userStatus: "completed",
        updatedAt: originalUpdatedAt,
      }),
    );

    const result = await mediaRepository.setUserStatusMany(
      [watchingId, completedId],
      "completed",
    );

    expect(result.updatedCount).toBe(1);
    expect(result.unchangedCount).toBe(1);

    const completed = await mediaRepository.getById(completedId);
    expect(completed?.updatedAt).toEqual(originalUpdatedAt);
  });

  it("counts missing ids without throwing", async () => {
    const id = await mediaRepository.add(createTvShow());

    const result = await mediaRepository.setUserStatusMany(
      [id, 99999],
      "dropped",
    );

    expect(result.missingCount).toBe(1);
    expect(result.updatedCount).toBe(1);
  });

  it("changes only userStatus and updatedAt, preserving all other fields", async () => {
    const id = await mediaRepository.add(
      createTvShow({
        rating: 8,
        favorite: true,
        notes: "Great show",
        genres: ["Drama"],
      }),
    );

    const before = await mediaRepository.getById(id);

    await mediaRepository.setUserStatusMany([id], "on-hold");

    const after = await mediaRepository.getById(id);

    expect(after?.userStatus).toBe("on-hold");
    expect(after?.rating).toBe(8);
    expect(after?.favorite).toBe(true);
    expect(after?.notes).toBe("Great show");
    expect(after?.genres).toEqual(["Drama"]);
    expect(after?.title).toBe("Breaking Bad");
    expect(after?.createdAt).toEqual(before?.createdAt);
    expect(after?.updatedAt.getTime()).toBeGreaterThan(
      before!.updatedAt.getTime(),
    );
  });

  it("introduces no episode or watch-history side effects", async () => {
    const showId = await mediaRepository.add(createTvShow());
    const episodeId = await episodeRepository.add(createEpisode(showId));
    await episodeRepository.markWatched(episodeId);

    await mediaRepository.setUserStatusMany([showId], "completed");

    const episodes = await db.episodes.where("showId").equals(showId).toArray();
    const history = await db.watchHistory.toArray();

    expect(episodes).toHaveLength(1);
    expect(episodes[0]?.watched).toBe(true);
    expect(history).toHaveLength(1);
  });
});

describe("mediaRepository bulk favorite updates", () => {
  it("favorites records that are not already favorite", async () => {
    const undefinedId = await mediaRepository.add(createTvShow());
    const falseId = await mediaRepository.add(
      createTvShow({ title: "Not Fav", favorite: false }),
    );
    const trueId = await mediaRepository.add(
      createTvShow({ title: "Already Fav", favorite: true }),
    );

    const result = await mediaRepository.setFavoriteMany(
      [undefinedId, falseId, trueId],
      true,
    );

    expect(result.updatedCount).toBe(2);
    expect(result.unchangedCount).toBe(1);

    expect((await mediaRepository.getById(undefinedId))?.favorite).toBe(true);
    expect((await mediaRepository.getById(falseId))?.favorite).toBe(true);
    expect((await mediaRepository.getById(trueId))?.favorite).toBe(true);
  });

  it("unfavorites only records that are explicitly true", async () => {
    const trueId = await mediaRepository.add(createTvShow({ favorite: true }));
    const undefinedId = await mediaRepository.add(
      createTvShow({ title: "Undefined" }),
    );
    const falseId = await mediaRepository.add(
      createTvShow({ title: "Already False", favorite: false }),
    );

    const result = await mediaRepository.setFavoriteMany(
      [trueId, undefinedId, falseId],
      false,
    );

    expect(result.updatedCount).toBe(1);
    expect(result.unchangedCount).toBe(2);

    expect((await mediaRepository.getById(trueId))?.favorite).toBe(false);
    expect(
      (await mediaRepository.getById(undefinedId))?.favorite,
    ).toBeUndefined();
    expect((await mediaRepository.getById(falseId))?.favorite).toBe(false);
  });
});

describe("mediaRepository bulk removal", () => {
  it("removes many records with the same cascade as single remove", async () => {
    const showId = await mediaRepository.add(createTvShow());
    const otherShowId = await mediaRepository.add(
      createTvShow({ title: "Keeper" }),
    );
    const movieId = await mediaRepository.add({
      ...createTvShow({ title: "A Movie", mediaType: "movie" }),
    });

    const episodeId = await episodeRepository.add(createEpisode(showId));
    await episodeRepository.markWatched(episodeId);

    const collectionId = (await db.collections.add({
      name: "Favourites",
      createdAt: new Date("2026-07-15T00:00:00.000Z"),
      updatedAt: new Date("2026-07-15T00:00:00.000Z"),
    }))!;

    await db.collectionMedia.add({
      collectionId,
      mediaId: showId,
      createdAt: new Date("2026-07-15T00:00:00.000Z"),
    });
    await db.collectionMedia.add({
      collectionId,
      mediaId: otherShowId,
      createdAt: new Date("2026-07-15T00:00:00.000Z"),
    });

    const result = await mediaRepository.removeMany([showId, movieId]);

    expect(result.removedCount).toBe(2);
    expect(result.missingCount).toBe(0);
    expect(result.removedEpisodeCount).toBe(1);
    expect(result.removedWatchEventCount).toBe(1);
    expect(result.removedMembershipCount).toBe(1);

    expect(await mediaRepository.getById(showId)).toBeUndefined();
    expect(await mediaRepository.getById(movieId)).toBeUndefined();
    expect(await mediaRepository.getById(otherShowId)).toBeDefined();

    const remainingEpisodes = await db.episodes
      .where("showId")
      .equals(showId)
      .toArray();
    expect(remainingEpisodes).toHaveLength(0);

    const remainingHistory = await db.watchHistory
      .where("episodeId")
      .equals(episodeId)
      .toArray();
    expect(remainingHistory).toHaveLength(0);

    const remainingMemberships = await db.collectionMedia
      .where("collectionId")
      .equals(collectionId)
      .toArray();
    expect(remainingMemberships).toHaveLength(1);
    expect(remainingMemberships[0]?.mediaId).toBe(otherShowId);
  });

  it("skips missing ids and counts them", async () => {
    const id = await mediaRepository.add(createTvShow());

    const result = await mediaRepository.removeMany([id, 88888]);

    expect(result.removedCount).toBe(1);
    expect(result.missingCount).toBe(1);
  });

  it("returns zeroed counters for an empty id list", async () => {
    const result = await mediaRepository.removeMany([]);

    expect(result).toEqual({
      removedCount: 0,
      missingCount: 0,
      removedEpisodeCount: 0,
      removedWatchEventCount: 0,
      removedMembershipCount: 0,
    });
  });

  it("rolls back all deletions when a failure occurs mid-batch", async () => {
    const firstId = await mediaRepository.add(createTvShow());
    const secondId = await mediaRepository.add(
      createTvShow({ title: "Second" }),
    );

    const originalDelete = db.media.delete.bind(db.media);
    let callCount = 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.media as any).delete = async (id: number) => {
      callCount++;
      if (callCount === 1) {
        throw new Error("Simulated mid-batch failure");
      }
      return originalDelete(id);
    };

    await expect(mediaRepository.removeMany([firstId, secondId])).rejects.toThrow(
      "Simulated mid-batch failure",
    );

    db.media.delete = originalDelete;

    // Both records must still exist — the transaction rolled back.
    expect(await mediaRepository.getById(firstId)).toBeDefined();
    expect(await mediaRepository.getById(secondId)).toBeDefined();
  });
});
