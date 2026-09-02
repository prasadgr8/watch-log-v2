import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "../../../database/db";

import {
  episodeRepository,
  mediaRepository,
} from "../../../database/repositories";

import { tmdbTvService } from "../../../services/tmdb";

import type { Episode, TVShow } from "../../../types";

import {
  deriveSeasonSummaries,
  loadSeasonEpisodes,
  loadTvShowDetails,
  type SeasonEpisodesResult,
  type TvShowDetailsResult,
} from "./tvShowDetailsService";

const tmdbDetails = {
  id: 1399,
  name: "Test Show",
  overview: "Test overview.",
  poster_path: "/poster.jpg",
  backdrop_path: null,
  first_air_date: "2011-04-17",
  last_air_date: "2011-06-01",
  number_of_episodes: 2,
  number_of_seasons: 1,
  status: "Ended",
  seasons: [
    {
      air_date: "2011-04-17",
      episode_count: 2,
      id: 1,
      name: "Season 1",
      overview: "",
      poster_path: null,
      season_number: 1,
      vote_average: 8.5,
    },
  ],
};

const tmdbSeason = {
  _id: "tv-1399-season-1",
  air_date: "2011-04-17",
  episodes: [
    {
      air_date: "2011-04-17",
      episode_number: 1,
      episode_type: "standard",
      id: 62085,
      name: "Winter Is Coming",
      overview: "Series premiere.",
      production_code: "101",
      runtime: 62,
      season_number: 1,
      show_id: 1399,
      still_path: "/still-1.jpg",
      vote_average: 8.2,
      vote_count: 100,
    },
    {
      air_date: "2011-04-24",
      episode_number: 2,
      episode_type: "standard",
      id: 62086,
      name: "The Kingsroad",
      overview: "Episode two.",
      production_code: "102",
      runtime: 56,
      season_number: 1,
      show_id: 1399,
      still_path: "/still-2.jpg",
      vote_average: 8.0,
      vote_count: 90,
    },
  ],
  name: "Season 1",
  overview: "",
  id: 3582,
  poster_path: null,
  season_number: 1,
  vote_average: 8.4,
};

function createShow(overrides: Partial<TVShow> = {}): TVShow {
  const now = new Date("2026-07-15T00:00:00.000Z");

  return {
    mediaType: "tv",
    title: "Test Show",
    tmdbId: 1399,
    userStatus: "watching",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createEpisode(
  showId: number,
  seasonNumber: number,
  episodeNumber: number,
  watched = false,
): Episode {
  const now = new Date("2026-07-15T00:00:00.000Z");

  return {
    showId,
    seasonNumber,
    episodeNumber,
    title: `Episode ${episodeNumber}`,
    watched,
    createdAt: now,
    updatedAt: now,
  };
}

describe("loadTvShowDetails", () => {
  beforeEach(async () => {
    await db.media.clear();
    await db.episodes.clear();
    await db.watchHistory.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders local media and derived season summaries when offline", async () => {
    const mediaId = await mediaRepository.add(createShow());
    await episodeRepository.add(createEpisode(mediaId, 1, 1, true));
    await episodeRepository.add(createEpisode(mediaId, 1, 2, false));
    await episodeRepository.add(createEpisode(mediaId, 2, 1, false));

    const getTvDetailsSpy = vi.spyOn(tmdbTvService, "getTvDetails");

    const result = await loadTvShowDetails(mediaId, {
      canUseNetwork: () => false,
    });

    expect(getTvDetailsSpy).not.toHaveBeenCalled();
    expect(result.media.id).toBe(mediaId);
    expect(result.tvDetails).toBeNull();
    expect(result.fromLocal).toBe(true);
    expect(result.seasonSummaries).toEqual([
      {
        seasonNumber: 1,
        name: "Season 1",
        episodeCount: 2,
        watchedEpisodeCount: 1,
      },
      {
        seasonNumber: 2,
        name: "Season 2",
        episodeCount: 1,
        watchedEpisodeCount: 0,
      },
    ]);
  });

  it("renders local data first and enriches with TMDB details when online", async () => {
    const mediaId = await mediaRepository.add(createShow());
    await episodeRepository.add(createEpisode(mediaId, 1, 1, false));

    const localCallbackResults: TvShowDetailsResult[] = [];

    vi.spyOn(tmdbTvService, "getTvDetails").mockResolvedValue(tmdbDetails);

    const result = await loadTvShowDetails(mediaId, {
      canUseNetwork: () => true,
      onLocalData: (localResult) => {
        localCallbackResults.push(localResult);
      },
    });

    expect(localCallbackResults).toHaveLength(1);
    expect(localCallbackResults[0].tvDetails).toBeNull();
    expect(localCallbackResults[0].seasonSummaries).toEqual([
      {
        seasonNumber: 1,
        name: "Season 1",
        episodeCount: 1,
        watchedEpisodeCount: 0,
      },
    ]);
    expect(result.tvDetails).toEqual(tmdbDetails);
    expect(result.fromLocal).toBe(false);
  });

  it("falls back to local data when the TMDB refresh fails", async () => {
    const mediaId = await mediaRepository.add(createShow());

    vi.spyOn(tmdbTvService, "getTvDetails").mockRejectedValue(
      new Error("Failed to fetch"),
    );

    const result = await loadTvShowDetails(mediaId, {
      canUseNetwork: () => true,
    });

    expect(result.tvDetails).toBeNull();
    expect(result.fromLocal).toBe(true);
    expect(result.media.id).toBe(mediaId);
  });

  it("skips TMDB enrichment when the media has no TMDB ID", async () => {
    const mediaId = await mediaRepository.add(createShow({ tmdbId: undefined }));

    const getTvDetailsSpy = vi.spyOn(tmdbTvService, "getTvDetails");

    const result = await loadTvShowDetails(mediaId, {
      canUseNetwork: () => true,
    });

    expect(getTvDetailsSpy).not.toHaveBeenCalled();
    expect(result.fromLocal).toBe(true);
  });

  it("throws when the media does not exist in the Library", async () => {
    await expect(
      loadTvShowDetails(9999, { canUseNetwork: () => false }),
    ).rejects.toThrow("TV show was not found in the Library.");
  });
});

describe("deriveSeasonSummaries", () => {
  it("sorts seasons numerically and names season 0 as Specials", () => {
    const summaries = deriveSeasonSummaries([
      createEpisode(1, 1, 1, false),
      createEpisode(1, 0, 1, false),
    ]);

    expect(summaries.map((summary) => summary.name)).toEqual([
      "Specials",
      "Season 1",
    ]);
  });
});

describe("loadSeasonEpisodes", () => {
  beforeEach(async () => {
    await db.media.clear();
    await db.episodes.clear();
    await db.watchHistory.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns locally persisted episodes without contacting TMDB when offline", async () => {
    const mediaId = await mediaRepository.add(createShow());
    const localEpisodeId = await episodeRepository.add(
      createEpisode(mediaId, 1, 1, true),
    );

    const getSeasonDetailsSpy = vi.spyOn(tmdbTvService, "getSeasonDetails");

    const result = await loadSeasonEpisodes(mediaId, 1, {
      canUseNetwork: () => false,
    });

    expect(getSeasonDetailsSpy).not.toHaveBeenCalled();
    expect(result.fromLocal).toBe(true);
    expect(result.needsOnlineNotice).toBe(false);
    expect(result.episodes).toHaveLength(1);
    expect(result.episodes[0].id).toBe(localEpisodeId);
    expect(result.episodes[0].watched).toBe(true);
  });

  it("renders local episodes immediately and refreshes them from TMDB when online", async () => {
    const mediaId = await mediaRepository.add(createShow());
    const localEpisodeId = await episodeRepository.add(
      createEpisode(mediaId, 1, 1, true),
    );

    const getSeasonDetailsSpy = vi
      .spyOn(tmdbTvService, "getSeasonDetails")
      .mockResolvedValue(tmdbSeason);

    const localResults: SeasonEpisodesResult[] = [];

    const result = await loadSeasonEpisodes(mediaId, 1, {
      canUseNetwork: () => true,
      onLocalData: (localResult) => {
        localResults.push(localResult);
      },
    });

    expect(getSeasonDetailsSpy).toHaveBeenCalledTimes(1);
    expect(getSeasonDetailsSpy).toHaveBeenCalledWith(1399, 1);

    expect(localResults).toHaveLength(1);
    expect(localResults[0].fromLocal).toBe(true);
    expect(localResults[0].needsOnlineNotice).toBe(false);
    expect(localResults[0].episodes).toHaveLength(1);
    expect(localResults[0].episodes[0].id).toBe(localEpisodeId);
    expect(localResults[0].episodes[0].watched).toBe(true);

    expect(result.fromLocal).toBe(false);
    expect(result.needsOnlineNotice).toBe(false);
    expect(result.episodes.map((episode) => episode.episodeNumber)).toEqual([
      1,
      2,
    ]);
    expect(result.episodes[0].id).toBe(localEpisodeId);
    expect(result.episodes[0].watched).toBe(true);

    const persistedEpisodes = await episodeRepository.getByShowSeason(
      mediaId,
      1,
    );

    expect(persistedEpisodes).toHaveLength(2);
    expect(persistedEpisodes[0].id).toBe(localEpisodeId);
    expect(persistedEpisodes[0].watched).toBe(true);
  });

  it("asks to go online when a season has no saved episodes and the user is offline", async () => {
    const mediaId = await mediaRepository.add(createShow());

    const getSeasonDetailsSpy = vi.spyOn(tmdbTvService, "getSeasonDetails");

    const result = await loadSeasonEpisodes(mediaId, 1, {
      canUseNetwork: () => false,
    });

    expect(getSeasonDetailsSpy).not.toHaveBeenCalled();
    expect(result.episodes).toEqual([]);
    expect(result.needsOnlineNotice).toBe(true);
  });

  it("synchronizes an empty season with TMDB when online", async () => {
    const mediaId = await mediaRepository.add(createShow());

    const getSeasonDetailsSpy = vi
      .spyOn(tmdbTvService, "getSeasonDetails")
      .mockResolvedValue(tmdbSeason);

    const result = await loadSeasonEpisodes(mediaId, 1, {
      canUseNetwork: () => true,
    });

    expect(getSeasonDetailsSpy).toHaveBeenCalledTimes(1);
    expect(result.fromLocal).toBe(false);
    expect(result.needsOnlineNotice).toBe(false);
    expect(result.episodes.map((episode) => episode.episodeNumber)).toEqual([
      1,
      2,
    ]);

    const persistedEpisodes = await episodeRepository.getByShowSeason(
      mediaId,
      1,
    );

    expect(persistedEpisodes).toHaveLength(2);
  });

  it("retains local episodes when the TMDB refresh fails", async () => {
    const mediaId = await mediaRepository.add(createShow());
    const localEpisodeId = await episodeRepository.add(
      createEpisode(mediaId, 1, 1, true),
    );

    const getSeasonDetailsSpy = vi
      .spyOn(tmdbTvService, "getSeasonDetails")
      .mockRejectedValue(new Error("Failed to fetch"));

    const localResults: SeasonEpisodesResult[] = [];

    const result = await loadSeasonEpisodes(mediaId, 1, {
      canUseNetwork: () => true,
      onLocalData: (localResult) => {
        localResults.push(localResult);
      },
    });

    expect(getSeasonDetailsSpy).toHaveBeenCalledTimes(1);

    expect(localResults).toHaveLength(1);
    expect(localResults[0].fromLocal).toBe(true);

    expect(result.fromLocal).toBe(true);
    expect(result.needsOnlineNotice).toBe(false);
    expect(result.episodes).toHaveLength(1);
    expect(result.episodes[0].id).toBe(localEpisodeId);
    expect(result.episodes[0].watched).toBe(true);

    const persistedEpisodes = await episodeRepository.getByShowSeason(
      mediaId,
      1,
    );

    expect(persistedEpisodes).toHaveLength(1);
    expect(persistedEpisodes[0].watched).toBe(true);
  });

  it("reports the season as needing online access when TMDB sync fails", async () => {
    const mediaId = await mediaRepository.add(createShow());

    vi.spyOn(tmdbTvService, "getSeasonDetails").mockRejectedValue(
      new Error("Failed to fetch"),
    );

    const result = await loadSeasonEpisodes(mediaId, 1, {
      canUseNetwork: () => true,
    });

    expect(result.episodes).toEqual([]);
    expect(result.fromLocal).toBe(false);
    expect(result.needsOnlineNotice).toBe(true);
  });
});