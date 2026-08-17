import { mediaRepository } from "../../../database/repositories";
import {
  mapTmdbResultToMedia,
  tmdbSearchService,
} from "../../../services/tmdb";
import type { TmdbTvSearchResult } from "../../../services/tmdb/tmdbTypes";
import { libraryService } from "../../library/services/libraryService";
import type { ImportCandidate } from "../types/importCandidate";

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

function findBestResult(
  results: TmdbTvSearchResult[],
  parsedTitle: ParsedTvTimeTitle,
): TmdbTvSearchResult | null {
  if (!parsedTitle.title || results.length === 0) {
    return null;
  }

  const compatibleResults = results.filter((result) => {
    if (parsedTitle.year === undefined) {
      return true;
    }

    const resultYear = getResultYear(result);

    return resultYear === undefined || resultYear === parsedTitle.year;
  });

  if (compatibleResults.length === 0) {
    return null;
  }

  const ranked = compatibleResults
    .map((result) => ({
      result,
      score: scoreTvResult(result, parsedTitle),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return (b.result.popularity ?? 0) - (a.result.popularity ?? 0);
    });

  const best = ranked[0];

  if (!best) {
    return null;
  }

  // If TMDB returned exactly one result and its first-air year
  // matches the TV Time year, accept it even when the title
  // is an international/translated title.
  if (
    results.length === 1 &&
    parsedTitle.year !== undefined &&
    getResultYear(best.result) === parsedTitle.year
  ) {
    console.log(
      "Accepted single TMDB result by matching year:",
      parsedTitle.title,
      "→",
      best.result.name,
    );

    return best.result;
  }

  if (best.score < 60) {
    return null;
  }

  console.log(
    "Best TV Time candidate:",
    parsedTitle.title,
    "→",
    best.result.name,
    `score=${best.score}`,
  );

  return best.result;
}

export async function findBestTvdbMatch(candidate: ImportCandidate) {
  const parsedTitle = parseTvTimeTitle(candidate.title);

  // Invalid/empty TV Time records should never reach TMDB.
  if (!parsedTitle.title) {
    console.warn("Skipping TV Time record with empty show title:", candidate);

    return null;
  }

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

  const bestResult = findBestResult(response.results, parsedTitle);

  if (!bestResult) {
    console.warn(
      "No match found:",
      candidate.title,
      parsedTitle.year ? `(parsed year: ${parsedTitle.year})` : "",
      `TMDB results=${response.results.length}`,
    );

    return null;
  }

  console.log(
    "TV Time match:",
    candidate.title,
    "→",
    `${bestResult.name} (${getResultYear(bestResult) ?? "unknown"})`,
  );

  const media = mapTmdbResultToMedia(bestResult, {
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
      status: "skipped" as const,
      media: existingMedia,
    };
  }

  const mediaId = await libraryService.addMedia(media);

  const importedMedia = {
    ...media,
    id: mediaId,
  };

  console.log("Imported:", importedMedia.title);

  return {
    status: "imported" as const,
    media: importedMedia,
  };
}
