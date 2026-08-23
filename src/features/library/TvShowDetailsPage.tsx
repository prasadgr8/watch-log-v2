import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  LoaderCircle,
  RotateCcw,
  Tv,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

import {
  episodeRepository,
  mediaRepository,
} from "../../database/repositories";

import {
  mapTmdbEpisodeToEpisode,
  tmdbConfig,
  tmdbTvService,
  type TmdbTvDetails,
} from "../../services/tmdb";

import type { PersistedEpisode, PersistedMedia } from "../../types";

import ConfirmDialog from "../../components/ui/ConfirmDialog";

import EpisodeList from "./components/EpisodeList";

import { getUnwatchedPreviousInSeason } from "./services/episodeWatchOrder";

import { deriveSeasonStatus } from "./services/seasonStatus";

interface TvShowDetailsState {
  media: PersistedMedia;
  tvDetails: TmdbTvDetails;
}

function getPosterUrl(posterPath: string | null): string | null {
  if (!posterPath) {
    return null;
  }

  return `${tmdbConfig.imageBaseUrl}/w342${posterPath}`;
}

export default function TvShowDetailsPage() {
  const { mediaId } = useParams<{ mediaId: string }>();

  const [details, setDetails] = useState<TvShowDetailsState | null>(null);

  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<
    number | null
  >(null);

  const [episodes, setEpisodes] = useState<PersistedEpisode[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSeason, setIsLoadingSeason] = useState(false);
  const [updatingEpisodeId, setUpdatingEpisodeId] = useState<number | null>(
    null,
  );

  const [isUpdatingSeasonStatus, setIsUpdatingSeasonStatus] = useState(false);

  const [sequentialTargetEpisodeId, setSequentialTargetEpisodeId] =
    useState<number | null>(null);

  const [sequentialPreviousEpisodeIds, setSequentialPreviousEpisodeIds] =
    useState<number[]>([]);

  const [sequentialBusyAction, setSequentialBusyAction] = useState<
    "previous" | "single" | null
  >(null);

  const [error, setError] = useState<string | null>(null);
  const [seasonError, setSeasonError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadTvShowDetails(): Promise<void> {
      try {
        setError(null);

        const parsedMediaId = Number(mediaId);

        if (!Number.isInteger(parsedMediaId) || parsedMediaId <= 0) {
          throw new Error("Invalid Library media ID.");
        }

        const storedMedia = await mediaRepository.getById(parsedMediaId);

        if (!storedMedia || storedMedia.id === undefined) {
          throw new Error("TV show was not found in the Library.");
        }

        if (storedMedia.mediaType !== "tv") {
          throw new Error("The selected Library item is not a TV show.");
        }

        if (storedMedia.tmdbId === undefined) {
          throw new Error("This TV show does not have TMDB metadata.");
        }

        const tvDetails = await tmdbTvService.getTvDetails(storedMedia.tmdbId);

        if (isCancelled) {
          return;
        }

        setDetails({
          media: storedMedia as PersistedMedia,
          tvDetails,
        });
      } catch (loadError) {
        console.error("Failed to load TV show details:", loadError);

        if (!isCancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load TV show details.",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadTvShowDetails();

    return () => {
      isCancelled = true;
    };
  }, [mediaId]);

  async function handleSelectSeason(seasonNumber: number): Promise<void> {
    if (!details) {
      return;
    }

    try {
      setSelectedSeasonNumber(seasonNumber);
      setEpisodes([]);
      setIsLoadingSeason(true);
      setSeasonError(null);

      const seasonDetails = await tmdbTvService.getSeasonDetails(
        details.tvDetails.id,
        seasonNumber,
      );

      const now = new Date();

      const mappedEpisodes = seasonDetails.episodes.map((episode) =>
        mapTmdbEpisodeToEpisode(episode, details.media.id, now),
      );

      const synchronizedEpisodes = await episodeRepository.synchronizeSeason(
        details.media.id,
        seasonNumber,
        mappedEpisodes,
      );

      setEpisodes(
        [...synchronizedEpisodes].sort(
          (firstEpisode, secondEpisode) =>
            firstEpisode.episodeNumber - secondEpisode.episodeNumber,
        ),
      );
    } catch (loadSeasonError) {
      console.error("Failed to load season details:", loadSeasonError);

      setEpisodes([]);

      setSeasonError(
        loadSeasonError instanceof Error
          ? loadSeasonError.message
          : "Unable to load season details.",
      );
    } finally {
      setIsLoadingSeason(false);
    }
  }

  async function handleToggleWatched(episode: PersistedEpisode): Promise<void> {
    try {
      setUpdatingEpisodeId(episode.id);
      setSeasonError(null);

      if (episode.watched) {
        await episodeRepository.markUnwatched(episode.id);
      } else {
        const previousUnwatchedEpisodes = getUnwatchedPreviousInSeason(
          episodes,
          episode.episodeNumber,
        );

        if (previousUnwatchedEpisodes.length > 0) {
          setSequentialTargetEpisodeId(episode.id);

          setSequentialPreviousEpisodeIds(
            previousUnwatchedEpisodes.map(
              (previousEpisode) => previousEpisode.id,
            ),
          );

          return;
        }

        await episodeRepository.markWatched(episode.id);
      }

      const updatedEpisodes = await episodeRepository.getByShowSeason(
        episode.showId,
        episode.seasonNumber,
      );

      setEpisodes(
        updatedEpisodes.filter(
          (updatedEpisode): updatedEpisode is PersistedEpisode =>
            updatedEpisode.id !== undefined,
        ),
      );
    } catch (updateError) {
      console.error("Failed to update episode watch state:", updateError);

      setSeasonError("Unable to update this episode. Please try again.");
    } finally {
      setUpdatingEpisodeId(null);
    }
  }

  async function handleUpdateSeasonWatchStatus(
    action: "watched" | "unwatched",
  ): Promise<void> {
    if (!details || selectedSeasonNumber === null || isUpdatingSeasonStatus) {
      return;
    }

    try {
      setIsUpdatingSeasonStatus(true);
      setSeasonError(null);

      if (action === "watched") {
        await episodeRepository.markSeasonWatched(
          details.media.id,
          selectedSeasonNumber,
        );
      } else {
        await episodeRepository.markSeasonUnwatched(
          details.media.id,
          selectedSeasonNumber,
        );
      }

      const updatedEpisodes = await episodeRepository.getByShowSeason(
        details.media.id,
        selectedSeasonNumber,
      );

      setEpisodes(
        updatedEpisodes.filter(
          (updatedEpisode): updatedEpisode is PersistedEpisode =>
            updatedEpisode.id !== undefined,
        ),
      );
    } catch (updateError) {
      console.error("Failed to update season watch status:", updateError);

      setSeasonError("Unable to update this season. Please try again.");
    } finally {
      setIsUpdatingSeasonStatus(false);
    }
  }

  function closeSequentialDialog(): void {
    setSequentialTargetEpisodeId(null);
    setSequentialPreviousEpisodeIds([]);
    setSequentialBusyAction(null);
  }

  async function resolveSequentialWatch(
    action: "previous" | "single",
  ): Promise<void> {
    if (
      !details ||
      selectedSeasonNumber === null ||
      sequentialTargetEpisodeId === null ||
      sequentialBusyAction !== null
    ) {
      return;
    }

    const targetEpisodeId = sequentialTargetEpisodeId;

    try {
      setSequentialBusyAction(action);
      setSeasonError(null);

      if (action === "previous") {
        await episodeRepository.markEpisodesWatched([
          targetEpisodeId,
          ...sequentialPreviousEpisodeIds,
        ]);
      } else {
        await episodeRepository.markWatched(targetEpisodeId);
      }

      const updatedEpisodes = await episodeRepository.getByShowSeason(
        details.media.id,
        selectedSeasonNumber,
      );

      setEpisodes(
        updatedEpisodes.filter(
          (updatedEpisode): updatedEpisode is PersistedEpisode =>
            updatedEpisode.id !== undefined,
        ),
      );

      closeSequentialDialog();
    } catch (resolveError) {
      console.error("Failed to update episode watch status:", resolveError);

      setSeasonError("Unable to update this episode. Please try again.");

      closeSequentialDialog();
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center text-muted">
        Loading TV show details...
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="space-y-6">
        <Link
          to="/library"
          className="inline-flex items-center gap-2 text-sm font-medium text-accent-text transition hover:text-accent-hover"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Library
        </Link>

        <div
          role="alert"
          className="rounded-xl border border-danger/60 bg-danger/10 p-6 text-danger"
        >
          {error ?? "Unable to load TV show details."}
        </div>
      </div>
    );
  }

  const { tvDetails } = details;
  const posterUrl = getPosterUrl(tvDetails.poster_path);

  const seasonStatus =
    selectedSeasonNumber === null ? null : deriveSeasonStatus(episodes);

  return (
    <div className="space-y-8">
      <Link
        to="/library"
        className="inline-flex items-center gap-2 text-sm font-medium text-accent-text transition hover:text-accent-hover"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Library
      </Link>

      <section className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="grid md:grid-cols-[240px_1fr]">
          <div className="aspect-[2/3] bg-app-bg md:aspect-auto">
            {posterUrl ? (
              <img
                src={posterUrl}
                alt={`${tvDetails.name} poster`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full min-h-80 items-center justify-center text-muted">
                <Tv className="h-16 w-16" />
              </div>
            )}
          </div>

          <div className="p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-elevated px-3 py-1 text-xs font-medium text-muted">
                <Tv className="h-3.5 w-3.5" />
                TV Show
              </span>

              <span className="rounded-full bg-surface-elevated px-3 py-1 text-xs font-medium text-muted">
                {tvDetails.status}
              </span>
            </div>

            <h1 className="mt-5 text-3xl font-bold text-primary md:text-4xl">
              {tvDetails.name}
            </h1>

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted">
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                {tvDetails.first_air_date || "Air date unavailable"}
              </span>

              <span>
                {tvDetails.number_of_seasons}{" "}
                {tvDetails.number_of_seasons === 1 ? "season" : "seasons"}
              </span>

              <span>
                {tvDetails.number_of_episodes}{" "}
                {tvDetails.number_of_episodes === 1 ? "episode" : "episodes"}
              </span>
            </div>

            <p className="mt-6 max-w-4xl leading-7 text-muted">
              {tvDetails.overview || "No overview available."}
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-2xl font-semibold text-primary">Seasons</h2>

          <p className="mt-2 text-muted">
            Select a season to synchronize and browse its episodes.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tvDetails.seasons.map((season) => {
            const isSelected = selectedSeasonNumber === season.season_number;

            return (
              <button
                key={season.id}
                type="button"
                onClick={() => void handleSelectSeason(season.season_number)}
                disabled={isLoadingSeason}
                className={`rounded-xl border p-5 text-left transition disabled:cursor-wait disabled:opacity-60 ${
                  isSelected
                    ? "border-accent-hover bg-accent/15"
                    : "border-border bg-surface hover:border-muted"
                }`}
              >
                <h3 className="font-semibold text-primary">{season.name}</h3>

                <p className="mt-2 text-sm text-muted">
                  {season.episode_count}{" "}
                  {season.episode_count === 1 ? "episode" : "episodes"}
                </p>

                {season.air_date && (
                  <p className="mt-2 text-sm text-muted">
                    First aired {season.air_date}
                  </p>
                )}

                <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted">
                  {season.overview || "No season overview available."}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {selectedSeasonNumber !== null && (
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-primary">
              {selectedSeasonNumber === 0
                ? "Specials"
                : `Season ${selectedSeasonNumber}`}{" "}
              Episodes
            </h2>

            <p className="mt-2 text-muted">
              Episode metadata is synchronized with your local Watch Log
              database.
            </p>
          </div>

          {isLoadingSeason ? (
            <div className="flex items-center justify-center gap-3 rounded-xl border border-border bg-surface p-10 text-muted">
              <LoaderCircle className="h-5 w-5 animate-spin" />
              Loading and synchronizing episodes...
            </div>
          ) : seasonError ? (
            <div
              role="alert"
              className="rounded-xl border border-danger/60 bg-danger/10 p-6 text-danger"
            >
              {seasonError}
            </div>
          ) : (
            <>
              {seasonStatus !== null && seasonStatus.totalEpisodeCount > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        seasonStatus.status === "fully-watched"
                          ? "bg-success/10 text-success"
                          : seasonStatus.status === "partially-watched"
                            ? "bg-accent/15 text-accent-text"
                            : "bg-surface-elevated text-muted"
                      }`}
                    >
                      {seasonStatus.status === "fully-watched"
                        ? "Fully watched"
                        : seasonStatus.status === "partially-watched"
                          ? "In progress"
                          : "Unwatched"}
                    </span>

                    <p className="text-sm text-muted">
                      {seasonStatus.watchedEpisodeCount} of{" "}
                      {seasonStatus.totalEpisodeCount} watched
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      void handleUpdateSeasonWatchStatus(
                        seasonStatus.status === "fully-watched"
                          ? "unwatched"
                          : "watched",
                      )
                    }
                    disabled={isUpdatingSeasonStatus}
                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-wait disabled:opacity-50 ${
                      seasonStatus.status === "fully-watched"
                        ? "bg-surface-elevated text-muted hover:bg-surface-hover hover:text-primary"
                        : "bg-accent text-inverted hover:bg-accent-hover"
                    }`}
                  >
                    {isUpdatingSeasonStatus ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : seasonStatus.status === "fully-watched" ? (
                      <RotateCcw className="h-4 w-4" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}

                    {isUpdatingSeasonStatus
                      ? "Updating..."
                      : seasonStatus.status === "fully-watched"
                        ? "Mark Season Unwatched"
                        : "Mark Season Watched"}
                  </button>
                </div>
              )}

              <EpisodeList
                episodes={episodes}
                updatingEpisodeId={updatingEpisodeId}
                onToggleWatched={handleToggleWatched}
              />
            </>
          )}
        </section>
      )}

      <ConfirmDialog
        isOpen={sequentialTargetEpisodeId !== null}
        title="Mark Episode Watched"
        description={
          sequentialPreviousEpisodeIds.length === 1
            ? "You have 1 previous unwatched episode in this season. Would you like to mark it as watched too?"
            : `You have ${sequentialPreviousEpisodeIds.length} previous unwatched episodes in this season. Would you like to mark them as watched too?`
        }
        primaryLabel="Mark Previous + This"
        secondaryLabel="Only This Episode"
        tertiaryLabel="Cancel"
        busyAction={
          sequentialBusyAction === "previous"
            ? "primary"
            : sequentialBusyAction === "single"
              ? "secondary"
              : null
        }
        onPrimary={() => void resolveSequentialWatch("previous")}
        onSecondary={() => void resolveSequentialWatch("single")}
        onTertiary={closeSequentialDialog}
      />
    </div>
  );
}
