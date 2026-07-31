import type { PersistedMedia  } from "../../../types/media";

export type LibrarySort =
  | "recent"
  | "title-asc"
  | "title-desc"
  | "year-desc"
  | "year-asc"
  | "rating-desc";

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

case "year-desc":
case "year-asc":
  return sorted;

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