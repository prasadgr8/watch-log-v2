import JSZip from "jszip";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "../../../database/db";
import {
  episodeRepository,
  mediaRepository,
  watchHistoryRepository,
} from "../../../database/repositories";
import { tmdbSearchService } from "../../../services/tmdb";
import { tmdbTvService } from "../../../services/tmdb/tmdbTvService";
import { executeTvTimeImport } from "./tvTimeImportService";

interface TvTimeZipOptions {
  timeZone?: string;
  seenCreatedAt?: string;
}

function createTvTimeZip(
  options: TvTimeZipOptions = {},
): Promise<Blob> {
  const {
    timeZone = "Asia/Kolkata",
    seenCreatedAt = "2020-01-01 00:00:00",
  } = options;

  const zip = new JSZip();

  zip.file(
    "user.csv",
    [
      "user_id,user_name,user_email,timezone",
      `1,Test User,test@example.com,${timeZone}`,
    ].join("\n"),
  );

  zip.file(
    "followed_tv_show.csv",
    [
      "tv_show_id,tv_show_name,followed",
      "tvtime-breaking-bad,Breaking Bad (2008),true",
    ].join("\n"),
  );

  zip.file(
    "user_tv_show_data.csv",
    [
      "tv_show_id,tv_show_name,watch_status",
      "tvtime-breaking-bad,Breaking Bad (2008),watching",
    ].join("\n"),
  );

  zip.file(
    "seen_episode_source.csv",
    [
      "tv_show_name,episode_season_number,episode_number,created_at",
      `Breaking Bad (2008),1,1,${seenCreatedAt}`,
    ].join("\n"),
  );
  zip.file(
    "seen_episode_latest.csv",
    [
      "tv_show_name,episode_season_number,episode_number,seen_date",
      "Breaking Bad (2008),1,1,2020-01-01 00:00:00",
    ].join("\n"),
  );

  zip.file(
    "show_seen_episode_latest.csv",
    [
      "tv_show_name,episode_season_number,episode_number,seen_date",
      "Breaking Bad (2008),1,1,2020-01-01 00:00:00",
    ].join("\n"),
  );

  return zip.generateAsync({ type: "blob" });
}

function createTmdbTvResult() {
  return {
    id: 1396,
    overview: "A chemistry teacher starts making meth.",
    poster_path: "/breaking-bad.jpg",
    backdrop_path: "/breaking-bad-backdrop.jpg",
    popularity: 100,
    vote_average: 9,
    vote_count: 10000,
    media_type: "tv" as const,
    name: "Breaking Bad",
    original_name: "Breaking Bad",
    first_air_date: "2008-01-20",
  };
}

function createTmdbTvDetails() {
  return {
    id: 1396,
    name: "Breaking Bad",
    overview: "A chemistry teacher starts making meth.",
    poster_path: "/breaking-bad.jpg",
    backdrop_path: "/breaking-bad-backdrop.jpg",
    first_air_date: "2008-01-20",
    last_air_date: "2013-09-29",
    number_of_episodes: 62,
    number_of_seasons: 5,
    status: "Ended",
    seasons: [
      {
        id: 3572,
        name: "Season 1",
        overview: "",
        poster_path: null,
        season_number: 1,
        air_date: "2008-01-20",
        episode_count: 1,
        vote_average: 0,
      },
    ],
  };
}

function createTmdbTvSeasonDetails() {
  return {
    _id: "63354",
    air_date: "2008-01-20",
    name: "Season 1",
    overview: "Season 1 of Breaking Bad.",
    id: 3572,
    poster_path: null,
    season_number: 1,
    vote_average: 8.5,
    episodes: [
      {
        air_date: "2008-01-20",
        episode_number: 1,
        id: 62111,
        name: "Pilot",
        overview: "A chemistry teacher starts cooking meth.",
        runtime: 58,
        season_number: 1,
        show_id: 1396,
        still_path: null,
        vote_average: 8.2,
        vote_count: 500,
      },
    ],
  };
}

describe("executeTvTimeImport", () => {
  beforeEach(async () => {
    await db.media.clear();
    await db.episodes.clear();
    await db.watchHistory.clear();
    vi.restoreAllMocks();
  });

  it("rolls back a newly imported show when episode synchronization fails", async () => {
    vi.spyOn(tmdbSearchService, "searchTvShows").mockResolvedValue({
      page: 1,
      results: [createTmdbTvResult()],
      total_pages: 1,
      total_results: 1,
    });

    vi.spyOn(tmdbTvService, "getTvDetails").mockResolvedValue(
      createTmdbTvDetails(),
    );

    vi.spyOn(tmdbTvService, "getSeasonDetails").mockRejectedValue(
      new Error("Simulated TMDB season failure"),
    );

    const blob = await createTvTimeZip();
    const file = new File([blob], "tvtime-export.zip");

    const result = await executeTvTimeImport(file);

    expect(result.failedShows).toBe(1);
    expect(result.importedShows).toBe(0);

    expect(await mediaRepository.getByTmdbId(1396, "tv")).toBeUndefined();

    expect(await db.media.count()).toBe(0);
    expect(await db.episodes.count()).toBe(0);

    expect(
      await episodeRepository.getByShowSeasonAndEpisode(1, 1, 1),
    ).toBeUndefined();
  });

  it("uses the timezone from user.csv when importing watched dates", async () => {
    vi.spyOn(tmdbSearchService, "searchTvShows").mockResolvedValue({
      page: 1,
      results: [createTmdbTvResult()],
      total_pages: 1,
      total_results: 1,
    });

    vi.spyOn(tmdbTvService, "getTvDetails").mockResolvedValue(
      createTmdbTvDetails(),
    );

    vi.spyOn(tmdbTvService, "getSeasonDetails").mockResolvedValue(
      createTmdbTvSeasonDetails(),
    );

    const blob = await createTvTimeZip({
      timeZone: "America/New_York",
      seenCreatedAt: "2021-01-14 10:00:00",
    });
    const file = new File([blob], "tvtime-export.zip");

    const result = await executeTvTimeImport(file);

    expect(result.importedShows).toBe(1);
    expect(result.failedShows).toBe(0);
    expect(result.importedWatchedEpisodes).toBe(1);
    expect(result.skippedWatchedEpisodes).toBe(0);
    expect(result.failedWatchedEpisodes).toBe(0);

    const media = await mediaRepository.getByTmdbId(1396, "tv");

    expect(media?.id).toBeDefined();

    const episode = media?.id
      ? await episodeRepository.getByShowSeasonAndEpisode(media.id, 1, 1)
      : undefined;

    expect(episode?.watched).toBe(true);
    expect(episode?.watchedAt?.toISOString()).toBe(
      "2021-01-14T15:00:00.000Z",
    );

    const historyEvent = episode?.id
      ? await watchHistoryRepository.getLatestByEpisode(episode.id)
      : undefined;

    expect(historyEvent?.source).toBe("import");
    expect(historyEvent?.watchedAt.toISOString()).toBe(
      "2021-01-14T15:00:00.000Z",
    );
  });
});
