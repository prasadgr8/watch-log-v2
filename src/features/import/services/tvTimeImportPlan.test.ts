import JSZip from "jszip";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "../../../database/db";
import {
  episodeRepository,
  importHistoryRepository,
  mediaRepository,
  watchHistoryRepository,
} from "../../../database/repositories";
import { tmdbSearchService } from "../../../services/tmdb";
import { tmdbTvService } from "../../../services/tmdb/tmdbTvService";
import type { TmdbTvSearchResult } from "../../../services/tmdb";
import type { ImportCandidate } from "../types/importCandidate";
import {
  resolveTvTimeMatch,
} from "./tvdbMatcher";
import {
  applyImportResolutions,
  buildTvTimeImportPlan,
  executeTvTimeImport,
  executeTvTimeImportPlan,
} from "./tvTimeImportService";
import type { TvTimeImportPlan } from "../types/tvTimeImportPlan";

interface TvTimeTrackingEpisodeRow {
  sId: string;
  title: string;
  season: number;
  episode: number;
  createdAt: string;
  bulkType?: string;
  rewatchCount?: number;
}

interface TvTimeZipOptions {
  timeZone?: string;
  seenCreatedAt?: string;
  shows?: Array<{ id: string; title: string }>;
  seenEpisodes?: Array<{ title: string; season: number; episode: number }>;
  trackingEpisodes?: TvTimeTrackingEpisodeRow[];
}

function createTvTimeZip(options: TvTimeZipOptions = {}): Promise<Blob> {
  const timeZone = options.timeZone ?? "Asia/Kolkata";
  const seenCreatedAt = options.seenCreatedAt ?? "2020-01-01 00:00:00";

  const shows = options.shows ?? [
    { id: "tvtime-breaking-bad", title: "Breaking Bad (2008)" },
  ];

  const seenEpisodes = options.seenEpisodes ?? [
    { title: "Breaking Bad (2008)", season: 1, episode: 1 },
  ];

  const zip = new JSZip();

  zip.file(
    "user.csv",
    `user_id,user_name,user_email,timezone\n1,Test User,test@example.com,${timeZone}`,
  );
  zip.file(
    "followed_tv_show.csv",
    [
      "tv_show_id,tv_show_name,followed",
      ...shows.map((show) => `${show.id},${show.title},true`),
    ].join("\n"),
  );
  zip.file(
    "user_tv_show_data.csv",
    [
      "tv_show_id,tv_show_name,watch_status",
      ...shows.map((show) => `${show.id},${show.title},watching`),
    ].join("\n"),
  );
  zip.file(
    "seen_episode_source.csv",
    [
      "tv_show_name,episode_season_number,episode_number,created_at",
      ...seenEpisodes.map(
        (episode) =>
          `${episode.title},${episode.season},${episode.episode},${seenCreatedAt}`,
      ),
    ].join("\n"),
  );

  if (options.trackingEpisodes) {
    zip.file(
      "tracking-prod-records-v2.csv",
      [
        "key,series_name,s_id,episode_id,ep_id,season_number,episode_number,created_at,updated_at,rewatch_count,bulk_type",
        ...options.trackingEpisodes.map((row, index) =>
          [
            `watch-episode-${index + 1}`,
            row.title,
            row.sId,
            `ep-${index + 1}`,
            `e-${index + 1}`,
            row.season,
            row.episode,
            row.createdAt,
            row.createdAt,
            row.rewatchCount ?? 0,
            row.bulkType ?? "",
          ].join(","),
        ),
      ].join("\n"),
    );
  }
  zip.file(
    "seen_episode_latest.csv",
    "tv_show_name,episode_season_number,episode_number,seen_date\nBreaking Bad (2008),1,1,2020-01-01 00:00:00",
  );
  zip.file(
    "show_seen_episode_latest.csv",
    "tv_show_name,episode_season_number,episode_number,seen_date\nBreaking Bad (2008),1,1,2020-01-01 00:00:00",
  );

  return zip.generateAsync({ type: "blob" });
}

function createZipFile(blob: Blob): File {
  return new File([blob], "tvtime-export.zip");
}

async function buildAmbiguousPlan(): Promise<TvTimeImportPlan> {
  vi.spyOn(tmdbSearchService, "searchTvShows").mockResolvedValue({
    page: 1,
    results: [
      createTmdbTvResult(),
      createTmdbTvResult({ id: 1397, popularity: 90 }),
    ],
    total_pages: 1,
    total_results: 2,
  });

  const blob = await createTvTimeZip();

  return buildTvTimeImportPlan(createZipFile(blob));
}

function createTmdbTvResult(
  overrides: Partial<TmdbTvSearchResult> = {},
): TmdbTvSearchResult {
  return {
    id: 1396,
    overview: "A chemistry teacher starts making meth.",
    poster_path: "/breaking-bad.jpg",
    backdrop_path: "/breaking-bad-backdrop.jpg",
    popularity: 100,
    vote_average: 9,
    vote_count: 10000,
    media_type: "tv",
    name: "Breaking Bad",
    original_name: "Breaking Bad",
    first_air_date: "2008-01-20",
    ...overrides,
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

function createCandidate(): ImportCandidate {
  return {
    tvTimeShowId: "tvtime-breaking-bad",
    title: "Breaking Bad (2008)",
    followed: true,
    episodesSeen: 1,
    favorite: false,
    watchStatus: "watching",
  };
}

describe("resolveTvTimeMatch", () => {
  beforeEach(async () => {
    await Promise.all([
      db.media.clear(),
      db.episodes.clear(),
      db.watchHistory.clear(),
    ]);
    vi.restoreAllMocks();
  });

  it("resolves a strong match without writing to IndexedDB", async () => {
    vi.spyOn(tmdbSearchService, "searchTvShows").mockResolvedValue({
      page: 1,
      results: [createTmdbTvResult()],
      total_pages: 1,
      total_results: 1,
    });

    const addSpy = vi.spyOn(mediaRepository, "add");

    const resolution = await resolveTvTimeMatch(createCandidate());

    expect(resolution?.tmdbShow.id).toBe(1396);
    expect(resolution?.existingMedia).toBeUndefined();
    expect(addSpy).not.toHaveBeenCalled();
    expect(await db.media.count()).toBe(0);
    expect(await db.episodes.count()).toBe(0);
    expect(await db.watchHistory.count()).toBe(0);
  });

  it("detects an existing library record without creating a duplicate", async () => {
    await mediaRepository.add({
      tmdbId: 1396,
      mediaType: "tv",
      title: "Breaking Bad",
      userStatus: "watching",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.spyOn(tmdbSearchService, "searchTvShows").mockResolvedValue({
      page: 1,
      results: [createTmdbTvResult()],
      total_pages: 1,
      total_results: 1,
    });

    const resolution = await resolveTvTimeMatch(createCandidate());

    expect(resolution?.existingMedia?.tmdbId).toBe(1396);
    expect(await db.media.count()).toBe(1);
  });

  it("rejects a single result that only matches the year", async () => {
    vi.spyOn(tmdbSearchService, "searchTvShows").mockResolvedValue({
      page: 1,
      results: [
        {
          ...createTmdbTvResult(),
          id: 9999,
          name: "Completely Different Show",
          original_name: "Completely Different Show",
          first_air_date: "2008-05-01",
        },
      ],
      total_pages: 1,
      total_results: 1,
    });

    expect(await resolveTvTimeMatch(createCandidate())).toBeNull();
  });
});

function prepareSuccessfulTmdbMocks() {
  const searchSpy = vi.spyOn(tmdbSearchService, "searchTvShows");

  searchSpy.mockResolvedValue({
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

  return searchSpy;
}

describe("buildTvTimeImportPlan", () => {
  beforeEach(async () => {
    await Promise.all([
      db.media.clear(),
      db.episodes.clear(),
      db.watchHistory.clear(),
    ]);
    vi.restoreAllMocks();
  });

  it("plans a new show and watched episode without mutating IndexedDB", async () => {
    prepareSuccessfulTmdbMocks();

    const blob = await createTvTimeZip({
      timeZone: "America/New_York",
      seenCreatedAt: "2021-01-14 10:00:00",
    });

    const plan = await buildTvTimeImportPlan(new File([blob], "tvtime-export.zip"));

    expect(plan.provider).toBe("tv-time");
    expect(plan.timezone).toBe("America/New_York");
    expect(plan.summary).toMatchObject({
      totalShows: 1,
      newShows: 1,
      existingShows: 0,
      unmatchedShows: 0,
      plannedWatchedEpisodes: 1,
      invalidWatchedEpisodes: 0,
    });
    const firstShow = plan.shows[0];

    if (!firstShow || firstShow.kind !== "new") {
      throw new Error("Expected the plan to contain a new show entry.");
    }

    expect(firstShow.tmdbShow.id).toBe(1396);
    expect(plan.watchedEpisodes[0]).toMatchObject({
      showTitle: "Breaking Bad (2008)",
      seasonNumber: 1,
      episodeNumber: 1,
      tvTimeShowId: "tvtime-breaking-bad",
    });
    expect(plan.watchedEpisodes[0]?.watchedAt.toISOString()).toBe(
      "2021-01-14T15:00:00.000Z",
    );
    expect(plan.warnings).toEqual([]);

    // Dry-run guarantee: planning must not mutate IndexedDB.
    expect(await db.media.count()).toBe(0);
    expect(await db.episodes.count()).toBe(0);
    expect(await db.watchHistory.count()).toBe(0);
  });

  it("classifies a show that already exists in the library", async () => {
    await mediaRepository.add({
      tmdbId: 1396,
      mediaType: "tv",
      title: "Breaking Bad",
      userStatus: "watching",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    prepareSuccessfulTmdbMocks();

    const blob = await createTvTimeZip();

    const plan = await buildTvTimeImportPlan(new File([blob], "tvtime-export.zip"));

    expect(plan.summary.existingShows).toBe(1);
    expect(plan.summary.newShows).toBe(0);
    expect(plan.shows[0]?.kind).toBe("existing");
  });

  it("classifies a show without a confident TMDB match as unmatched", async () => {
    vi.spyOn(tmdbSearchService, "searchTvShows").mockResolvedValue({
      page: 1,
      results: [],
      total_pages: 0,
      total_results: 0,
    });

    const blob = await createTvTimeZip();

    const plan = await buildTvTimeImportPlan(new File([blob], "tvtime-export.zip"));

    expect(plan.summary.unmatchedShows).toBe(1);
    expect(plan.summary.newShows).toBe(0);
  });
});

describe("executeTvTimeImportPlan", () => {
  beforeEach(async () => {
    await Promise.all([
      db.media.clear(),
      db.episodes.clear(),
      db.watchHistory.clear(),
    ]);
    vi.restoreAllMocks();
  });

  it("applies the plan and performs no second TMDB matching", async () => {
    const searchSpy = prepareSuccessfulTmdbMocks();

    const blob = await createTvTimeZip({
      timeZone: "America/New_York",
      seenCreatedAt: "2021-01-14 10:00:00",
    });

    const plan = await buildTvTimeImportPlan(new File([blob], "tvtime-export.zip"));
    const searchCallsAfterPlanning = searchSpy.mock.calls.length;

    const result = await executeTvTimeImportPlan(plan);

    expect(result).toEqual({
      importedShows: 1,
      skippedShows: 0,
      failedShows: 0,
      importedWatchedEpisodes: 1,
      alreadyWatchedEpisodes: 0,
      missingWatchedEpisodes: 0,
      skippedWatchedEpisodes: 0,
      failedWatchedEpisodes: 0,
      shows: expect.any(Array),
    });
    expect(searchSpy.mock.calls.length).toBe(searchCallsAfterPlanning);

    const media = await mediaRepository.getByTmdbId(1396, "tv");

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

  it("rolls back a newly created show when episode synchronization fails", async () => {
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

    const plan = await buildTvTimeImportPlan(new File([blob], "tvtime-export.zip"));

    const result = await executeTvTimeImportPlan(plan);

    expect(result.failedShows).toBe(1);
    expect(result.importedShows).toBe(0);
    expect(await db.media.count()).toBe(0);
    expect(await db.episodes.count()).toBe(0);
  });
});

describe("buildTvTimeImportPlan conflict classification", () => {
  beforeEach(async () => {
    await Promise.all([
      db.media.clear(),
      db.episodes.clear(),
      db.watchHistory.clear(),
    ]);
    vi.restoreAllMocks();
  });

  it("auto-accepts a strong match without a review envelope", async () => {
    vi.spyOn(tmdbSearchService, "searchTvShows").mockResolvedValue({
      page: 1,
      results: [createTmdbTvResult()],
      total_pages: 1,
      total_results: 1,
    });

    const blob = await createTvTimeZip();
    const plan = await buildTvTimeImportPlan(createZipFile(blob));

    expect(plan.shows[0]?.kind).toBe("new");
    expect(plan.shows[0]?.review).toBeUndefined();
  });

  it("flags needs-review when two candidates score within the gap", async () => {
    prepareSuccessfulTmdbMocksWithRivals();

    const blob = await createTvTimeZip();
    const plan = await buildTvTimeImportPlan(createZipFile(blob));

    const show = plan.shows[0];

    expect(show?.kind).toBe("new");
    expect(show?.review?.status).toBe("needs-review");
    expect(show?.review?.reason).toBe("multiple-plausible");
    expect(
      show?.review?.candidates.map((candidate) => candidate.tmdbShow.id),
    ).toEqual([1396, 1397]);
    expect(plan.summary.newShows).toBe(1);

    // Dry-run guarantee still holds while review data is present.
    expect(await db.media.count()).toBe(0);
    expect(await db.episodes.count()).toBe(0);
    expect(await db.watchHistory.count()).toBe(0);
  });

  it("keeps low-confidence results unmatched", async () => {
    vi.spyOn(tmdbSearchService, "searchTvShows").mockResolvedValue({
      page: 1,
      results: [],
      total_pages: 0,
      total_results: 0,
    });

    const blob = await createTvTimeZip();
    const plan = await buildTvTimeImportPlan(createZipFile(blob));

    expect(plan.shows[0]?.kind).toBe("unmatched");
    expect(plan.shows[0]?.review).toBeUndefined();
  });
});

describe("applyImportResolutions", () => {
  const tvTimeShowId = "tvtime-breaking-bad";

  it("materializes the selected candidate without mutating the input", async () => {
    const original = await buildAmbiguousPlan();
    const originalSnapshot = JSON.stringify(original);

    const resolved = applyImportResolutions(original, {
      [tvTimeShowId]: { decision: "use", tmdbId: 1397 },
    });

    const resolvedShow = resolved.shows[0];

    if (!resolvedShow || resolvedShow.kind === "unmatched") {
      throw new Error("Expected a planned show entry.");
    }

    expect(resolvedShow.tmdbShow.id).toBe(1397);
    expect(resolvedShow.resolution).toEqual({
      decision: "use",
      tmdbId: 1397,
    });

    expect(JSON.stringify(original)).toEqual(originalSnapshot);
  });

  it("marks skipped shows without touching their identity", async () => {
    const original = await buildAmbiguousPlan();

    const resolved = applyImportResolutions(original, {
      [tvTimeShowId]: { decision: "skip" },
    });

    const resolvedShow = resolved.shows[0];

    if (!resolvedShow || resolvedShow.kind === "unmatched") {
      throw new Error("Expected a planned show entry.");
    }

    expect(resolvedShow.resolution).toEqual({ decision: "skip" });
    expect(resolvedShow.tmdbShow.id).toBe(1396);
  });

  it("throws when a resolution references an unknown candidate", async () => {
    const plan = await buildAmbiguousPlan();

    expect(() =>
      applyImportResolutions(plan, {
        [tvTimeShowId]: { decision: "use", tmdbId: 999999 },
      }),
    ).toThrow(/not a candidate/);
  });
});

function prepareSuccessfulTmdbMocksWithRivals() {
  const searchSpy = vi.spyOn(tmdbSearchService, "searchTvShows");

  searchSpy.mockResolvedValue({
    page: 1,
    results: [
      createTmdbTvResult(),
      createTmdbTvResult({ id: 1397, popularity: 90 }),
    ],
    total_pages: 1,
    total_results: 2,
  });

  vi.spyOn(tmdbTvService, "getTvDetails").mockResolvedValue(
    createTmdbTvDetails(),
  );

  vi.spyOn(tmdbTvService, "getSeasonDetails").mockResolvedValue(
    createTmdbTvSeasonDetails(),
  );

  return searchSpy;
}

describe("executeTvTimeImportPlan conflict safety", () => {
  beforeEach(async () => {
    await Promise.all([
      db.media.clear(),
      db.episodes.clear(),
      db.watchHistory.clear(),
    ]);
    vi.restoreAllMocks();
  });

  it("refuses to execute while a review is unresolved", async () => {
    const plan = await buildAmbiguousPlan();

    await expect(executeTvTimeImportPlan(plan)).rejects.toThrow(
      /Unresolved TV Time match review/,
    );

    expect(await db.media.count()).toBe(0);
    expect(await db.episodes.count()).toBe(0);
    expect(await db.watchHistory.count()).toBe(0);
  });

  it("imports the user-selected candidate without re-matching", async () => {
    const searchSpy = prepareSuccessfulTmdbMocksWithRivals();

    const blob = await createTvTimeZip();
    const plan = await buildTvTimeImportPlan(createZipFile(blob));
    const searchCallsAfterPlanning = searchSpy.mock.calls.length;

    const resolved = applyImportResolutions(plan, {
      "tvtime-breaking-bad": { decision: "use", tmdbId: 1397 },
    });

    const result = await executeTvTimeImportPlan(resolved);

    expect(result.importedShows).toBe(1);
    expect(await mediaRepository.getByTmdbId(1397, "tv")).toBeDefined();
    expect(await mediaRepository.getByTmdbId(1396, "tv")).toBeUndefined();
    expect(searchSpy.mock.calls.length).toBe(searchCallsAfterPlanning);
  });

  it("skips user-skipped shows and their watched episodes", async () => {
    prepareSuccessfulTmdbMocksWithRivals();

    const blob = await createTvTimeZip();
    const plan = await buildTvTimeImportPlan(createZipFile(blob));

    const resolved = applyImportResolutions(plan, {
      "tvtime-breaking-bad": { decision: "skip" },
    });

    const result = await executeTvTimeImportPlan(resolved);

    expect(result.importedShows).toBe(0);
    expect(result.skippedShows).toBe(1);
    expect(result.importedWatchedEpisodes).toBe(0);
    expect(result.skippedWatchedEpisodes).toBe(1);
    expect(await db.media.count()).toBe(0);
  });
});

describe("duplicate TV Time titles", () => {
  beforeEach(async () => {
    await Promise.all([
      db.media.clear(),
      db.episodes.clear(),
      db.watchHistory.clear(),
    ]);
    vi.restoreAllMocks();

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
  });

  it("skips affected watched rows instead of misattributing them", async () => {
    const blob = await createTvTimeZip({
      shows: [
        { id: "tvtime-dup-a", title: "Breaking Bad" },
        { id: "tvtime-dup-b", title: "Breaking Bad" },
      ],
      seenEpisodes: [{ title: "Breaking Bad", season: 1, episode: 1 }],
    });

    const plan = await buildTvTimeImportPlan(createZipFile(blob));

    expect(plan.summary.duplicateTitleWatchedEpisodes).toBe(1);
    expect(
      plan.warnings.some((warning) =>
        warning.includes("Duplicate TV Time titles"),
      ),
    ).toBe(true);
    expect(plan.watchedEpisodes[0]?.skippedReason).toBe(
      "duplicate-show-title",
    );

    const result = await executeTvTimeImportPlan(plan);

    expect(result.importedShows).toBe(1);
    expect(result.skippedShows).toBe(1);
    expect(result.importedWatchedEpisodes).toBe(0);
    expect(result.skippedWatchedEpisodes).toBe(1);

    // Exactly one library record; the watched row was never attributed.
    expect(await db.media.count()).toBe(1);

    const media = await mediaRepository.getByTmdbId(1396, "tv");

    const episode = media?.id
      ? await episodeRepository.getByShowSeasonAndEpisode(media.id, 1, 1)
      : undefined;

    expect(episode?.watched ?? false).toBe(false);
  });
});

describe("tracking watch history", () => {
  beforeEach(async () => {
    await Promise.all([
      db.media.clear(),
      db.episodes.clear(),
      db.watchHistory.clear(),
    ]);
    vi.restoreAllMocks();

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
  });

  it("plans watched episodes from tracking-prod-records-v2.csv", async () => {
    const blob = await createTvTimeZip({
      timeZone: "America/New_York",
      trackingEpisodes: [
        {
          sId: "tvtime-breaking-bad",
          title: "Breaking Bad (2008)",
          season: 1,
          episode: 1,
          createdAt: "2021-01-14 10:00:00",
        },
        {
          sId: "tvtime-breaking-bad",
          title: "Breaking Bad (2008)",
          season: 1,
          episode: 2,
          createdAt: "2021-01-15 10:00:00",
          bulkType: "season",
        },
      ],
    });

    const plan = await buildTvTimeImportPlan(createZipFile(blob));

    expect(plan.summary.plannedWatchedEpisodes).toBe(2);
    expect(plan.watchedEpisodes[0]).toMatchObject({
      tvTimeShowId: "tvtime-breaking-bad",
      showTitle: "Breaking Bad (2008)",
      seasonNumber: 1,
      episodeNumber: 1,
    });
    expect(plan.watchedEpisodes[0]?.watchedAt.toISOString()).toBe(
      "2021-01-14T15:00:00.000Z",
    );
    expect(plan.watchedEpisodes[1]).toMatchObject({
      seasonNumber: 1,
      episodeNumber: 2,
    });
  });

  it("prefers tracking watches over seen_episode_source.csv watches", async () => {
    const blob = await createTvTimeZip({
      timeZone: "America/New_York",
      trackingEpisodes: [
        {
          sId: "tvtime-breaking-bad",
          title: "Breaking Bad (2008)",
          season: 1,
          episode: 1,
          createdAt: "2021-01-14 10:00:00",
        },
        {
          sId: "tvtime-breaking-bad",
          title: "Breaking Bad (2008)",
          season: 1,
          episode: 2,
          createdAt: "2021-01-15 10:00:00",
        },
      ],
      seenEpisodes: [
        { title: "Breaking Bad (2008)", season: 1, episode: 1 },
        { title: "Breaking Bad (2008)", season: 1, episode: 3 },
      ],
    });

    const plan = await buildTvTimeImportPlan(createZipFile(blob));

    // Only tracking-derived watches are planned: S1E3 from the seen source
    // never appears and the seen-source timestamp is never used.
    expect(plan.summary.plannedWatchedEpisodes).toBe(2);
    expect(
      plan.watchedEpisodes.map(
        (watched) => `${watched.seasonNumber}-${watched.episodeNumber}`,
      ),
    ).toEqual(["1-1", "1-2"]);
    expect(plan.watchedEpisodes[0]?.watchedAt.toISOString()).toBe(
      "2021-01-14T15:00:00.000Z",
    );
  });

  it("falls back to seen_episode_source.csv when the tracking file is absent", async () => {
    const blob = await createTvTimeZip({
      timeZone: "America/New_York",
      seenCreatedAt: "2021-01-14 10:00:00",
    });

    const plan = await buildTvTimeImportPlan(createZipFile(blob));

    expect(plan.summary.plannedWatchedEpisodes).toBe(1);
    expect(plan.watchedEpisodes[0]).toMatchObject({
      tvTimeShowId: "tvtime-breaking-bad",
      showTitle: "Breaking Bad (2008)",
      seasonNumber: 1,
      episodeNumber: 1,
    });
    expect(plan.watchedEpisodes[0]?.watchedAt.toISOString()).toBe(
      "2021-01-14T15:00:00.000Z",
    );
  });

  it("plans Game of Thrones-like tracking data without the S00E55 special", async () => {
    const trackingEpisodes: TvTimeTrackingEpisodeRow[] = [];

    // 73 normal episodes across S01-S08, mirroring the real GDPR export.
    const seasonEpisodeCounts = [9, 9, 9, 9, 9, 10, 10, 8];

    seasonEpisodeCounts.forEach((count, index) => {
      const season = index + 1;

      for (let episode = 1; episode <= count; episode++) {
        trackingEpisodes.push({
          sId: "tvtime-game-of-thrones",
          title: "Game of Thrones (2011)",
          season,
          episode,
          createdAt: `2019-05-${String((episode % 28) + 1).padStart(2, "0")} 12:00:00`,
          bulkType: "season",
        });
      }
    });

    // The one anomalous S00E55 record present in the real export.
    trackingEpisodes.push({
      sId: "tvtime-game-of-thrones",
      title: "Game of Thrones (2011)",
      season: 0,
      episode: 55,
      createdAt: "2019-06-01 12:00:00",
    });

    const blob = await createTvTimeZip({
      shows: [{ id: "tvtime-game-of-thrones", title: "Game of Thrones (2011)" }],
      seenEpisodes: [],
      trackingEpisodes,
    });

    const plan = await buildTvTimeImportPlan(createZipFile(blob));

    expect(plan.summary.plannedWatchedEpisodes).toBe(73);
    expect(plan.watchedEpisodes.some((watched) => watched.seasonNumber === 0)).toBe(
      false,
    );
    expect(
      plan.watchedEpisodes.filter((watched) => watched.episodeNumber === 55),
    ).toEqual([]);

    for (const watched of plan.watchedEpisodes) {
      expect(watched.tvTimeShowId).toBe("tvtime-game-of-thrones");
      expect(watched.seasonNumber).toBeGreaterThanOrEqual(1);
      expect(watched.seasonNumber).toBeLessThanOrEqual(8);
      expect(watched.episodeNumber).toBeGreaterThanOrEqual(1);
    }
  });

  it("uses tracking data instead of the incomplete six-row seen source", async () => {
    const trackingEpisodes: TvTimeTrackingEpisodeRow[] = [
      ...Array.from({ length: 6 }, (_, index) => ({
        sId: "tvtime-walking-dead",
        title: "The Walking Dead (2010)",
        season: 1,
        episode: index + 1,
        createdAt: "2015-10-12 03:00:00",
        bulkType: "season",
      })),
      ...Array.from({ length: 4 }, (_, index) => ({
        sId: "tvtime-walking-dead",
        title: "The Walking Dead (2010)",
        season: 2,
        episode: index + 1,
        createdAt: "2016-02-20 21:00:00",
        bulkType: "season",
      })),
    ];

    const blob = await createTvTimeZip({
      timeZone: "America/New_York",
      shows: [{ id: "tvtime-walking-dead", title: "The Walking Dead (2010)" }],
      seenEpisodes: [
        { title: "The Walking Dead (2010)", season: 1, episode: 1 },
        { title: "The Walking Dead (2010)", season: 1, episode: 2 },
        { title: "The Walking Dead (2010)", season: 1, episode: 3 },
        { title: "The Walking Dead (2010)", season: 1, episode: 4 },
        { title: "The Walking Dead (2010)", season: 1, episode: 5 },
        { title: "The Walking Dead (2010)", season: 1, episode: 6 },
      ],
      trackingEpisodes,
    });

    const plan = await buildTvTimeImportPlan(createZipFile(blob));

    // The incomplete six-row seen source is ignored in favour of the complete
    // tracking history (6 x S1 + 4 x S2); bulk_type=season marks are retained.
    expect(plan.summary.plannedWatchedEpisodes).toBe(10);
    expect(
      plan.watchedEpisodes.map(
        (watched) => `${watched.seasonNumber}-${watched.episodeNumber}`,
      ),
    ).toEqual([
      "1-1",
      "1-2",
      "1-3",
      "1-4",
      "1-5",
      "1-6",
      "2-1",
      "2-2",
      "2-3",
      "2-4",
    ]);

    // The tracking timestamp is used, not the seen-source timestamp.
    expect(plan.watchedEpisodes[0]?.watchedAt.toISOString()).toBe(
      "2015-10-12T07:00:00.000Z",
    );
  });

  it("does not plan duplicate candidates for the same TV Time show/season/episode", async () => {
    const blob = await createTvTimeZip({
      timeZone: "America/New_York",
      trackingEpisodes: [
        {
          sId: "tvtime-breaking-bad",
          title: "Breaking Bad (2008)",
          season: 1,
          episode: 1,
          createdAt: "2021-02-05 10:00:00",
        },
        {
          sId: "tvtime-breaking-bad",
          title: "Breaking Bad (2008)",
          season: 1,
          episode: 1,
          createdAt: "2021-01-05 10:00:00",
        },
        {
          sId: "tvtime-breaking-bad",
          title: "Breaking Bad (2008)",
          season: 1,
          episode: 1,
          createdAt: "2021-03-05 10:00:00",
          rewatchCount: 1,
        },
      ],
    });

    const plan = await buildTvTimeImportPlan(createZipFile(blob));

    expect(plan.summary.plannedWatchedEpisodes).toBe(1);

    // Earliest watch wins, consistent with WatchLog's first-watch-wins
    // semantics: watchedAt is never overwritten once set.
    expect(plan.watchedEpisodes[0]?.watchedAt.toISOString()).toBe(
      "2021-01-05T15:00:00.000Z",
    );
  });

  it("does not skip tracking rows when TV Time show titles are duplicated", async () => {
    const blob = await createTvTimeZip({
      shows: [
        { id: "tvtime-dup-a", title: "Breaking Bad (2008)" },
        { id: "tvtime-dup-b", title: "Breaking Bad (2008)" },
      ],
      seenEpisodes: [],
      trackingEpisodes: [
        {
          sId: "tvtime-dup-a",
          title: "Breaking Bad (2008)",
          season: 1,
          episode: 1,
          createdAt: "2021-01-05 10:00:00",
        },
        {
          sId: "tvtime-dup-b",
          title: "Breaking Bad (2008)",
          season: 1,
          episode: 1,
          createdAt: "2021-02-05 10:00:00",
        },
      ],
    });

    const plan = await buildTvTimeImportPlan(createZipFile(blob));

    // Both rows carry a TV Time show id, so duplicated titles must not flag
    // them as unattributable: the executor joins them by id, not by title.
    expect(plan.watchedEpisodes).toHaveLength(2);
    expect(
      plan.watchedEpisodes.every((watched) => !watched.skippedReason),
    ).toBe(true);
    expect(plan.watchedEpisodes.map((watched) => watched.tvTimeShowId)).toEqual([
      "tvtime-dup-a",
      "tvtime-dup-b",
    ]);
  });

  it("resolves tracking watched rows by TV Time show id during execution", async () => {
    // series_name deliberately does not match the planned show title, so a
    // title-based lookup would fail: only the s_id join can attribute it.
    const blob = await createTvTimeZip({
      seenEpisodes: [],
      trackingEpisodes: [
        {
          sId: "tvtime-breaking-bad",
          title: "An Unrelated Series Title",
          season: 1,
          episode: 1,
          createdAt: "2021-01-05 10:00:00",
        },
      ],
    });

    const plan = await buildTvTimeImportPlan(createZipFile(blob));

    expect(plan.watchedEpisodes).toHaveLength(1);
    expect(plan.watchedEpisodes[0]?.skippedReason).toBeUndefined();

    const result = await executeTvTimeImportPlan(plan);

    expect(result.importedShows).toBe(1);
    expect(result.importedWatchedEpisodes).toBe(1);
    expect(result.skippedWatchedEpisodes).toBe(0);

    const media = await mediaRepository.getByTmdbId(1396, "tv");

    if (!media?.id) {
      throw new Error("Expected the show to exist in the library.");
    }

    const episode = await episodeRepository.getByShowSeasonAndEpisode(
      media.id,
      1,
      1,
    );

    expect(episode?.watched ?? false).toBe(true);
    expect(episode?.watchedAt?.toISOString()).toBe("2021-01-05T04:30:00.000Z");
  });
});

describe("Phase 3E watched-episode outcomes", () => {
  beforeEach(async () => {
    await Promise.all([
      db.media.clear(),
      db.episodes.clear(),
      db.watchHistory.clear(),
    ]);
    vi.restoreAllMocks();
  });

  it("marks an episode that exists only after synchronization as watched", async () => {
    prepareSuccessfulTmdbMocks();

    const blob = await createTvTimeZip({
      timeZone: "America/New_York",
      seenCreatedAt: "2021-01-14 10:00:00",
    });

    const plan = await buildTvTimeImportPlan(createZipFile(blob));

    // The episode referenced by the watched row does not exist before
    // execution; synchronization creates it from TMDB metadata first.
    expect(await db.media.count()).toBe(0);
    expect(await db.episodes.count()).toBe(0);

    const result = await executeTvTimeImportPlan(plan);

    expect(result).toMatchObject({
      importedShows: 1,
      skippedShows: 0,
      failedShows: 0,
      importedWatchedEpisodes: 1,
      alreadyWatchedEpisodes: 0,
      skippedWatchedEpisodes: 0,
      failedWatchedEpisodes: 0,
    });

    const media = await mediaRepository.getByTmdbId(1396, "tv");

    const episode =
      media?.id !== undefined
        ? await episodeRepository.getByShowSeasonAndEpisode(media.id, 1, 1)
        : undefined;

    expect(episode?.id).toBeGreaterThan(0);
    expect(episode?.watched).toBe(true);
    expect(episode?.watchedAt).toEqual(new Date("2021-01-14T15:00:00.000Z"));
  });

  it("classifies re-imported episodes as already watched without duplicating data", async () => {
    prepareSuccessfulTmdbMocks();

    const blob = await createTvTimeZip({
      seenCreatedAt: "2021-01-14 10:00:00",
    });

    const plan = await buildTvTimeImportPlan(createZipFile(blob));

    await executeTvTimeImportPlan(plan);

    const media = await mediaRepository.getByTmdbId(1396, "tv");

    const episodeBefore =
      media?.id !== undefined
        ? await episodeRepository.getByShowSeasonAndEpisode(media.id, 1, 1)
        : undefined;

    expect(episodeBefore?.watched).toBe(true);

    const result = await executeTvTimeImportPlan(plan);

    expect(result).toMatchObject({
      importedShows: 0,
      skippedShows: 1,
      failedShows: 0,
      importedWatchedEpisodes: 0,
      alreadyWatchedEpisodes: 1,
      skippedWatchedEpisodes: 0,
      failedWatchedEpisodes: 0,
    });

    // No duplicate records or history events; local watch data untouched.
    expect(await db.media.count()).toBe(1);
    expect(await db.episodes.count()).toBe(1);
    expect(await db.watchHistory.count()).toBe(1);

    const episodeAfter =
      media?.id !== undefined
        ? await episodeRepository.getByShowSeasonAndEpisode(media.id, 1, 1)
        : undefined;

    expect(episodeAfter?.watched).toBe(true);
    expect(episodeAfter?.watchedAt).toEqual(episodeBefore?.watchedAt);
  });

  it("refreshes episode metadata while preserving local watch state across re-execution", async () => {
    prepareSuccessfulTmdbMocks();

    const blob = await createTvTimeZip({
      seenCreatedAt: "2021-01-14 10:00:00",
    });

    const plan = await buildTvTimeImportPlan(createZipFile(blob));

    await executeTvTimeImportPlan(plan);

    const media = await mediaRepository.getByTmdbId(1396, "tv");

    const watchedBefore =
      media?.id !== undefined
        ? await episodeRepository.getByShowSeasonAndEpisode(media.id, 1, 1)
        : undefined;

    expect(watchedBefore?.watched).toBe(true);

    // TMDB now delivers newer metadata for the same episode.
    vi.spyOn(tmdbTvService, "getSeasonDetails").mockResolvedValue({
      ...createTmdbTvSeasonDetails(),
      episodes: [
        {
          air_date: "2008-01-20",
          episode_number: 1,
          id: 62111,
          name: "Pilot (Remastered)",
          overview: "A remastered cut of the pilot.",
          runtime: 61,
          season_number: 1,
          show_id: 1396,
          still_path: null,
          vote_average: 8.7,
          vote_count: 500,
        },
      ],
    });

    await executeTvTimeImportPlan(plan);

    const refreshed =
      media?.id !== undefined
        ? await episodeRepository.getByShowSeasonAndEpisode(media.id, 1, 1)
        : undefined;

    expect(refreshed?.title).toBe("Pilot (Remastered)");
    expect(refreshed?.runtime).toBe(61);
    expect(refreshed?.voteAverage).toBeCloseTo(8.7);

    // User-owned state is never touched by a metadata refresh.
    expect(refreshed?.watched).toBe(true);
    expect(refreshed?.watchedAt).toEqual(watchedBefore?.watchedAt);
    expect(await db.watchHistory.count()).toBe(1);
  });

  it("counts watch-history failures separately and leaves no orphan state", async () => {
    prepareSuccessfulTmdbMocks();

    const blob = await createTvTimeZip({
      timeZone: "America/New_York",
      seenCreatedAt: "2021-01-14 10:00:00",
      seenEpisodes: [
        { title: "Breaking Bad (2008)", season: 1, episode: 1 },
        { title: "Breaking Bad (2008)", season: 1, episode: 2 },
      ],
    });

    const plan = await buildTvTimeImportPlan(createZipFile(blob));

    // Synchronization provides both episodes from TMDB...
    vi.spyOn(tmdbTvService, "getSeasonDetails").mockResolvedValue({
      ...createTmdbTvSeasonDetails(),
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
        {
          air_date: "2008-01-27",
          episode_number: 2,
          id: 62112,
          name: "Cat's in the Bag...",
          overview: "Walt and Jesse try to tie up loose ends.",
          runtime: 55,
          season_number: 1,
          show_id: 1396,
          still_path: null,
          vote_average: 8.3,
          vote_count: 450,
        },
      ],
    });

    // ...but the second watch-history write fails mid-import.
    const originalMarkWatchedFromImport =
      episodeRepository.markWatchedFromImport.bind(episodeRepository);

    let markCallCount = 0;

    vi.spyOn(episodeRepository, "markWatchedFromImport").mockImplementation(
      async (id: number, watchedAt: Date) => {
        markCallCount += 1;

        if (markCallCount >= 2) {
          throw new Error("Simulated watch-history failure.");
        }

        return originalMarkWatchedFromImport(id, watchedAt);
      },
    );

    const result = await executeTvTimeImportPlan(plan);

    expect(result.importedWatchedEpisodes).toBe(1);
    expect(result.alreadyWatchedEpisodes).toBe(0);
    expect(result.skippedWatchedEpisodes).toBe(0);
    expect(result.failedWatchedEpisodes).toBe(1);

    // Earlier successes stand; no half-state for the failing row.
    expect(await db.watchHistory.count()).toBe(1);

    const media = await mediaRepository.getByTmdbId(1396, "tv");

    const first =
      media?.id !== undefined
        ? await episodeRepository.getByShowSeasonAndEpisode(media.id, 1, 1)
        : undefined;

    const second =
      media?.id !== undefined
        ? await episodeRepository.getByShowSeasonAndEpisode(media.id, 1, 2)
        : undefined;

    expect(first?.watched).toBe(true);
    expect(first?.watchedAt).toEqual(new Date("2021-01-14T15:00:00.000Z"));
    expect(second?.watched).toBe(false);
  });
});

describe("Alpha 10 episode reconciliation", () => {
  beforeEach(async () => {
    await Promise.all([
      db.media.clear(),
      db.episodes.clear(),
      db.watchHistory.clear(),
    ]);
    vi.restoreAllMocks();
  });

  it("counts episodes missing after synchronization as EPISODE_MISSING without creating them", async () => {
    prepareSuccessfulTmdbMocks();

    // S01E05 is absent from the TMDB season payload, so it never exists
    // locally after synchronization.
    const blob = await createTvTimeZip({
      seenCreatedAt: "2021-01-14 10:00:00",
      seenEpisodes: [
        { title: "Breaking Bad (2008)", season: 1, episode: 1 },
        { title: "Breaking Bad (2008)", season: 1, episode: 5 },
      ],
    });

    const plan = await buildTvTimeImportPlan(createZipFile(blob));

    const result = await executeTvTimeImportPlan(plan);

    expect(result).toEqual({
      importedShows: 1,
      skippedShows: 0,
      failedShows: 0,
      importedWatchedEpisodes: 1,
      alreadyWatchedEpisodes: 0,
      missingWatchedEpisodes: 1,
      skippedWatchedEpisodes: 0,
      failedWatchedEpisodes: 0,
      shows: expect.any(Array),
    });

    // The missing episode is NOT created and receives NO watch history; the
    // synchronized episode is untouched.
    expect(await db.media.count()).toBe(1);
    expect(await db.episodes.count()).toBe(1);
    expect(await db.watchHistory.count()).toBe(1);

    const media = await mediaRepository.getByTmdbId(1396, "tv");

    const missing =
      media?.id !== undefined
        ? await episodeRepository.getByShowSeasonAndEpisode(media.id, 1, 5)
        : undefined;

    expect(missing).toBeUndefined();
  });

  it("preserves the local watchedAt and history when importing over a watched episode", async () => {
    prepareSuccessfulTmdbMocks();

    // First import watches S01E01 at the TV Time timestamp.
    const firstBlob = await createTvTimeZip({
      timeZone: "America/New_York",
      seenCreatedAt: "2021-01-14 10:00:00",
    });

    await executeTvTimeImportPlan(
      await buildTvTimeImportPlan(createZipFile(firstBlob)),
    );

    const media = await mediaRepository.getByTmdbId(1396, "tv");

    const episodeBefore =
      media?.id !== undefined
        ? await episodeRepository.getByShowSeasonAndEpisode(media.id, 1, 1)
        : undefined;

    expect(episodeBefore?.watched).toBe(true);
    expect(episodeBefore?.watchedAt?.toISOString()).toBe(
      "2021-01-14T15:00:00.000Z",
    );

    // A second export reports the same episode watched at a DIFFERENT time.
    const secondBlob = await createTvTimeZip({
      timeZone: "America/New_York",
      seenCreatedAt: "2022-06-01 12:00:00",
    });

    const result = await executeTvTimeImportPlan(
      await buildTvTimeImportPlan(createZipFile(secondBlob)),
    );

    expect(result.alreadyWatchedEpisodes).toBe(1);
    expect(result.importedWatchedEpisodes).toBe(0);

    // LOCAL WATCH STATE ALWAYS WINS: the local watchedAt and the single
    // history event are preserved untouched; the import timestamp is lost.
    const episodeAfter =
      media?.id !== undefined
        ? await episodeRepository.getByShowSeasonAndEpisode(media.id, 1, 1)
        : undefined;

    expect(episodeAfter?.watched).toBe(true);
    expect(episodeAfter?.watchedAt?.toISOString()).toBe(
      "2021-01-14T15:00:00.000Z",
    );
    expect(await db.watchHistory.count()).toBe(1);

    const historyEvent = episodeAfter?.id
      ? await watchHistoryRepository.getLatestByEpisode(episodeAfter.id)
      : undefined;

    expect(historyEvent?.watchedAt.toISOString()).toBe(
      "2021-01-14T15:00:00.000Z",
    );
  });

  it("reports all eight outcome counters for a partially failing import", async () => {
    // Breaking Bad matches; the unknown title never matches TMDB.
    vi.spyOn(tmdbSearchService, "searchTvShows").mockImplementation(
      async (query: string) => {
        if (query.includes("Breaking")) {
          return {
            page: 1,
            results: [createTmdbTvResult()],
            total_pages: 1,
            total_results: 1,
          };
        }

        return {
          page: 1,
          results: [],
          total_pages: 0,
          total_results: 0,
        };
      },
    );

    vi.spyOn(tmdbTvService, "getTvDetails").mockResolvedValue(
      createTmdbTvDetails(),
    );

    vi.spyOn(tmdbTvService, "getSeasonDetails").mockResolvedValue(
      createTmdbTvSeasonDetails(),
    );

    // The third watch mutation fails mid-import; earlier rows stand and no
    // half-state is left behind for the failing row.
    const originalMarkWatchedFromImport =
      episodeRepository.markWatchedFromImport.bind(episodeRepository);

    let markCallCount = 0;

    vi.spyOn(episodeRepository, "markWatchedFromImport").mockImplementation(
      async (id: number, watchedAt: Date) => {
        markCallCount += 1;

        if (markCallCount >= 3) {
          throw new Error("Simulated watch-history failure.");
        }

        return originalMarkWatchedFromImport(id, watchedAt);
      },
    );

    const blob = await createTvTimeZip({
      seenCreatedAt: "2021-01-14 10:00:00",
      shows: [
        { id: "tvtime-breaking-bad", title: "Breaking Bad (2008)" },
        { id: "tvtime-unknown", title: "Totally Unknown Show 123" },
      ],
      seenEpisodes: [
        // EPISODE_EXISTS, locally unwatched → imported.
        { title: "Breaking Bad (2008)", season: 1, episode: 1 },
        // EPISODE_EXISTS, already watched by the row above → preserved.
        { title: "Breaking Bad (2008)", season: 1, episode: 1 },
        // Runtime watch mutation failure → failed.
        { title: "Breaking Bad (2008)", season: 1, episode: 1 },
        // EPISODE_MISSING: no S01E05 after synchronization → not created.
        { title: "Breaking Bad (2008)", season: 1, episode: 5 },
        // Unattributable: the title belongs to no imported show → skipped.
        { title: "Totally Unknown Show 123", season: 1, episode: 1 },
      ],
    });

    const plan = await buildTvTimeImportPlan(createZipFile(blob));

    const result = await executeTvTimeImportPlan(plan);

    // The unknown show is unmatched, which counts as skippedShows — it is a
    // deliberate skip, not an execution failure. failedShows stays 0 because
    // no execution error occurred.
    expect(result).toEqual({
      importedShows: 1,
      skippedShows: 1,
      failedShows: 0,
      importedWatchedEpisodes: 1,
      alreadyWatchedEpisodes: 1,
      missingWatchedEpisodes: 1,
      skippedWatchedEpisodes: 1,
      failedWatchedEpisodes: 1,
      shows: expect.any(Array),
    });

    // Only the synchronized episode exists; no fabricated rows or duplicate
    // history events survived the partial failures.
    expect(await db.media.count()).toBe(1);
    expect(await db.episodes.count()).toBe(1);
    expect(await db.watchHistory.count()).toBe(1);
  });
});

describe("Phase 3F execution progress", () => {
  beforeEach(async () => {
    await Promise.all([
      db.media.clear(),
      db.episodes.clear(),
      db.watchHistory.clear(),
    ]);
    vi.restoreAllMocks();
  });

  it("emits real-work progress that fills each phase monotonically to its total", async () => {
    const searchSpy = prepareSuccessfulTmdbMocks();

    // The watched fixture references S01E02 as well; provide both
    // episodes so every planned row resolves and counts as imported.
    vi.spyOn(tmdbTvService, "getSeasonDetails").mockResolvedValue({
      ...createTmdbTvSeasonDetails(),
      episodes: [
        ...createTmdbTvSeasonDetails().episodes,
        {
          air_date: "2008-01-27",
          episode_number: 2,
          id: 62112,
          name: "Cat's in the Bag...",
          overview: "Walt and Jesse try to tie up loose ends.",
          runtime: 55,
          season_number: 1,
          show_id: 1396,
          still_path: null,
          vote_average: 8.3,
          vote_count: 450,
        },
      ],
    });

    const blob = await createTvTimeZip({
      seenCreatedAt: "2021-01-14 10:00:00",
      seenEpisodes: [
        { title: "Breaking Bad (2008)", season: 1, episode: 1 },
        { title: "Breaking Bad (2008)", season: 1, episode: 2 },
      ],
    });

    const plan = await buildTvTimeImportPlan(createZipFile(blob));

    const searchCallsAfterPlanning = searchSpy.mock.calls.length;

    const progressEvents: Array<{
      phase: string;
      current: number;
      total: number;
    }> = [];

    const result = await executeTvTimeImportPlan(plan, {
      onProgress: (progress) => {
        progressEvents.push({ ...progress });
      },
    });

    // First event surfaces the show about to be processed before any work.
    expect(progressEvents[0]).toEqual({
      phase: "shows",
      current: 0,
      total: plan.shows.length,
      currentShowTitle: "Breaking Bad (2008)",
    });

    // Phases never interleave.
    const lastShowsIndex = Math.max(
      ...progressEvents.flatMap((event, index) =>
        event.phase === "shows" ? [index] : [],
      ),
    );

    const firstWatchedIndex = progressEvents.findIndex(
      (event) => event.phase === "watched-episodes",
    );

    expect(lastShowsIndex).toBeLessThan(firstWatchedIndex);

    // Counters stay monotonic: the start-of-unit event may repeat the
    // previous value; completions advance it toward the phase total.
    let previousPhase = "";
    let previousCurrent = -1;

    for (const event of progressEvents) {
      if (event.phase !== previousPhase) {
        previousPhase = event.phase;
        previousCurrent = -1;
      }

      expect(event.total).toBeGreaterThan(0);
      expect(event.current).toBeGreaterThanOrEqual(previousCurrent);

      previousCurrent = event.current;
    }

    expect(progressEvents[progressEvents.length - 1]).toEqual({
      phase: "watched-episodes",
      current: plan.watchedEpisodes.length,
      total: plan.watchedEpisodes.length,
    });

    // Result counters unchanged by progress reporting; no re-matching.
    expect(result.importedWatchedEpisodes).toBe(2);
    expect(result.alreadyWatchedEpisodes).toBe(0);
    expect(searchSpy.mock.calls.length).toBe(searchCallsAfterPlanning);
  });

  it("keeps progress coherent when a show fails and rolls back", async () => {
    const searchSpy = prepareSuccessfulTmdbMocks();

    const blob = await createTvTimeZip({
      seenCreatedAt: "2021-01-14 10:00:00",
    });

    const plan = await buildTvTimeImportPlan(createZipFile(blob));

    const searchCallsAfterPlanning = searchSpy.mock.calls.length;

    vi.spyOn(tmdbTvService, "getSeasonDetails").mockRejectedValue(
      new Error("Simulated TMDB season failure"),
    );

    const progressEvents: Array<{ phase: string; current: number }> = [];

    const result = await executeTvTimeImportPlan(plan, {
      onProgress: (progress) => {
        progressEvents.push({
          phase: progress.phase,
          current: progress.current,
        });
      },
    });

    // The failing show still completes its unit; watched rows then run.
    expect(result.failedShows).toBe(1);

    // The show rolled back, so its episode does not exist locally: Alpha 10
    // classifies the row as EPISODE_MISSING instead of skipping it silently.
    expect(result.missingWatchedEpisodes).toBe(1);
    expect(result.skippedWatchedEpisodes).toBe(0);

    const finalShowsEvent = [...progressEvents]
      .reverse()
      .find((event) => event.phase === "shows");

    expect(finalShowsEvent?.current).toBe(plan.shows.length);

    const finalWatchedEvent = [...progressEvents]
      .reverse()
      .find((event) => event.phase === "watched-episodes");

    expect(finalWatchedEvent?.current).toBe(plan.watchedEpisodes.length);

    // Rollback remains intact despite progress instrumentation.
    expect(await db.media.count()).toBe(0);
    expect(await db.episodes.count()).toBe(0);
    expect(await db.watchHistory.count()).toBe(0);
    expect(searchSpy.mock.calls.length).toBe(searchCallsAfterPlanning);
  });

  it("completes the import normally when every progress emission throws", async () => {
    prepareSuccessfulTmdbMocks();

    const blob = await createTvTimeZip({
      timeZone: "America/New_York",
      seenCreatedAt: "2021-01-14 10:00:00",
    });

    const plan = await buildTvTimeImportPlan(createZipFile(blob));

    const crashError = new Error("Simulated progress observer crash");

    let emissions = 0;

    const phasesSeen: Array<{ phase: string; current: number }> = [];

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await executeTvTimeImportPlan(plan, {
      onProgress: (progress) => {
        emissions += 1;

        phasesSeen.push({ phase: progress.phase, current: progress.current });

        throw crashError;
      },
    });

    // Every emitted event still reached the throwing observer.
    expect(emissions).toBe(plan.shows.length * 2 + plan.watchedEpisodes.length);

    // Both phases ran through the crashing callback to their totals.
    const showsEvents = phasesSeen.filter((event) => event.phase === "shows");

    expect(showsEvents).toHaveLength(plan.shows.length * 2);

    expect(
      showsEvents[showsEvents.length - 1]?.current,
    ).toBe(plan.shows.length);

    const watchedEvents = phasesSeen.filter(
      (event) => event.phase === "watched-episodes",
    );

    expect(watchedEvents).toHaveLength(plan.watchedEpisodes.length);

    expect(watchedEvents[watchedEvents.length - 1]).toEqual({
      phase: "watched-episodes",
      current: plan.watchedEpisodes.length,
    });

    // No crash escapes into the caller; the result matches a non-throwing
    // observer exactly.
    expect(result).toEqual({
      importedShows: 1,
      skippedShows: 0,
      failedShows: 0,
      importedWatchedEpisodes: 1,
      alreadyWatchedEpisodes: 0,
      missingWatchedEpisodes: 0,
      skippedWatchedEpisodes: 0,
      failedWatchedEpisodes: 0,
      shows: expect.any(Array),
    });

    // The import really executed despite the observer throwing constantly.
    expect(await db.media.count()).toBe(1);
    expect(await db.episodes.count()).toBe(1);
    expect(await db.watchHistory.count()).toBe(1);

    const media = await mediaRepository.getByTmdbId(1396, "tv");

    const episode =
      media?.id !== undefined
        ? await episodeRepository.getByShowSeasonAndEpisode(media.id, 1, 1)
        : undefined;

    expect(episode?.watched).toBe(true);

    // Observer crashes were logged and swallowed, once per emission.
    expect(errorSpy).toHaveBeenCalledWith(
      "TV Time import progress observer failed",
      crashError,
    );

    const observerLogs = errorSpy.mock.calls.filter((call) =>
      call.includes(crashError),
    );

    expect(observerLogs).toHaveLength(emissions);
  });
});

describe("Phase 3H import history end-to-end", () => {
  beforeEach(async () => {
    await Promise.all([
      db.media.clear(),
      db.episodes.clear(),
      db.watchHistory.clear(),
      db.importHistory.clear(),
    ]);
    vi.restoreAllMocks();
  });

  it("persists a completed history record for a successful file import", async () => {
    prepareSuccessfulTmdbMocks();

    const blob = await createTvTimeZip({
      timeZone: "America/New_York",
      seenCreatedAt: "2021-01-14 10:00:00",
    });

    const result = await executeTvTimeImport(createZipFile(blob));

    expect(result).toEqual({
      importedShows: 1,
      skippedShows: 0,
      failedShows: 0,
      importedWatchedEpisodes: 1,
      alreadyWatchedEpisodes: 0,
      missingWatchedEpisodes: 0,
      skippedWatchedEpisodes: 0,
      failedWatchedEpisodes: 0,
      shows: expect.any(Array),
    });

    const [record] = await importHistoryRepository.list();

    expect(record).toMatchObject({
      provider: "tv-time",
      sourceFileName: "tvtime-export.zip",
      timezone: "America/New_York",
      status: "completed",
      totalShows: 1,
      newShows: 1,
      existingShows: 0,
      unmatchedShows: 0,
      plannedWatchedEpisodes: 1,
      warnings: [],
      importedShows: 1,
      skippedShows: 0,
      failedShows: 0,
      importedWatchedEpisodes: 1,
      alreadyWatchedEpisodes: 0,
      missingWatchedEpisodes: 0,
      skippedWatchedEpisodes: 0,
      failedWatchedEpisodes: 0,
    });

    // Only genuinely failed runs carry an errorMessage.
    expect(record?.errorMessage).toBeUndefined();

    // Date fields survive the IndexedDB round-trip as hydrated Dates.
    const startedAtTime = record?.startedAt.getTime() ?? 0;
    const completedAtTime = record?.completedAt.getTime() ?? 0;

    expect(record?.startedAt).toBeInstanceOf(Date);
    expect(record?.completedAt).toBeInstanceOf(Date);
    expect(startedAtTime).toBeLessThanOrEqual(completedAtTime);
    expect(record?.durationMs).toBe(completedAtTime - startedAtTime);
    expect(record?.durationMs).toBeGreaterThanOrEqual(0);

    // Read-back by id rehydrates the same instants.
    const readBack =
      record?.id !== undefined
        ? await importHistoryRepository.getById(record.id)
        : undefined;

    expect(readBack?.startedAt).toBeInstanceOf(Date);
    expect(readBack?.startedAt.getTime()).toBe(startedAtTime);
    expect(readBack?.completedAt.getTime()).toBe(completedAtTime);
  });

  it("persists a partial history record when a show fails mid-execution", async () => {
    const lostTvResult = createTmdbTvResult({
      id: 4608,
      name: "Lost",
      original_name: "Lost",
      first_air_date: "2004-09-22",
      popularity: 95,
    });

    vi.spyOn(tmdbSearchService, "searchTvShows").mockImplementation(
      async (query: string) => {
        if (query.includes("Breaking")) {
          return {
            page: 1,
            results: [createTmdbTvResult()],
            total_pages: 1,
            total_results: 1,
          };
        }

        if (query.includes("Lost")) {
          return {
            page: 1,
            results: [lostTvResult],
            total_pages: 1,
            total_results: 1,
          };
        }

        return {
          page: 1,
          results: [],
          total_pages: 0,
          total_results: 0,
        };
      },
    );

    vi.spyOn(tmdbTvService, "getTvDetails").mockImplementation(
      async (tmdbId: number) => ({
        ...createTmdbTvDetails(),
        id: tmdbId,
        name: tmdbId === 1396 ? "Breaking Bad" : "Lost",
      }),
    );

    vi.spyOn(tmdbTvService, "getSeasonDetails").mockImplementation(
      async (tmdbId: number) => {
        if (tmdbId === 4608) {
          throw new Error("Simulated TMDB season failure");
        }

        return createTmdbTvSeasonDetails();
      },
    );

    const blob = await createTvTimeZip({
      shows: [
        { id: "tvtime-breaking-bad", title: "Breaking Bad (2008)" },
        { id: "tvtime-lost", title: "Lost (2004)" },
      ],
      seenEpisodes: [
        { title: "Breaking Bad (2008)", season: 1, episode: 1 },
        { title: "Lost (2004)", season: 1, episode: 1 },
      ],
    });

    const result = await executeTvTimeImportPlan(
      await buildTvTimeImportPlan(createZipFile(blob)),
    );

    // The first show imported; the second failed and was rolled back. Its
    // watched row then finds no episode → EPISODE_MISSING.
    expect(result.importedShows).toBe(1);
    expect(result.failedShows).toBe(1);
    expect(result.importedWatchedEpisodes).toBe(1);
    expect(result.missingWatchedEpisodes).toBe(1);

    expect(await mediaRepository.getByTmdbId(1396, "tv")).toBeDefined();
    expect(await mediaRepository.getByTmdbId(4608, "tv")).toBeUndefined();

    const [record] = await importHistoryRepository.list();

    // Execution COMPLETED with failures → "partial", never "failed".
    expect(record).toMatchObject({
      provider: "tv-time",
      status: "partial",
      timezone: "Asia/Kolkata",
      totalShows: 2,
      newShows: 2,
      existingShows: 0,
      unmatchedShows: 0,
      plannedWatchedEpisodes: 2,
      importedShows: 1,
      skippedShows: 0,
      failedShows: 1,
      importedWatchedEpisodes: 1,
      alreadyWatchedEpisodes: 0,
      missingWatchedEpisodes: 1,
      skippedWatchedEpisodes: 0,
      failedWatchedEpisodes: 0,
    });

    expect(record?.errorMessage).toBeUndefined();
  });

  it("records failed history with zeroed execution counters when the whole execution throws", async () => {
    const plan = await buildAmbiguousPlan();

    // Defense-in-depth: an unresolved review aborts the whole execution.
    await expect(executeTvTimeImportPlan(plan)).rejects.toThrow(
      /Unresolved TV Time match review/,
    );

    // Nothing reached the library.
    expect(await db.media.count()).toBe(0);
    expect(await db.episodes.count()).toBe(0);
    expect(await db.watchHistory.count()).toBe(0);

    expect(await importHistoryRepository.count()).toBe(1);

    const [record] = await importHistoryRepository.list();

    expect(record).toMatchObject({
      provider: "tv-time",
      status: "failed",
      // Plan context is preserved even though execution never ran.
      totalShows: 1,
      newShows: 1,
      existingShows: 0,
      unmatchedShows: 0,
      plannedWatchedEpisodes: 1,
      // A null result zeroes every execution counter.
      importedShows: 0,
      skippedShows: 0,
      failedShows: 0,
      importedWatchedEpisodes: 0,
      alreadyWatchedEpisodes: 0,
      missingWatchedEpisodes: 0,
      skippedWatchedEpisodes: 0,
      failedWatchedEpisodes: 0,
    });
  });

  it("captures the escaped error message on the failed history record", async () => {
    const plan = await buildAmbiguousPlan();

    let thrownError: unknown;

    try {
      await executeTvTimeImportPlan(plan);
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toBeInstanceOf(Error);
    expect((thrownError as Error).message).toMatch(
      /Unresolved TV Time match review/,
    );

    const records = await importHistoryRepository.list();

    // Exactly one record: the failure record, with no completed duplicates.
    expect(records).toHaveLength(1);
    expect(records[0]?.status).toBe("failed");
    expect(records[0]?.errorMessage).toBe((thrownError as Error).message);
  });

  it("records user-skipped shows and their unattributed watched rows in history", async () => {
    prepareSuccessfulTmdbMocksWithRivals();

    const blob = await createTvTimeZip();
    const plan = await buildTvTimeImportPlan(createZipFile(blob));

    const resolved = applyImportResolutions(plan, {
      "tvtime-breaking-bad": { decision: "skip" },
    });

    const result = await executeTvTimeImportPlan(resolved);

    expect(result.importedShows).toBe(0);
    expect(result.skippedShows).toBe(1);
    expect(result.importedWatchedEpisodes).toBe(0);
    expect(result.skippedWatchedEpisodes).toBe(1);

    expect(await db.media.count()).toBe(0);

    const [record] = await importHistoryRepository.list();

    expect(record).toMatchObject({
      status: "completed",
      totalShows: 1,
      newShows: 1,
      importedShows: 0,
      skippedShows: 1,
      failedShows: 0,
      plannedWatchedEpisodes: 1,
      importedWatchedEpisodes: 0,
      skippedWatchedEpisodes: 1,
    });

    expect(record?.errorMessage).toBeUndefined();
  });

  it("records unmatched shows as skipped without failing the import history", async () => {
    // Breaking Bad matches; the unknown title never matches TMDB.
    vi.spyOn(tmdbSearchService, "searchTvShows").mockImplementation(
      async (query: string) => {
        if (query.includes("Breaking")) {
          return {
            page: 1,
            results: [createTmdbTvResult()],
            total_pages: 1,
            total_results: 1,
          };
        }

        return {
          page: 1,
          results: [],
          total_pages: 0,
          total_results: 0,
        };
      },
    );

    vi.spyOn(tmdbTvService, "getTvDetails").mockResolvedValue(
      createTmdbTvDetails(),
    );

    vi.spyOn(tmdbTvService, "getSeasonDetails").mockResolvedValue(
      createTmdbTvSeasonDetails(),
    );

    const blob = await createTvTimeZip({
      shows: [
        { id: "tvtime-breaking-bad", title: "Breaking Bad (2008)" },
        { id: "tvtime-unknown", title: "Totally Unknown Show 123" },
      ],
      seenEpisodes: [{ title: "Breaking Bad (2008)", season: 1, episode: 1 }],
    });

    const result = await executeTvTimeImportPlan(
      await buildTvTimeImportPlan(createZipFile(blob)),
    );

    expect(result.importedShows).toBe(1);
    expect(result.skippedShows).toBe(1);
    expect(result.failedShows).toBe(0);

    // Only the matched show reached the library.
    expect(await db.media.count()).toBe(1);

    const [record] = await importHistoryRepository.list();

    expect(record).toMatchObject({
      status: "completed",
      totalShows: 2,
      newShows: 1,
      unmatchedShows: 1,
      importedShows: 1,
      skippedShows: 1,
      failedShows: 0,
      plannedWatchedEpisodes: 1,
      importedWatchedEpisodes: 1,
    });

    expect(record?.errorMessage).toBeUndefined();
  });

  it("accounts for EPISODE_MISSING watched rows in history without failing the import", async () => {
    prepareSuccessfulTmdbMocks();

    const blob = await createTvTimeZip({
      seenEpisodes: [
        { title: "Breaking Bad (2008)", season: 1, episode: 1 },
        { title: "Breaking Bad (2008)", season: 1, episode: 5 },
      ],
    });

    const result = await executeTvTimeImportPlan(
      await buildTvTimeImportPlan(createZipFile(blob)),
    );

    expect(result.importedWatchedEpisodes).toBe(1);
    expect(result.missingWatchedEpisodes).toBe(1);

    // The missing episode is never created and never receives watch history.
    expect(await db.episodes.count()).toBe(1);
    expect(await db.watchHistory.count()).toBe(1);

    const [record] = await importHistoryRepository.list();

    // A missing episode is an explicit, auditable outcome — not a failure.
    expect(record).toMatchObject({
      status: "completed",
      plannedWatchedEpisodes: 2,
      importedWatchedEpisodes: 1,
      missingWatchedEpisodes: 1,
      failedWatchedEpisodes: 0,
      failedShows: 0,
    });

    expect(record?.errorMessage).toBeUndefined();
  });

  it("appends a second history record for a re-import and orders records newest first", async () => {
    prepareSuccessfulTmdbMocks();

    const blob = await createTvTimeZip({
      seenCreatedAt: "2021-01-14 10:00:00",
    });

    const plan = await buildTvTimeImportPlan(createZipFile(blob));

    const firstResult = await executeTvTimeImportPlan(plan);

    expect(firstResult.importedShows).toBe(1);
    expect(firstResult.importedWatchedEpisodes).toBe(1);

    const secondResult = await executeTvTimeImportPlan(plan);

    // Idempotent: the show now exists and the episode is already watched.
    expect(secondResult.importedShows).toBe(0);
    expect(secondResult.skippedShows).toBe(1);
    expect(secondResult.importedWatchedEpisodes).toBe(0);
    expect(secondResult.alreadyWatchedEpisodes).toBe(1);

    // No duplicate library data was created by the second run.
    expect(await db.media.count()).toBe(1);
    expect(await db.episodes.count()).toBe(1);
    expect(await db.watchHistory.count()).toBe(1);

    const records = await importHistoryRepository.list();

    expect(records).toHaveLength(2);

    // Newest first: the re-import record leads.
    expect(records[0]).toMatchObject({
      status: "completed",
      importedShows: 0,
      skippedShows: 1,
      importedWatchedEpisodes: 0,
      alreadyWatchedEpisodes: 1,
    });

    expect(records[1]).toMatchObject({
      status: "completed",
      importedShows: 1,
      skippedShows: 0,
      importedWatchedEpisodes: 1,
      alreadyWatchedEpisodes: 0,
    });

    expect(records[0]?.completedAt.getTime()).toBeGreaterThanOrEqual(
      records[1]?.completedAt.getTime() ?? 0,
    );
  });

  it("preserves local watch state and records the already-watched outcome in history", async () => {
    prepareSuccessfulTmdbMocks();

    // First import watches S01E01 at the TV Time timestamp.
    const firstBlob = await createTvTimeZip({
      timeZone: "America/New_York",
      seenCreatedAt: "2021-01-14 10:00:00",
    });

    await executeTvTimeImportPlan(
      await buildTvTimeImportPlan(createZipFile(firstBlob)),
    );

    // A second export reports the same episode watched at a DIFFERENT time.
    const secondBlob = await createTvTimeZip({
      timeZone: "America/New_York",
      seenCreatedAt: "2022-06-01 12:00:00",
    });

    const secondResult = await executeTvTimeImportPlan(
      await buildTvTimeImportPlan(createZipFile(secondBlob)),
    );

    expect(secondResult.alreadyWatchedEpisodes).toBe(1);
    expect(secondResult.importedWatchedEpisodes).toBe(0);

    // LOCAL WATCH STATE ALWAYS WINS: the original watchedAt and the single
    // history event survive the re-import untouched.
    const media = await mediaRepository.getByTmdbId(1396, "tv");

    const episode =
      media?.id !== undefined
        ? await episodeRepository.getByShowSeasonAndEpisode(media.id, 1, 1)
        : undefined;

    expect(episode?.watchedAt?.toISOString()).toBe("2021-01-14T15:00:00.000Z");
    expect(await db.watchHistory.count()).toBe(1);

    const [latestRecord] = await importHistoryRepository.list();

    expect(latestRecord).toMatchObject({
      status: "completed",
      alreadyWatchedEpisodes: 1,
      importedWatchedEpisodes: 0,
    });

    expect(latestRecord?.errorMessage).toBeUndefined();
  });

  it("persists the resolved export timezone that interpreted the watched timestamps", async () => {
    prepareSuccessfulTmdbMocks();

    const blob = await createTvTimeZip({
      timeZone: "Asia/Kolkata",
      seenCreatedAt: "2020-01-01 05:00:00",
    });

    await executeTvTimeImport(createZipFile(blob));

    const media = await mediaRepository.getByTmdbId(1396, "tv");

    const episode =
      media?.id !== undefined
        ? await episodeRepository.getByShowSeasonAndEpisode(media.id, 1, 1)
        : undefined;

    // The watched instant was interpreted through the export timezone.
    expect(episode?.watchedAt?.toISOString()).toBe("2019-12-31T23:30:00.000Z");

    const [record] = await importHistoryRepository.list();

    // History persists the same timezone that performed the interpretation.
    expect(record?.timezone).toBe("Asia/Kolkata");
  });

  it("keeps the import successful when persisting history fails", async () => {
    prepareSuccessfulTmdbMocks();

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.spyOn(importHistoryRepository, "add").mockRejectedValue(
      new Error("IndexedDB unavailable"),
    );

    const blob = await createTvTimeZip({
      seenCreatedAt: "2021-01-14 10:00:00",
    });

    const result = await executeTvTimeImportPlan(
      await buildTvTimeImportPlan(createZipFile(blob)),
    );

    // The import itself is unaffected: full success counters, real writes.
    expect(result).toEqual({
      importedShows: 1,
      skippedShows: 0,
      failedShows: 0,
      importedWatchedEpisodes: 1,
      alreadyWatchedEpisodes: 0,
      missingWatchedEpisodes: 0,
      skippedWatchedEpisodes: 0,
      failedWatchedEpisodes: 0,
      shows: expect.any(Array),
    });

    expect(await db.media.count()).toBe(1);
    expect(await db.episodes.count()).toBe(1);
    expect(await db.watchHistory.count()).toBe(1);

    // History stayed empty; the failure was logged, never propagated.
    expect(await db.importHistory.count()).toBe(0);
    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to persist import history",
      expect.any(Error),
    );
  });
});
