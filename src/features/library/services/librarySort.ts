import type { PersistedMedia } from "../../../types/media";

export type LibrarySort =
  | "recent"
  | "title-asc"
  | "title-desc"
  | "year-desc"
  | "year-asc"
  | "rating-desc";

function getMediaYear(media: PersistedMedia): number | undefined {
  const dateString =
    media.mediaType === "tv" ? media.firstAirDate : media.releaseDate;

  if (!dateString || dateString.length < 4) {
    return undefined;
  }

  const year = parseInt(dateString.substring(0, 4), 10);
  return Number.isNaN(year) ? undefined : year;
}

function compareByYear(
  a: PersistedMedia,
  b: PersistedMedia,
  descending: boolean,
): number {
  const yearA = getMediaYear(a);
  const yearB = getMediaYear(b);

  if (yearA === undefined && yearB === undefined) {
    return 0;
  }
  if (yearA === undefined) {
    return 1;
  }
  if (yearB === undefined) {
    return -1;
  }

  return descending ? yearB - yearA : yearA - yearB;
}

export function sortLibrary(
  media: PersistedMedia[],
  sort: LibrarySort,
): PersistedMedia[] {
  const sorted = [...media];

  switch (sort) {
    case "title-asc":
      return sorted.sort((a, b) =>
        a.title.localeCompare(b.title),
      );

    case "title-desc":
      return sorted.sort((a, b) =>
        b.title.localeCompare(a.title),
      );

    case "year-asc":
      return sorted.sort((a, b) => compareByYear(a, b, false));

    case "year-desc":
      return sorted.sort((a, b) => compareByYear(a, b, true));

    case "rating-desc":
      return sorted.sort(
        (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
      );

    case "recent":
    default:
      return sorted.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime(),
      );
  }
}
