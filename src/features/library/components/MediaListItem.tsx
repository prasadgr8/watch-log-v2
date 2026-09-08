import { Film, Pencil, Star, Trash2, Tv } from "lucide-react";
import { Link } from "react-router-dom";

import type { PersistedMedia } from "../../../types";

import { watchStatusOptions } from "../libraryOptions";

interface MediaListItemProps {
  media: PersistedMedia;
  onDelete: (id: number) => Promise<void>;
  onEdit: (media: PersistedMedia) => void;
  onToggleFavorite: (media: PersistedMedia) => Promise<void>;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelected?: (media: PersistedMedia) => void;
}

/*
 * Compact list presentation of a library media record. Shares the exact props
 * contract and action semantics with MediaCard so LibraryPage can drive both
 * presentations from the same array and handlers.
 */
export default function MediaListItem({
  media,
  onDelete,
  onEdit,
  onToggleFavorite,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelected,
}: MediaListItemProps) {
  const statusLabel =
    watchStatusOptions.find((status) => status.value === media.userStatus)
      ?.label ?? media.userStatus;

  return (
    <article className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-surface p-4">
      {isSelectionMode && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelected?.(media)}
          aria-label={`Select ${media.title}`}
          className="h-4 w-4 shrink-0 rounded border-border accent-accent"
        />
      )}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="shrink-0 rounded-lg bg-surface-elevated p-2 text-accent-text">
          {media.mediaType === "tv" ? (
            <Tv className="h-5 w-5" />
          ) : (
            <Film className="h-5 w-5" />
          )}
        </div>

        {media.mediaType === "tv" ? (
          <Link
            to={`/library/tv/${media.id}`}
            aria-label={`View ${media.title} details`}
            className="min-w-0 rounded-lg transition hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-accent-hover/40"
          >
            <h3 className="truncate font-semibold text-primary">{media.title}</h3>

            <p className="mt-1 text-sm text-muted">TV Show</p>
          </Link>
        ) : (
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-primary">{media.title}</h3>

            <p className="mt-1 text-sm text-muted">Movie</p>
          </div>
        )}
      </div>

      <span className="shrink-0 rounded-full bg-surface-elevated px-3 py-1 text-xs font-medium text-muted">
        {statusLabel}
      </span>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            void onToggleFavorite(media);
          }}
          aria-label={
            media.favorite
              ? `Remove ${media.title} from favorites`
              : `Add ${media.title} to favorites`
          }
          aria-pressed={media.favorite === true}
          className={`rounded-lg p-2 transition hover:bg-accent/15 ${
            media.favorite
              ? "text-warning"
              : "text-muted hover:text-accent-text"
          }`}
        >
          <Star
            className="h-4 w-4"
            fill={media.favorite ? "currentColor" : "none"}
          />
        </button>

        <button
          type="button"
          onClick={() => onEdit(media)}
          aria-label={`Edit ${media.title}`}
          className="rounded-lg p-2 text-muted transition hover:bg-accent/15 hover:text-accent-text"
        >
          <Pencil className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => void onDelete(media.id)}
          aria-label={`Delete ${media.title}`}
          className="rounded-lg p-2 text-muted transition hover:bg-danger/10 hover:text-danger"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}
