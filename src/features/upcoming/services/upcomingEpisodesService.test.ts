import { describe, expect, it } from "vitest";

import {
  episodeRepository,
  mediaRepository,
} from "../../../database/repositories";

import type { Episode, Movie, TVShow } from "../../../types";

import { upcomingEpisodesService } from "./upcomingEpisodesService";

// Local noon on 2026-07-15: the Date constructor and getLocalDateString both
// use the local calendar, so these tests never depend on the machine's
// timezone or on the real current date.
const FIXED_NOW = new Date(2026, 6, 15, 12, 0);

function createTvShow(overrides: Partial<TVShow> = {}): TVShow {
  const now = new Date("2026-01-01T00:00:00.000Z");

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

function createMovie(overrides: Partial<Movie> = {}): Movie {
  const now = new Date("2026-01-01T00:00:00.000Z");

  return {
    tmdbId: 999,
    mediaType: "movie",
    title: "A Movie",
    userStatus: "planned",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createEpisode(
  showId: number,
  overrides: Partial<Episode> = {},
): Episode {
  const now = new Date("2026-01-01T00:00:00.000Z");

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

describe("upcomingEpisodesService", () => {
  it("returns an empty list for an empty library", async () => {
    expect(await upcomingEpisodesService.getItems(FIXED_NOW)).toEqual([]);
  });

  it("returns today, tomorrow, and future episodes sorted by air date", async () => {
    const showId = await mediaRepository.add(createTvShow());

    await episodeRepository.add(
      createEpisode(showId, {
        episodeNumber: 3,
        title: "Future Episode",
        airDate: "2026-07-20",
      }),
    );
    await episodeRepository.add(
      createEpisode(showId, {
        episodeNumber: 2,
        title: "Tomorrow Episode",
        airDate: "2026-07-16",
      }),
    );
    await episodeRepository.add(
      createEpisode(showId, {
        episodeNumber: 1,
        title: "Today Episode",
        airDate: "2026-07-15",
      }),
    );

    const items = await upcomingEpisodesService.getItems(FIXED_NOW);

    expect(items.map((item) => item.episode.title)).toEqual([
      "Today Episode",
      "Tomorrow Episode",
      "Future Episode",
    ]);
    expect(items.map((item) => item.relation)).toEqual([
      "today",
      "tomorrow",
      "future",
    ]);
    expect(items[0]?.airDate).toBe("2026-07-15");
    expect(items[0]?.media.id).toBe(showId);
  });

  it("excludes past episodes", async () => {
    const showId = await mediaRepository.add(createTvShow());

    await episodeRepository.add(
      createEpisode(showId, { airDate: "2026-07-14" }),
    );
    await episodeRepository.add(
      createEpisode(showId, { episodeNumber: 2, airDate: "2020-01-01" }),
    );

    expect(await upcomingEpisodesService.getItems(FIXED_NOW)).toEqual([]);
  });

  it("excludes episodes with missing, malformed, or impossible air dates", async () => {
    const showId = await mediaRepository.add(createTvShow());

    await episodeRepository.add(createEpisode(showId, { episodeNumber: 1 }));
    await episodeRepository.add(
      createEpisode(showId, { episodeNumber: 2, airDate: "2026-1-03" }),
    );
    await episodeRepository.add(
      createEpisode(showId, { episodeNumber: 3, airDate: "2026-04-31" }),
    );
    await episodeRepository.add(
      createEpisode(showId, { episodeNumber: 4, airDate: "2026-02-29" }),
    );

    expect(await upcomingEpisodesService.getItems(FIXED_NOW)).toEqual([]);
  });

  it("excludes Season 0 specials even with a future air date", async () => {
    const showId = await mediaRepository.add(createTvShow());

    await episodeRepository.add(
      createEpisode(showId, { seasonNumber: 0, airDate: "2026-07-16" }),
    );

    expect(await upcomingEpisodesService.getItems(FIXED_NOW)).toEqual([]);
  });

  it("includes watched future episodes", async () => {
    const showId = await mediaRepository.add(createTvShow());

    await episodeRepository.add(
      createEpisode(showId, {
        airDate: "2026-07-16",
        watched: true,
        watchedAt: new Date("2026-07-10T00:00:00.000Z"),
      }),
    );

    const items = await upcomingEpisodesService.getItems(FIXED_NOW);

    expect(items).toHaveLength(1);
    expect(items[0]?.episode.watched).toBe(true);
    expect(items[0]?.relation).toBe("tomorrow");
  });

  it("skips episodes whose show is missing or is not a TV show", async () => {
    const movieId = await mediaRepository.add(createMovie());

    await episodeRepository.add(
      createEpisode(424242, { airDate: "2026-07-16" }),
    );
    await episodeRepository.add(
      createEpisode(movieId, { airDate: "2026-07-16" }),
    );

    expect(await upcomingEpisodesService.getItems(FIXED_NOW)).toEqual([]);
  });

  it("orders same-date episodes by show title, then season, then episode", async () => {
    const betaShowId = await mediaRepository.add(
      createTvShow({ title: "Beta Show" }),
    );
    const alphaShowId = await mediaRepository.add(
      createTvShow({ tmdbId: 1402, title: "Alpha Show" }),
    );

    await episodeRepository.add(
      createEpisode(betaShowId, { episodeNumber: 2, airDate: "2026-07-16" }),
    );
    await episodeRepository.add(
      createEpisode(betaShowId, { episodeNumber: 1, airDate: "2026-07-16" }),
    );
    await episodeRepository.add(
      createEpisode(alphaShowId, {
        seasonNumber: 2,
        episodeNumber: 1,
        airDate: "2026-07-16",
      }),
    );

    const items = await upcomingEpisodesService.getItems(FIXED_NOW);

    expect(
      items.map((item) => [
        item.media.title,
        item.episode.seasonNumber,
        item.episode.episodeNumber,
      ]),
    ).toEqual([
      ["Alpha Show", 2, 1],
      ["Beta Show", 1, 1],
      ["Beta Show", 1, 2],
    ]);
  });

  it("returns no items when the library has no upcoming episodes", async () => {
    const showId = await mediaRepository.add(createTvShow());

    await episodeRepository.add(
      createEpisode(showId, {
        airDate: "2020-01-01",
        watched: true,
        watchedAt: new Date("2020-01-02T00:00:00.000Z"),
      }),
    );

    expect(await upcomingEpisodesService.getItems(FIXED_NOW)).toEqual([]);
  });

  it("uses the injected clock as the today boundary", async () => {
    const showId = await mediaRepository.add(createTvShow());

    await episodeRepository.add(
      createEpisode(showId, { airDate: "2026-07-16" }),
    );

    const fromJuly14 = await upcomingEpisodesService.getItems(
      new Date(2026, 6, 14, 12, 0),
    );
    const fromJuly15 = await upcomingEpisodesService.getItems(
      new Date(2026, 6, 15, 12, 0),
    );

    expect(fromJuly14[0]?.relation).toBe("future");
    expect(fromJuly15[0]?.relation).toBe("tomorrow");
  });

  it("never writes to the database", async () => {
    const showId = await mediaRepository.add(createTvShow());

    await episodeRepository.add(
      createEpisode(showId, { airDate: "2026-07-16" }),
    );

    const episodeCountBefore = await episodeRepository.count();
    const mediaCountBefore = await mediaRepository.count();

    await upcomingEpisodesService.getItems(FIXED_NOW);

    expect(await episodeRepository.count()).toBe(episodeCountBefore);
    expect(await mediaRepository.count()).toBe(mediaCountBefore);
  });
});
