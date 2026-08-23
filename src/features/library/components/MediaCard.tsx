import { Film, Pencil, Trash2, Tv } from "lucide-react";
import { Link } from "react-router-dom";

import type { PersistedMedia } from "../../../types";

import { watchStatusOptions } from "../libraryOptions";

interface MediaCardProps {
  media: PersistedMedia;
  onDelete: (id: number) => Promise<void>;
  onEdit: (media: PersistedMedia) => void;
}

export default function MediaCard({
  media,
  onDelete,
  onEdit,
}: MediaCardProps) {
  const statusLabel =
    watchStatusOptions.find((status) => status.value === media.userStatus)
      ?.label ?? media.userStatus;

  const mediaContent = (
    <>
      <div className="rounded-lg bg-surface-elevated p-2 text-accent-text">
        {media.mediaType === "tv" ? (
          <Tv className="h-5 w-5" />
        ) : (
          <Film className="h-5 w-5" />
        )}
      </div>

      <div className="min-w-0">
        <h3 className="truncate font-semibold text-primary">{media.title}</h3>

        <p className="mt-1 text-sm text-muted">
          {media.mediaType === "tv" ? "TV Show" : "Movie"}
        </p>
      </div>
    </>
  );

  return (
    <article className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        {media.mediaType === "tv" ? (
          <Link
            to={`/library/tv/${media.id}`}
            aria-label={`View ${media.title} details`}
            className="flex min-w-0 items-start gap-3 rounded-lg transition hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-accent-hover/40"
          >
            {mediaContent}
          </Link>
        ) : (
          <div className="flex min-w-0 items-start gap-3">{mediaContent}</div>
        )}

        <div className="flex items-center gap-2">
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
      </div>

      <div className="mt-5">
        <span className="inline-flex rounded-full bg-surface-elevated px-3 py-1 text-xs font-medium text-muted">
          {statusLabel}
        </span>
      </div>
    </article>
  );
}
