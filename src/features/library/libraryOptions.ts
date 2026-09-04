import type { WatchStatus } from "../../types";

export const watchStatusOptions: {
  value: WatchStatus;
  label: string;
}[] = [
  {
    value: "planned",
    label: "Plan to Watch",
  },
  {
    value: "watching",
    label: "Watching",
  },
  {
    value: "completed",
    label: "Completed",
  },
  {
    value: "on-hold",
    label: "On Hold",
  },
  {
    value: "dropped",
    label: "Dropped",
  },
];

export const librarySortOptions = [
  { value: "recent", label: "Recently Added" },
  { value: "title-asc", label: "Title (A–Z)" },
  { value: "title-desc", label: "Title (Z–A)" },
  { value: "year-desc", label: "Year (Newest)" },
  { value: "year-asc", label: "Year (Oldest)" },
  { value: "rating-desc", label: "Rating" },
  { value: "progress-desc", label: "Progress (High to Low)" },
  { value: "progress-asc", label: "Progress (Low to High)" },
];

export const libraryRatingFilterOptions = [
  { value: "any", label: "Any Rating" },
  { value: "7", label: "7+" },
  { value: "8", label: "8+" },
  { value: "9", label: "9+" },
  { value: "10", label: "10+" },
];
