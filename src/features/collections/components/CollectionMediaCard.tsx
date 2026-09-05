import { Film, Tv, X } from "lucide-react";
import { Link } from "react-router-dom";

import type { PersistedMedia } from "../../../types";

interface CollectionMediaCardProps {
  media: PersistedMedia;
  onRemove: (id: number) => Promise<void>;
}

/*
 * Read-only media card for collection members. Visually follows the
 * established MediaCard but intentionally omits every destructive media
 * action (edit/delete): removing an item from a collection must never
 * delete the underlying media, episodes, or watch history. The only action
 * offered is "Remove from collection".
 */
export default function CollectionMediaCard({
  media,
  onRemove,
}: CollectionMediaCardProps) {
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

        <button
          type="button"
          onClick={() => void onRemove(media.id)}
          aria-label={`Remove ${media.title} from collection`}
          className="rounded-lg p-2 text-muted transition hover:bg-danger/10 hover:text-danger"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}
