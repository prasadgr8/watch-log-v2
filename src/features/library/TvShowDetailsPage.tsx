import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, LoaderCircle, Tv } from "lucide-react";
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

import EpisodeList from "./components/EpisodeList";

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

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">
        Loading TV show details...
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="space-y-6">
        <Link
          to="/library"
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-400 transition hover:text-blue-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Library
        </Link>

        <div
          role="alert"
          className="rounded-xl border border-red-900 bg-red-950/50 p-6 text-red-300"
        >
          {error ?? "Unable to load TV show details."}
        </div>
      </div>
    );
  }

  const { tvDetails } = details;
  const posterUrl = getPosterUrl(tvDetails.poster_path);

  return (
    <div className="space-y-8">
      <Link
        to="/library"
        className="inline-flex items-center gap-2 text-sm font-medium text-blue-400 transition hover:text-blue-300"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Library
      </Link>

      <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <div className="grid md:grid-cols-[240px_1fr]">
          <div className="aspect-[2/3] bg-slate-950 md:aspect-auto">
            {posterUrl ? (
              <img
                src={posterUrl}
                alt={`${tvDetails.name} poster`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full min-h-80 items-center justify-center text-slate-600">
                <Tv className="h-16 w-16" />
              </div>
            )}
          </div>

          <div className="p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
                <Tv className="h-3.5 w-3.5" />
                TV Show
              </span>

              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
                {tvDetails.status}
              </span>
            </div>

            <h1 className="mt-5 text-3xl font-bold text-white md:text-4xl">
              {tvDetails.name}
            </h1>

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-400">
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

            <p className="mt-6 max-w-4xl leading-7 text-slate-300">
              {tvDetails.overview || "No overview available."}
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-2xl font-semibold text-white">Seasons</h2>

          <p className="mt-2 text-slate-400">
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
                    ? "border-blue-500 bg-blue-950/30"
                    : "border-slate-800 bg-slate-900 hover:border-slate-700"
                }`}
              >
                <h3 className="font-semibold text-white">{season.name}</h3>

                <p className="mt-2 text-sm text-slate-400">
                  {season.episode_count}{" "}
                  {season.episode_count === 1 ? "episode" : "episodes"}
                </p>

                {season.air_date && (
                  <p className="mt-2 text-sm text-slate-500">
                    First aired {season.air_date}
                  </p>
                )}

                <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-400">
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
            <h2 className="text-2xl font-semibold text-white">
              {selectedSeasonNumber === 0
                ? "Specials"
                : `Season ${selectedSeasonNumber}`}{" "}
              Episodes
            </h2>

            <p className="mt-2 text-slate-400">
              Episode metadata is synchronized with your local Watch Log
              database.
            </p>
          </div>

          {isLoadingSeason ? (
            <div className="flex items-center justify-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-10 text-slate-400">
              <LoaderCircle className="h-5 w-5 animate-spin" />
              Loading and synchronizing episodes...
            </div>
          ) : seasonError ? (
            <div
              role="alert"
              className="rounded-xl border border-red-900 bg-red-950/50 p-6 text-red-300"
            >
              {seasonError}
            </div>
          ) : (
            <EpisodeList
              episodes={episodes}
              updatingEpisodeId={updatingEpisodeId}
              onToggleWatched={handleToggleWatched}
            />
          )}
        </section>
      )}
    </div>
  );
}
