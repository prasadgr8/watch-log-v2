import { useState } from "react";
import { Film, Pencil, Star, StickyNote, Trash2, Tv } from "lucide-react";
import { Link } from "react-router-dom";

import { tmdbConfig } from "../../../services/tmdb";

import ProgressBar from "../../statistics/components/ProgressBar";

import type { PersistedMedia } from "../../../types";

import type { LibraryProgress } from "../services/libraryProgress";

import { watchStatusOptions } from "../libraryOptions";

import type { CardDensity } from "../../ui/density";
import { CARD_TITLE_SIZE } from "../../ui/density";

interface MediaCardProps {
  media: PersistedMedia;
  density?: CardDensity;
  progress?: LibraryProgress;
  onDelete: (id: number) => Promise<void>;
  onEdit: (media: PersistedMedia) => void;
  onToggleFavorite: (media: PersistedMedia) => Promise<void>;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelected?: (media: PersistedMedia) => void;
}

function getPosterUrl(posterPath: string | null | undefined): string | null {
  if (!posterPath) {
    return null;
  }

  return `${tmdbConfig.imageBaseUrl}/w342${posterPath}`;
}

function getReleaseYear(media: PersistedMedia): string | null {
  const dateString =
    media.mediaType === "tv" ? media.firstAirDate : media.releaseDate;

  if (!dateString || dateString.length < 4) {
    return null;
  }

  return dateString.slice(0, 4);
}

export default function MediaCard({
  media,
  density = "comfortable",
  progress,
  onDelete,
  onEdit,
  onToggleFavorite,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelected,
}: MediaCardProps) {
  const [failedPosterUrl, setFailedPosterUrl] = useState<string | null>(null);

  const statusLabel =
    watchStatusOptions.find((status) => status.value === media.userStatus)
      ?.label ?? media.userStatus;

  const posterUrl = getPosterUrl(media.posterPath);
  const releaseYear = getReleaseYear(media);
  const showRating = typeof media.rating === "number" && media.rating > 0;
  const showNotesIndicator =
    media.notes !== undefined && media.notes.trim().length > 0;
  const showProgress = media.mediaType === "tv" && progress !== undefined;

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface w-full self-start">
      <Link
        to={
          media.mediaType === "tv"
            ? `/library/tv/${media.id}`
            : `/library/movie/${media.id}`
        }
        aria-label={`View ${media.title} details`}
        className="focus:outline-none focus:ring-2 focus:ring-accent-hover/40"
      >
        <div className={`aspect-[2/3] bg-app-bg mx-auto ${density === "compact" ? "max-h-48" : density === "large" ? "max-h-80" : "max-h-64"}`}>
          {posterUrl !== null && failedPosterUrl !== posterUrl ? (
            <img
              src={posterUrl}
              alt={`${media.title} poster`}
              loading="lazy"
              decoding="async"
              onError={() => setFailedPosterUrl(posterUrl)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted">
              {media.mediaType === "tv" ? (
                <Tv aria-hidden="true" className="h-12 w-12" />
              ) : (
                <Film aria-hidden="true" className="h-12 w-12" />
              )}
            </div>
          )}
        </div>

        <h3
          className={`truncate px-4 pt-4 font-semibold text-primary ${CARD_TITLE_SIZE[density]}`}
          title={media.title}
        >
          {media.title}
        </h3>
      </Link>

              <div className={`flex flex-col pt-1 ${density === "compact" ? "p-3" : density === "large" ? "p-5" : "p-4"}`}>
        {releaseYear && <p className="text-sm text-muted">{releaseYear}</p>}

        {(showRating || showNotesIndicator) && (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {showRating && (
              <span className="inline-flex items-center gap-1 text-sm text-warning">
                <Star
                  aria-hidden="true"
                  className="h-4 w-4"
                  fill="currentColor"
                />
                {media.rating}
              </span>
            )}

            {showNotesIndicator && (
              <span className="inline-flex items-center gap-1 text-xs text-muted">
                <StickyNote aria-hidden="true" className="h-3.5 w-3.5" />
                <span className="sr-only">Has notes</span>
              </span>
            )}
          </div>
        )}

        <div className="mt-3">
          <span className="inline-flex rounded-full bg-surface-elevated px-3 py-1 text-xs font-medium text-muted">
            {statusLabel}
          </span>
        </div>

        {showProgress && progress && (
          <div className="mt-4">
            <p className="text-xs text-muted">
              {progress.watchedEpisodeCount} of {progress.totalEpisodeCount}{" "}
              episodes watched
            </p>

            <div className="mt-2">
              <ProgressBar
                value={progress.percentage}
                label={`${media.title} progress`}
              />
            </div>
          </div>
        )}

        <div className="mt-auto flex items-center gap-2 pt-4">
          {isSelectionMode && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelected?.(media)}
              aria-label={`Select ${media.title}`}
              className="h-4 w-4 rounded border-border accent-accent"
            />
          )}
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
      </div>
    </article>
  );
}
