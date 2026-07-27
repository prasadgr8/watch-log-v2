import type { Media } from "../../../database/models";

export type LibrarySort =
  | "recent"
  | "title-asc"
  | "title-desc"
  | "year-desc"
  | "year-asc"
  | "rating-desc";

export function sortLibrary(
  media: Media[],
  sort: LibrarySort,
): Media[] {
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

    case "year-desc":
      return sorted.sort((a, b) => b.year - a.year);

    case "year-asc":
      return sorted.sort((a, b) => a.year - b.year);

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