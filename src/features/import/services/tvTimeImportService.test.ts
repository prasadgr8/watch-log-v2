import JSZip from "jszip";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "../../../database/db";
import {
  episodeRepository,
  mediaRepository,
} from "../../../database/repositories";
import { tmdbSearchService } from "../../../services/tmdb";
import { tmdbTvService } from "../../../services/tmdb/tmdbTvService";
import { executeTvTimeImport } from "./tvTimeImportService";

function createTvTimeZip(): Promise<Blob> {
  const zip = new JSZip();

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
      "tv_show_name,episode_season_number,episode_number,seen_date",
      "Breaking Bad (2008),1,1,2020-01-01 00:00:00",
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

    vi.spyOn(tmdbTvService, "getTvDetails").mockResolvedValue({
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
          id: 1,
          name: "Season 1",
          overview: "",
          poster_path: null,
          season_number: 1,
          air_date: "2008-01-20",
          episode_count: 1,
          vote_average: 0,
        },
      ],
    });

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
});
