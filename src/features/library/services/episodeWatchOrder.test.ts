import { describe, expect, it } from "vitest";

import type { PersistedEpisode } from "../../../types";

import { getUnwatchedPreviousInSeason } from "./episodeWatchOrder";

function createEpisode(
  overrides: Partial<PersistedEpisode> = {},
): PersistedEpisode {
  const now = new Date("2026-07-15T00:00:00.000Z");

  return {
    id: 1,
    showId: 1,
    tmdbId: 62085,
    seasonNumber: 1,
    episodeNumber: 1,
    title: "Pilot",
    watched: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("getUnwatchedPreviousInSeason", () => {
  it("returns an empty list for an empty episode array", () => {
    const result = getUnwatchedPreviousInSeason([], 5);

    expect(result).toEqual([]);
  });

  it("returns an empty list when the target is the first episode", () => {
    const result = getUnwatchedPreviousInSeason(
      [
        createEpisode({ id: 1, episodeNumber: 1 }),
        createEpisode({ id: 2, episodeNumber: 2 }),
      ],
      1,
    );

    expect(result).toEqual([]);
  });

  it("returns an empty list when all previous episodes are watched", () => {
    const result = getUnwatchedPreviousInSeason(
      [
        createEpisode({
          id: 1,
          episodeNumber: 1,
          watched: true,
          watchedAt: new Date("2026-07-10T18:30:00.000Z"),
        }),
        createEpisode({
          id: 2,
          episodeNumber: 2,
          watched: true,
          watchedAt: new Date("2026-07-11T18:30:00.000Z"),
        }),
        createEpisode({ id: 3, episodeNumber: 3 }),
      ],
      3,
    );

    expect(result).toEqual([]);
  });

  it("returns only the unwatched episodes among mixed previous states", () => {
    const secondEpisode = createEpisode({ id: 2, episodeNumber: 2 });
    const fourthEpisode = createEpisode({ id: 4, episodeNumber: 4 });

    const result = getUnwatchedPreviousInSeason(
      [
        createEpisode({
          id: 1,
          episodeNumber: 1,
          watched: true,
          watchedAt: new Date("2026-07-10T18:30:00.000Z"),
        }),
        secondEpisode,
        createEpisode({
          id: 3,
          episodeNumber: 3,
          watched: true,
          watchedAt: new Date("2026-07-12T18:30:00.000Z"),
        }),
        fourthEpisode,
        createEpisode({ id: 5, episodeNumber: 5 }),
      ],
      5,
    );

    expect(result).toEqual([secondEpisode, fourthEpisode]);
  });

  it("returns multiple unwatched previous episodes", () => {
    const firstEpisode = createEpisode({ id: 1, episodeNumber: 1 });
    const thirdEpisode = createEpisode({ id: 3, episodeNumber: 3 });
    const fourthEpisode = createEpisode({ id: 4, episodeNumber: 4 });

    const result = getUnwatchedPreviousInSeason(
      [firstEpisode, thirdEpisode, fourthEpisode],
      5,
    );

    expect(result).toHaveLength(3);
  });

  it("orders results ascending by episode number regardless of input order", () => {
    const result = getUnwatchedPreviousInSeason(
      [
        createEpisode({ id: 4, episodeNumber: 4 }),
        createEpisode({ id: 1, episodeNumber: 1 }),
        createEpisode({
          id: 3,
          episodeNumber: 3,
          watched: true,
          watchedAt: new Date("2026-07-11T18:30:00.000Z"),
        }),
        createEpisode({ id: 2, episodeNumber: 2 }),
      ],
      5,
    );

    expect(result.map((episode) => episode.episodeNumber)).toEqual([1, 2, 4]);
  });

  it("ignores missing episode numbers without inferring records", () => {
    const result = getUnwatchedPreviousInSeason(
      [
        createEpisode({ id: 2, episodeNumber: 2 }),
        createEpisode({ id: 4, episodeNumber: 4 }),
      ],
      5,
    );

    expect(result.map((episode) => episode.episodeNumber)).toEqual([2, 4]);
  });

  it("skips episode records without an ID", () => {
    const unpersistedEpisode = {
      ...createEpisode({ episodeNumber: 1, title: "Unpersisted pilot" }),
      id: undefined,
    } as unknown as PersistedEpisode;

    const persistedEpisode = createEpisode({ id: 2, episodeNumber: 2 });

    const result = getUnwatchedPreviousInSeason(
      [unpersistedEpisode, persistedEpisode],
      3,
    );

    expect(result).toEqual([persistedEpisode]);
  });

  it("works naturally for season 0 specials data", () => {
    const specialOne = createEpisode({
      id: 101,
      seasonNumber: 0,
      episodeNumber: 1,
      title: "Special",
    });

    const specialThree = createEpisode({
      id: 103,
      seasonNumber: 0,
      episodeNumber: 3,
      title: "Another Special",
    });

    const result = getUnwatchedPreviousInSeason(
      [specialOne, specialThree],
      4,
    );

    expect(result).toEqual([specialOne, specialThree]);
  });

  it("excludes episodes at or after the target episode number", () => {
    const result = getUnwatchedPreviousInSeason(
      [
        createEpisode({ id: 1, episodeNumber: 1 }),
        createEpisode({ id: 5, episodeNumber: 5 }),
        createEpisode({ id: 6, episodeNumber: 6 }),
      ],
      5,
    );

    expect(result.map((episode) => episode.id)).toEqual([1]);
  });
});
