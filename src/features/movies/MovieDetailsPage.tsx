import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  LoaderCircle,
  Pencil,
  Star,
  Trash2,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { mediaRepository } from "../../database/repositories";

import { tmdbConfig } from "../../services/tmdb";

import type { PersistedMedia } from "../../types";

import { useOnlineStatus } from "../../app/useOnlineStatus";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

import EditMediaModal from "../library/components/EditMediaModal";

import {
  loadMovieDetails,
  applyMovieStatusChange,
  type MovieDetailsResult,
} from "./services/movieService";

function getPosterUrl(posterPath: string | null): string | null {
  if (!posterPath) {
    return null;
  }

  return `${tmdbConfig.imageBaseUrl}/w342${posterPath}`;
}

function formatDate(dateString: string | undefined): string | null {
  if (!dateString || dateString.length < 4) {
    return null;
  }

  const year = parseInt(dateString.substring(0, 4), 10);

  if (Number.isNaN(year)) {
    return null;
  }

  return dateString.length >= 10
    ? `${dateString.substring(5, 7)}/${dateString.substring(8, 10)}/${year}`
    : String(year);
}

export default function MovieDetailsPage() {
  const { mediaId } = useParams<{ mediaId: string }>();

  const [details, setDetails] = useState<MovieDetailsResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOfflineNotice, setShowOfflineNotice] = useState(false);

  const isOnline = useOnlineStatus();

  useEffect(() => {
    let isCancelled = false;

    async function loadDetails(): Promise<void> {
      try {
        setError(null);
        setShowOfflineNotice(false);

        const parsedMediaId = Number(mediaId);

        if (!Number.isInteger(parsedMediaId) || parsedMediaId <= 0) {
          throw new Error("Invalid Library media ID.");
        }

        const result = await loadMovieDetails(parsedMediaId, {
          canUseNetwork: () => isOnline,
          onLocalData: (localResult) => {
            if (!isCancelled) {
              setDetails(localResult);
              setIsLoading(false);
            }
          },
        });

        if (!isCancelled) {
          setDetails(result);
          setIsLoading(false);
        }
      } catch (loadError) {
        if (isCancelled) {
          return;
        }

        console.error("Failed to load movie details:", loadError);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load movie details.",
        );
        setIsLoading(false);
      }
    }

    void loadDetails();

    return () => {
      isCancelled = true;
    };
  }, [mediaId, isOnline]);

  const movie = details?.media;
  const movieDetails = details?.movieDetails;
  const posterUrl = getPosterUrl(
    movieDetails?.poster_path ?? movie?.posterPath ?? null,
  );

  const releaseYear = formatDate(
    movieDetails?.release_date ?? movie?.releaseDate,
  );

  async function handleSave(values: {
    status: PersistedMedia["userStatus"];
    rating: number;
    notes: string;
    watchedAt?: Date | null;
  }): Promise<void> {
    if (!movie) {
      return;
    }

    try {
      setIsEditSaving(true);

      const changes = applyMovieStatusChange(movie, {
        userStatus: values.status,
        rating: values.rating,
        notes: values.notes,
        watchedAt: values.watchedAt,
      });

      await mediaRepository.update(movie.id, changes);

      setDetails((previous) => {
        if (!previous) {
          return previous;
        }

        return {
          ...previous,
          media: {
            ...previous.media,
            ...changes,
            mediaType: "movie" as const,
          },
        };
      });

      setIsEditModalOpen(false);
    } catch {
      setError("Unable to save changes. Please try again.");
    } finally {
      setIsEditSaving(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!movie) {
      return;
    }

    try {
      await mediaRepository.remove(movie.id);
      setIsDeleteDialogOpen(false);
    } catch {
      setError("Unable to delete the movie. Please try again.");
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-muted">
        <LoaderCircle className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <p
          role="alert"
          className="rounded-lg border border-danger/60 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
        <Link
          to="/movies"
          className="inline-flex items-center gap-2 text-accent hover:underline"
        >
          <ArrowLeft size={16} />
          Back to Movies
        </Link>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="space-y-6">
        <p
          role="alert"
          className="rounded-lg border border-danger/60 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          Movie was not found in the Library.
        </p>
        <Link
          to="/movies"
          className="inline-flex items-center gap-2 text-accent hover:underline"
        >
          <ArrowLeft size={16} />
          Back to Movies
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Link
        to="/movies"
        className="inline-flex items-center gap-2 text-muted transition hover:text-primary"
      >
        <ArrowLeft size={16} />
        Back to Movies
      </Link>

      {showOfflineNotice && !isOnline && (
        <p
          role="status"
          className="rounded-lg border border-warning/60 bg-warning/10 px-4 py-3 text-sm text-warning"
        >
          You are offline. Showing saved data.
        </p>
      )}

      <div className="flex flex-col gap-8 md:flex-row">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={`${movie.title} poster`}
            className="w-48 shrink-0 rounded-xl border border-border object-cover"
          />
        ) : (
          <div className="flex w-48 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-elevated text-muted">
            <Clock3 size={48} />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold text-primary">{movie.title}</h1>

          {releaseYear && <p className="mt-2 text-muted">{releaseYear}</p>}

          <span className="mt-3 inline-flex rounded-full bg-surface-elevated px-3 py-1 text-xs font-medium text-muted">
            {movie.userStatus.charAt(0).toUpperCase() +
              movie.userStatus.slice(1)}
          </span>

          {movie.rating !== undefined && movie.rating > 0 && (
            <div className="mt-3 flex items-center gap-1">
              <Star size={16} className="text-warning" fill="currentColor" />
              <span className="text-sm text-primary">{movie.rating}</span>
            </div>
          )}

          {movie.watchedAt && (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted">
              <CalendarDays size={16} />
              Watched: {new Date(movie.watchedAt).toLocaleDateString()}
            </p>
          )}

          {movie.notes && (
            <p className="mt-4 text-sm text-muted">{movie.notes}</p>
          )}

          {movieDetails?.overview && (
            <p className="mt-4 text-sm leading-6 text-muted">
              {movieDetails.overview}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-inverted transition hover:bg-accent-hover"
            >
              <Pencil size={16} />
              Edit
            </button>

            <button
              type="button"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-muted transition hover:bg-danger/10 hover:text-danger"
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        </div>
      </div>

      <EditMediaModal
        media={movie}
        isOpen={isEditModalOpen}
        isSaving={isEditSaving}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSave}
      />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title={`Delete ${movie.title}`}
        description="This will permanently remove this movie from your library. This action cannot be undone."
        primaryLabel="Delete"
        secondaryLabel="Cancel"
        tertiaryLabel="Cancel"
        busyAction={null}
        onPrimary={() => void handleDelete()}
        onSecondary={() => setIsDeleteDialogOpen(false)}
        onTertiary={() => setIsDeleteDialogOpen(false)}
      />
    </div>
  );
}
