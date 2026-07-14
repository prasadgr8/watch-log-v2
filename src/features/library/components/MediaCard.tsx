import { Film, Trash2, Tv } from "lucide-react";
import { Link } from "react-router-dom";

import type { PersistedMedia } from "../../../types";

import { watchStatusOptions } from "../libraryOptions";

interface MediaCardProps {
  media: PersistedMedia;
  onDelete: (id: number) => Promise<void>;
}

export default function MediaCard({ media, onDelete }: MediaCardProps) {
  const statusLabel =
    watchStatusOptions.find((status) => status.value === media.userStatus)
      ?.label ?? media.userStatus;

  const mediaContent = (
    <>
      <div className="rounded-lg bg-slate-800 p-2 text-blue-400">
        {media.mediaType === "tv" ? (
          <Tv className="h-5 w-5" />
        ) : (
          <Film className="h-5 w-5" />
        )}
      </div>

      <div className="min-w-0">
        <h3 className="truncate font-semibold text-white">{media.title}</h3>

        <p className="mt-1 text-sm text-slate-400">
          {media.mediaType === "tv" ? "TV Show" : "Movie"}
        </p>
      </div>
    </>
  );

  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-start justify-between gap-4">
        {media.mediaType === "tv" ? (
          <Link
            to={`/library/tv/${media.id}`}
            aria-label={`View ${media.title} details`}
            className="flex min-w-0 items-start gap-3 rounded-lg transition hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            {mediaContent}
          </Link>
        ) : (
          <div className="flex min-w-0 items-start gap-3">{mediaContent}</div>
        )}

        <button
          type="button"
          onClick={() => void onDelete(media.id)}
          aria-label={`Delete ${media.title}`}
          className="rounded-lg p-2 text-slate-500 transition hover:bg-red-950 hover:text-red-400"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-5">
        <span className="inline-flex rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
          {statusLabel}
        </span>
      </div>
    </article>
  );
}
