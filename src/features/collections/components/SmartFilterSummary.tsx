import type { MediaFilterState } from "../../../domain/filters/mediaFilterModel";

interface SmartFilterSummaryProps {
  filters: MediaFilterState;
}

/**
 * Presentational summary of a Smart Collection's active filters.
 * Does NOT perform filtering - it only renders the persisted filter state as
 * readable tags. Evaluation remains with the shared filter engine.
 */
export default function SmartFilterSummary({
  filters,
}: SmartFilterSummaryProps) {
  const tags: string[] = [];

  if (filters.search.trim()) {
    tags.push(`Search: ${filters.search.trim()}`);
  }

  if (filters.mediaType === "movie") {
    tags.push("Movies");
  } else if (filters.mediaType === "tv") {
    tags.push("TV Shows");
  }

  if (filters.status !== "all") {
    const label =
      filters.status === "on-hold"
        ? "On Hold"
        : filters.status.charAt(0).toUpperCase() + filters.status.slice(1);
    tags.push(label);
  }

  if (filters.minRating !== null) {
    tags.push(`Rating >= ${filters.minRating}`);
  }

  if (filters.favoritesOnly) {
    tags.push("Favorites");
  }

  if (filters.selectedGenres.length > 0) {
    tags.push(filters.selectedGenres.join(" OR "));
  }

  if (tags.length === 0) {
    return <p className="text-sm text-muted">All library media</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center rounded-md bg-surface-elevated px-3 py-1 text-xs font-medium text-primary"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}