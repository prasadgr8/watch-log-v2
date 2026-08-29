import { mediaRepository } from "../../../database/repositories";
import {
  mapTmdbResultToMedia,
  tmdbSearchService,
} from "../../../services/tmdb";
import type { TmdbTvSearchResult } from "../../../services/tmdb/tmdbTypes";
import type { Media, PersistedMedia } from "../../../types";
import { libraryService } from "../../library/services/libraryService";
import type { ImportCandidate } from "../types/importCandidate";
import type {
  TvTimeMatchCandidate,
  TvTimeMatchReview,
} from "../types/tvTimeImportPlan";

interface ParsedTvTimeTitle {
  title: string;
  year?: number;
}

function parseTvTimeTitle(value: string): ParsedTvTimeTitle {
  const trimmed = value.trim();

  if (!trimmed) {
    return {
      title: "",
    };
  }

  const yearMatch = trimmed.match(/\s*\((\d{4})\)\s*$/);

  if (!yearMatch || yearMatch.index === undefined) {
    return {
      title: trimmed,
    };
  }

  return {
    title: trimmed.slice(0, yearMatch.index).trim(),
    year: Number(yearMatch[1]),
  };
}

function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function getResultYear(result: TmdbTvSearchResult): number | undefined {
  const year = result.first_air_date?.slice(0, 4);

  if (!year || !/^\d{4}$/.test(year)) {
    return undefined;
  }

  return Number(year);
}

function scoreTvResult(
  result: TmdbTvSearchResult,
  parsedTitle: ParsedTvTimeTitle,
): number {
  const wantedTitle = normalizeTitle(parsedTitle.title);

  if (!wantedTitle) {
    return -1;
  }

  const resultName = normalizeTitle(result.name);
  const originalName = normalizeTitle(result.original_name);

  let score = 0;

  // Exact title matches are strongest.
  if (resultName === wantedTitle) {
    score += 100;
  } else if (originalName === wantedTitle) {
    score += 95;
  }

  // Useful for minor wording differences.
  else if (
    resultName.includes(wantedTitle) ||
    wantedTitle.includes(resultName)
  ) {
    score += 65;
  } else if (
    originalName.includes(wantedTitle) ||
    wantedTitle.includes(originalName)
  ) {
    score += 60;
  }

  const resultYear = getResultYear(result);

  if (parsedTitle.year !== undefined) {
    if (resultYear === parsedTitle.year) {
      score += 50;
    } else if (resultYear !== undefined) {
      score -= 25;
    }
  }

  return score;
}

/**
 * Score at or above which a TMDB result is considered a confident match.
 * Previously an inline literal inside findBestResult().
 */
const TMDB_ACCEPT_SCORE = 60;

/**
 * Top-two score gap below which the best match is treated as ambiguous and
 * surfaced for review. Mirrors the scorer's own year-mismatch penalty so the
 * boundary stays proportional to the existing scale. This only ADDS review
 * visibility; acceptance rules are unchanged.
 */
const TV_TIME_REVIEW_SCORE_GAP = 25;

interface RankedTvTimeCandidate {
  tmdbShow: TmdbTvSearchResult;
  score: number;
}

function rankCompatibleResults(
  results: TmdbTvSearchResult[],
  parsedTitle: ParsedTvTimeTitle,
): RankedTvTimeCandidate[] {
  const compatibleResults = results.filter((result) => {
    if (parsedTitle.year === undefined) {
      return true;
    }

    const resultYear = getResultYear(result);

    return resultYear === undefined || resultYear === parsedTitle.year;
  });

  return compatibleResults
    .map((result) => ({
      tmdbShow: result,
      score: scoreTvResult(result, parsedTitle),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return (b.tmdbShow.popularity ?? 0) - (a.tmdbShow.popularity ?? 0);
    });
}

function isAcceptedTmdbMatch(
  rawResults: TmdbTvSearchResult[],
  parsedTitle: ParsedTvTimeTitle,
  best: RankedTvTimeCandidate,
): boolean {
  // If TMDB returned exactly one result and its first-air year
  // matches the TV Time year, accept it even when the title
  // is an international/translated title.
  if (
    rawResults.length === 1 &&
    parsedTitle.year !== undefined &&
    getResultYear(best.tmdbShow) === parsedTitle.year &&
    best.score >= TMDB_ACCEPT_SCORE
  ) {
    console.log(
      "Accepted single TMDB result by matching year:",
      parsedTitle.title,
      "→",
      best.tmdbShow.name,
    );

    return true;
  }

  return best.score >= TMDB_ACCEPT_SCORE;
}

/**
 * Classifies whether the ranked candidates contain a genuinely ambiguous
 * match that should be surfaced for user review instead of silently using
 * the top-ranked candidate. Purely additive: a null result preserves
 * today's automatic behavior exactly.
 */
export function getTvTimeMatchReview(
  candidates: TvTimeMatchCandidate[],
): TvTimeMatchReview | null {
  const qualifying = candidates.filter(
    (candidate) => candidate.score >= TMDB_ACCEPT_SCORE,
  );

  if (qualifying.length < 2) {
    return null;
  }

  if (qualifying[0].score - qualifying[1].score >= TV_TIME_REVIEW_SCORE_GAP) {
    return null;
  }

  return {
    status: "needs-review",
    reason: "multiple-plausible",
    bestScore: qualifying[0].score,
    candidates,
  };
}

interface TvTimeMatchResolution {
  /**
   * The TMDB show chosen by the existing scoring/fallback logic.
   */
  tmdbShow: TmdbTvSearchResult;

  /** Score of the chosen show. */
  bestScore: number;

  /**
   * Every compatible TMDB candidate, ranked best-first. Previously computed
   * and discarded inside findBestResult(); exposed for conflict review.
   */
  rankedCandidates: TvTimeMatchCandidate[];

  /**
   * The library record this match would produce. This is a transient value:
   * the resolver never persists it.
   */
  media: Media;

  /**
   * Present when the matched TMDB ID already exists in the library, meaning
   * execution must not create a duplicate record.
   */
  existingMedia?: PersistedMedia;
}

/**
 * Performs the existing TMDB searches (primary query, fallbacks, original
 * title retry) and scores the results. Read-only: network reads only.
 */
async function searchTmdbForCandidate(
  parsedTitle: ParsedTvTimeTitle,
  candidate: ImportCandidate,
): Promise<{
  results: TmdbTvSearchResult[];
  rankedCandidates: RankedTvTimeCandidate[];
  best: RankedTvTimeCandidate | null;
}> {
  let response = await tmdbSearchService.searchTvShows(
    parsedTitle.title,
    1,
    parsedTitle.year,
  );
  if (response.results.length === 0) {
    const fallbackQueries = [
      parsedTitle.title.split(":")[0]?.trim(),
      parsedTitle.title.split(" - ")[0]?.trim(),
    ].filter(
      (query): query is string => Boolean(query) && query !== parsedTitle.title,
    );

    for (const fallbackQuery of fallbackQueries) {
      response = await tmdbSearchService.searchTvShows(
        fallbackQuery,
        1,
        parsedTitle.year,
      );

      if (response.results.length > 0) {
        console.log(
          "TV Time fallback search:",
          parsedTitle.title,
          "→",
          fallbackQuery,
        );
        break;
      }
    }
  }
  // Fallback: if removing the year produced no result,
  // try the original TV Time value.
  if (
    response.results.length === 0 &&
    parsedTitle.title !== candidate.title.trim()
  ) {
    response = await tmdbSearchService.searchTvShows(
      candidate.title,
      1,
      parsedTitle.year,
    );
  }

  const rankedCandidates = rankCompatibleResults(response.results, parsedTitle);

  const best =
    rankedCandidates[0] &&
    isAcceptedTmdbMatch(response.results, parsedTitle, rankedCandidates[0])
      ? rankedCandidates[0]
      : null;

  if (best) {
    console.log(
      "Best TV Time candidate:",
      parsedTitle.title,
      "→",
      best.tmdbShow.name,
      `score=${best.score}`,
    );
  }

  return {
    results: response.results,
    rankedCandidates,
    best,
  };
}

/**
 * Resolves a TV Time candidate to a TMDB show WITHOUT mutating IndexedDB.
 *
 * This is the read-only half of the former findBestTvdbMatch(): it performs
 * the TMDB searches, preserves the scoring/fallback rules, maps the result to
 * the library domain, and detects whether the show already exists. Library
 * creation (libraryService.addMedia) is deliberately left to the import
 * executor so a dry-run plan can be built without writing.
 */
export async function resolveTvTimeMatch(
  candidate: ImportCandidate,
): Promise<TvTimeMatchResolution | null> {
  const parsedTitle = parseTvTimeTitle(candidate.title);

  // Invalid/empty TV Time records should never reach TMDB.
  if (!parsedTitle.title) {
    console.warn("Skipping TV Time record with empty show title:", candidate);

    return null;
  }

  const { results, rankedCandidates, best } = await searchTmdbForCandidate(
    parsedTitle,
    candidate,
  );

  if (!best) {
    console.warn(
      "No match found:",
      candidate.title,
      parsedTitle.year ? `(parsed year: ${parsedTitle.year})` : "",
      `TMDB results=${results.length}`,
    );

    return null;
  }

  console.log(
    "TV Time match:",
    candidate.title,
    "→",
    `${best.tmdbShow.name} (${getResultYear(best.tmdbShow) ?? "unknown"})`,
  );

  const media = mapTmdbResultToMedia(best.tmdbShow, {
    userStatus: candidate.watchStatus,
  });

  const existingMedia =
    media.tmdbId !== undefined
      ? await mediaRepository.getByTmdbId(media.tmdbId, media.mediaType)
      : undefined;

  if (existingMedia) {
    console.log("Already in library, skipping:", media.title);

    console.log("Existing Media Record:", existingMedia);

    return {
      tmdbShow: best.tmdbShow,
      bestScore: best.score,
      rankedCandidates,
      media,
      existingMedia: existingMedia as PersistedMedia,
    };
  }

  return {
    tmdbShow: best.tmdbShow,
    bestScore: best.score,
    rankedCandidates,
    media,
  };
}

/**
 * Legacy matcher entry point retained for compatibility with existing tests
 * and callers. It resolves the match read-only and then performs the library
 * creation that used to live inline in this function.
 */
export async function findBestTvdbMatch(candidate: ImportCandidate) {
  const resolution = await resolveTvTimeMatch(candidate);

  if (!resolution) {
    return null;
  }

  if (resolution.existingMedia) {
    return {
      status: "skipped" as const,
      media: resolution.existingMedia,
    };
  }

  const mediaId = await libraryService.addMedia(resolution.media);

  const importedMedia = {
    ...resolution.media,
    id: mediaId,
  };

  console.log("Imported:", importedMedia.title);

  return {
    status: "imported" as const,
    media: importedMedia,
  };
}
