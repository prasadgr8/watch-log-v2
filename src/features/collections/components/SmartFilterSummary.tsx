import { useState } from "react";

import type { MediaFilterState } from "../../../domain/filters/mediaFilterModel";

interface SmartFilterSummaryProps {
  filters: MediaFilterState;
}

/** Number of tags shown before collapsing the rest behind "+N more". */
const VISIBLE_TAGS = 4;

/**
 * Presentational summary of a Smart Collection's active filters.
 * Does NOT perform filtering - it only renders the persisted filter state as
 * readable tags. Evaluation remains with the shared filter engine.
 *
 * Long summaries collapse deterministically: the first VISIBLE_TAGS tags are
 * shown and the remainder are available through a "+N more" toggle so no
 * information is lost and no horizontal overflow occurs.
 */
export default function SmartFilterSummary({
  filters,
}: SmartFilterSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
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

  const hiddenCount = tags.length - VISIBLE_TAGS;
  const visibleTags = isExpanded || hiddenCount <= 0
    ? tags
    : tags.slice(0, VISIBLE_TAGS);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {visibleTags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center rounded-md bg-surface-elevated px-3 py-1 text-xs font-medium text-primary"
        >
          {tag}
        </span>
      ))}
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setIsExpanded((expanded) => !expanded)}
          aria-expanded={isExpanded}
          className="inline-flex items-center rounded-md border border-border px-3 py-1 text-xs font-medium text-muted underline-offset-2 transition hover:bg-surface-elevated hover:text-primary hover:underline"
        >
          {isExpanded ? "Show less" : `+${hiddenCount} more`}
        </button>
      )}
    </div>
  );
}
