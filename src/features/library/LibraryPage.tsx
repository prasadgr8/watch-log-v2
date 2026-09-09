import { useEffect, useMemo, useState } from "react";
import { Film, RefreshCw, Star } from "lucide-react";

import {
  episodeRepository,
  mediaRepository,
} from "../../database/repositories";
import { collectionRepository } from "../../database/repositories/collectionRepository";

import { LIBRARY_VIEW_MODE_SETTING_KEY, useViewMode } from "../../app/viewMode";
import { useOnlineStatus } from "../../app/useOnlineStatus";
import ViewModeToggle from "../../components/ui/ViewModeToggle";
import DensityToggle from "../../components/ui/DensityToggle";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

import { filterLibrary, type MediaTypeFilter } from "./services/libraryFilter";
import { enrichLibraryGenres } from "./services/genreEnrichmentService";

import { TMDB_GENRES_LIST } from "../../services/tmdb/tmdbGenres";
import GenreMultiSelect from "./GenreMultiSelect";

import type {
  Episode,
  Media,
  MediaType,
  PersistedMedia,
  WatchStatus,
} from "../../types";

import AddMediaForm from "./components/AddMediaForm";
import BulkActionsToolbar from "./components/BulkActionsToolbar";
import AddSelectedToCollectionModal from "./components/AddSelectedToCollectionModal";
import MediaCard from "./components/MediaCard";
import MediaListItem from "./components/MediaListItem";
import EditMediaModal from "./components/EditMediaModal";

import { sortLibrary, type LibrarySort } from "./services/librarySort";
import {
  buildLibraryProgressMap,
  type LibraryProgress,
} from "./services/libraryProgress";

import {
  libraryRatingFilterOptions,
  librarySortOptions,
  watchStatusOptions,
} from "./libraryOptions";

import { applyMovieStatusChange } from "../movies/services/movieService";

import {
  LIBRARY_GRID_COLUMNS,
  CARD_GAP,
} from "../ui/density";
import { useDensity } from "../ui/useDensity";

interface LibraryPageProps {
  lockedMediaType?: MediaType;
}

const LIBRARY_DENSITY_KEY = "library-card-density";

interface AddMediaValues {
  title: string;
  mediaType: MediaType;
  userStatus: WatchStatus;
}

function isPersistedMedia(media: Media): media is PersistedMedia {
  return media.id !== undefined;
}

/*
 * Loads the Library dataset in one place: media always, episodes only when TV
 * progress can be displayed. The movie-locked Movies view never renders TV
 * progress, so it skips the episode store entirely and builds its binary
 * movie progress from media alone.
 */
async function fetchLibraryData(
  includeEpisodes: boolean,
): Promise<{ storedMedia: Media[]; episodes: Episode[] }> {
  const [storedMedia, episodes] = await Promise.all([
    mediaRepository.getAll(),
    includeEpisodes ? episodeRepository.getAll() : Promise.resolve([]),
  ]);

  return { storedMedia, episodes };
}

export default function LibraryPage({ lockedMediaType }: LibraryPageProps) {
  // TV progress is only displayable in the unlocked Library view; the
  // movie-locked Movies view builds its binary progress from media alone.
  const includeEpisodes = lockedMediaType !== "movie";

  const [media, setMedia] = useState<PersistedMedia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<PersistedMedia | null>(
    null,
  );
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [search, setSearch] = useState("");

  const [mediaType, setMediaType] = useState<MediaTypeFilter>(
    lockedMediaType ?? "all",
  );

  const [status, setStatus] = useState<WatchStatus | "all">("all");
  const [minRating, setMinRating] = useState<number | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [sort, setSort] = useState<LibrarySort>("recent");
  const [progressMap, setProgressMap] = useState<ReadonlyMap<
    number,
    LibraryProgress
  > | null>(null);

  // Selection mode state (transient — never persisted).
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<number>>(
    new Set(),
  );
  const [isBulkBusy, setIsBulkBusy] = useState(false);
  const [bulkResultMessage, setBulkResultMessage] = useState<string | null>(
    null,
  );
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [deletingMedia, setDeletingMedia] = useState<PersistedMedia | null>(
    null,
  );
  const [isAddToCollectionOpen, setIsAddToCollectionOpen] = useState(false);

  const { viewMode, setViewMode } = useViewMode(LIBRARY_VIEW_MODE_SETTING_KEY);
  const { density, setDensity } = useDensity(LIBRARY_DENSITY_KEY);
  const isOnline = useOnlineStatus();
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichmentStatus, setEnrichmentStatus] = useState<string | null>(null);

  async function loadMedia(): Promise<void> {
    try {
      setError(null);

      const { storedMedia, episodes } = await fetchLibraryData(includeEpisodes);
      const persistedMedia = storedMedia.filter(isPersistedMedia);

      setMedia(persistedMedia);
      setProgressMap(buildLibraryProgressMap(persistedMedia, episodes));
    } catch (loadError) {
      console.error("Failed to load media:", loadError);

      setError("Unable to load your media library.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isActive = true;

    async function loadInitialMedia(): Promise<void> {
      try {
        const { storedMedia, episodes } =
          await fetchLibraryData(includeEpisodes);

        if (isActive) {
          const persistedMedia = storedMedia.filter(isPersistedMedia);

          setMedia(persistedMedia);
          setProgressMap(buildLibraryProgressMap(persistedMedia, episodes));
        }
      } catch (loadError) {
        console.error("Failed to load media:", loadError);

        if (isActive) {
          setError("Unable to load your media library.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialMedia();
    return () => {
      isActive = false;
    };
  }, [includeEpisodes]);

  // Clear selection whenever the visible result set changes (search, filters,
  // or sorting). Uses the React "adjust state during rendering" pattern to
  // avoid a setState-in-effect. Deliberately excludes `media` (post-action
  // reloads must not fight the explicit "clear after successful action" rule)
  // and `progressMap` (rebuilds that ride on media reloads after actions are
  // not user-facing filter changes and must not clear an active selection).
  const filterSignature = `${search}|${mediaType}|${status}|${minRating}|${favoritesOnly}|${selectedGenres.join(",")}|${sort}`;
  const [previousFilterSignature, setPreviousFilterSignature] =
    useState(filterSignature);

  if (filterSignature !== previousFilterSignature) {
    setPreviousFilterSignature(filterSignature);
    setSelectedIds(new Set());
  }

  const visibleMedia = useMemo(() => {
    const filtered = filterLibrary(media, {
      search,
      mediaType,
      status,
      minRating,
      favoritesOnly,
      selectedGenres,
    });

    return sortLibrary(filtered, sort, progressMap ?? undefined);
  }, [
    media,
    search,
    mediaType,
    status,
    minRating,
    favoritesOnly,
    selectedGenres,
    sort,
    progressMap,
  ]);
  async function handleAddMedia(values: AddMediaValues): Promise<boolean> {
    const trimmedTitle = values.title.trim();

    if (!trimmedTitle) {
      setError("Please enter a title.");
      return false;
    }

    try {
      setIsSaving(true);
      setError(null);

      const now = new Date();

      await mediaRepository.add({
        mediaType: values.mediaType,
        title: trimmedTitle,
        userStatus: values.userStatus,
        createdAt: now,
        updatedAt: now,
      });

      await loadMedia();

      return true;
    } catch (saveError) {
      console.error("Failed to save media:", saveError);

      setError("Unable to save this media item.");

      return false;
    } finally {
      setIsSaving(false);
    }
  }

  function handleEdit(media: PersistedMedia): void {
    setSelectedMedia(media);
    setIsEditModalOpen(true);
  }

  async function handleToggleFavorite(media: PersistedMedia): Promise<void> {
    try {
      await mediaRepository.update(media.id, { favorite: !media.favorite });
      await loadMedia();
    } catch (error) {
      console.error("Failed to update favorite:", error);
      setError("Failed to update favorite.");
    }
  }
  async function handleSave(values: {
    status: PersistedMedia["userStatus"];
    rating: number;
    notes: string;
    watchedAt?: Date | null;
  }): Promise<void> {
    if (selectedMedia === null || isEditSaving) {
      return;
    }

    try {
      setIsEditSaving(true);
      setError(null);

      const changes =
        selectedMedia.mediaType === "movie"
          ? applyMovieStatusChange(selectedMedia, {
              userStatus: values.status,
              rating: values.rating,
              notes: values.notes,
              watchedAt: values.watchedAt,
            })
          : {
              userStatus: values.status,
              rating: values.rating,
              notes: values.notes,
            };

      await mediaRepository.update(selectedMedia.id, changes);

      await loadMedia();

      setIsEditModalOpen(false);
      setSelectedMedia(null);
    } catch (saveError) {
      console.error("Failed to update media:", saveError);

      setError("Unable to save your changes. Please try again.");
    } finally {
      setIsEditSaving(false);
    }
  }

  async function handleSyncTmdbGenres(): Promise<void> {
    if (isEnriching) {
      return;
    }

    setIsEnriching(true);
    setEnrichmentStatus(null);

    try {
      const result = await enrichLibraryGenres({
        onProgress: ({ completed, total }) => {
          setEnrichmentStatus(`Syncing genres ${completed} of ${total}…`);
        },
      });

      if (result.failures.length > 0) {
        console.error("TMDB genre sync failures:", result.failures);
      }

      const summaryParts: string[] = [];

      if (result.updatedCount > 0) {
        summaryParts.push(
          `Updated genres for ${result.updatedCount} ${
            result.updatedCount === 1 ? "item" : "items"
          }.`,
        );
      }

      if (result.noGenresCount > 0) {
        summaryParts.push(
          `${result.noGenresCount} ${
            result.noGenresCount === 1 ? "item has" : "items have"
          } no TMDB genres.`,
        );
      }

      if (result.failedCount > 0) {
        summaryParts.push(
          `${result.failedCount} ${
            result.failedCount === 1 ? "item" : "items"
          } failed.`,
        );
      }

      setEnrichmentStatus(
        summaryParts.length > 0
          ? summaryParts.join(" ")
          : "No items are missing genres.",
      );

      await loadMedia();
    } catch (syncError) {
      console.error("Failed to sync TMDB genres:", syncError);

      setError(
        syncError instanceof Error
          ? syncError.message
          : "Unable to sync TMDB genres. Please try again.",
      );
    } finally {
      setIsEnriching(false);
    }
  }

  // Selection mode handlers

  function enterSelection(): void {
    setIsSelectionMode(true);
    setBulkResultMessage(null);
  }

  function exitSelection(): void {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  }

  function toggleSelected(item: PersistedMedia): void {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
      }
      return next;
    });
  }

  function handleSelectAllFiltered(): void {
    setSelectedIds(new Set(visibleMedia.map((item) => item.id)));
  }

  function handleClearSelection(): void {
    setSelectedIds(new Set());
  }

  async function handleBulkSetStatus(watchStatus: WatchStatus): Promise<void> {
    if (selectedIds.size === 0) {
      return;
    }

    try {
      setError(null);
      setIsBulkBusy(true);
      setBulkResultMessage(null);

      const result = await mediaRepository.setUserStatusMany(
        [...selectedIds],
        watchStatus,
      );

      setBulkResultMessage(
        `Status updated for ${result.updatedCount} item(s); ${result.unchangedCount} already set.`,
      );
      setSelectedIds(new Set());
      await loadMedia();
    } catch {
      setError("Unable to update the selected items. Please try again.");
    } finally {
      setIsBulkBusy(false);
    }
  }

  async function handleBulkSetFavorite(favorite: boolean): Promise<void> {
    if (selectedIds.size === 0) {
      return;
    }

    try {
      setError(null);
      setIsBulkBusy(true);
      setBulkResultMessage(null);

      const result = await mediaRepository.setFavoriteMany(
        [...selectedIds],
        favorite,
      );

      const action = favorite ? "Added" : "Removed";
      const target = favorite ? "to" : "from";
      setBulkResultMessage(
        `${action} ${result.updatedCount} item(s) ${target} favorites.`,
      );
      setSelectedIds(new Set());
      await loadMedia();
    } catch {
      setError("Unable to update favorites. Please try again.");
    } finally {
      setIsBulkBusy(false);
    }
  }

  async function handleBulkAddToCollection(
    collectionId: number,
    name: string,
  ): Promise<void> {
    if (selectedIds.size === 0) {
      return;
    }

    try {
      setError(null);
      setIsBulkBusy(true);
      setBulkResultMessage(null);

      const result = await collectionRepository.addMediaMany(collectionId, [
        ...selectedIds,
      ]);

      if (!result.ok) {
        setError("Unable to add to collection. Please try again.");
        return;
      }

      setBulkResultMessage(
        `Added ${result.addedCount} item(s) to "${name}"; ${result.duplicateCount} already in it.`,
      );
      setSelectedIds(new Set());
      setIsAddToCollectionOpen(false);
    } catch {
      setError("Unable to add to collection. Please try again.");
    } finally {
      setIsBulkBusy(false);
    }
  }

  async function handleBulkDelete(): Promise<void> {
    if (selectedIds.size === 0) {
      return;
    }

    try {
      setError(null);
      setIsBulkBusy(true);
      setBulkResultMessage(null);

      const result = await mediaRepository.removeMany([...selectedIds]);

      setBulkResultMessage(`Deleted ${result.removedCount} item(s).`);
      setSelectedIds(new Set());
      setIsBulkDeleteConfirmOpen(false);
      await loadMedia();
    } catch {
      setError("Unable to delete the selected items. Please try again.");
    } finally {
      setIsBulkBusy(false);
    }
  }

  async function handleRequestDelete(id: number): Promise<void> {
    const item = visibleMedia.find((entry) => entry.id === id);
    if (item) {
      setDeletingMedia(item);
    }
  }

  async function handleConfirmDelete(): Promise<void> {
    if (!deletingMedia) {
      return;
    }

    const id = deletingMedia.id;

    try {
      setError(null);
      await mediaRepository.remove(id);
      setDeletingMedia(null);
      await loadMedia();
    } catch {
      setError("Unable to delete the item. Please try again.");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-primary">Library</h1>

        <p className="mt-2 text-muted">
          Track the TV shows and movies in your personal library.
        </p>
      </div>

      <AddMediaForm isSaving={isSaving} onSubmit={handleAddMedia} />
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-border bg-input-bg px-4 py-2.5 text-primary outline-none transition focus:border-accent-hover focus:ring-2 focus:ring-accent-hover/20"
        />

        <button
          type="button"
          onClick={() => setFavoritesOnly((prev) => !prev)}
          aria-pressed={favoritesOnly}
          aria-label="Show only favorites"
          className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-accent-hover/40 ${
            favoritesOnly
              ? "border-warning/60 bg-warning/10 text-warning"
              : "border-border bg-input-bg text-muted hover:text-primary"
          }`}
        >
          <Star
            className="h-4 w-4"
            fill={favoritesOnly ? "currentColor" : "none"}
          />
          Favorites
        </button>

        {!lockedMediaType && (
          <select
            value={mediaType}
            onChange={(e) => setMediaType(e.target.value as MediaTypeFilter)}
            className="min-w-[170px] rounded-lg border border-border bg-input-bg px-4 py-2.5 text-primary outline-none transition focus:border-accent-hover focus:ring-2 focus:ring-accent-hover/20"
          >
            <option value="all">All Media</option>
            <option value="tv">TV Shows</option>
            <option value="movie">Movies</option>
          </select>
        )}

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as WatchStatus | "all")}
          className="min-w-[170px] rounded-lg border border-border bg-input-bg px-4 py-2.5 text-primary outline-none transition focus:border-accent-hover focus:ring-2 focus:ring-accent-hover/20"
        >
          <option value="all">All Status</option>

          {watchStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <GenreMultiSelect
          genres={TMDB_GENRES_LIST}
          selectedGenres={selectedGenres}
          onChange={setSelectedGenres}
        />

        <select
          aria-label="Minimum rating"
          value={minRating === null ? "any" : String(minRating)}
          onChange={(e) => {
            const value = e.target.value;
            setMinRating(value === "any" ? null : Number(value));
          }}
          className="min-w-[170px] rounded-lg border border-border bg-input-bg px-4 py-2.5 text-primary outline-none transition focus:border-accent-hover focus:ring-2 focus:ring-accent-hover/20"
        >
          {libraryRatingFilterOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as LibrarySort)}
          className="min-w-[170px] rounded-lg border border-border bg-input-bg px-4 py-2.5 text-primary outline-none transition focus:border-accent-hover focus:ring-2 focus:ring-accent-hover/20"
        >
          {librarySortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-danger/60 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      )}

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-primary">Your Media</h2>

          <div className="flex items-center gap-4">
            {isSelectionMode ? (
              <button
                type="button"
                onClick={exitSelection}
                disabled={isBulkBusy}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-input-bg px-4 py-2.5 text-sm font-medium text-muted transition hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40 disabled:cursor-wait disabled:opacity-50"
              >
                Exit Selection
              </button>
            ) : (
              <button
                type="button"
                onClick={enterSelection}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-input-bg px-4 py-2.5 text-sm font-medium text-muted transition hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40"
              >
                Select
              </button>
            )}
            <button
              type="button"
              onClick={handleSyncTmdbGenres}
              disabled={isEnriching || !isOnline}
              title={isOnline ? undefined : "Requires an internet connection."}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-input-bg px-4 py-2.5 text-sm font-medium text-muted transition hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:text-muted"
            >
              <RefreshCw
                aria-hidden="true"
                className={`h-4 w-4 ${isEnriching ? "animate-spin" : ""}`}
              />
              Sync TMDB genres
            </button>

            <span className="text-sm text-muted">
              {visibleMedia.length}{" "}
              {visibleMedia.length === 1 ? "item" : "items"}
            </span>

            <DensityToggle density={density} onChange={setDensity} />
            <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
          </div>
        </div>
        {enrichmentStatus && (
          <p role="status" className="mb-4 text-sm text-muted">
            {enrichmentStatus}
          </p>
        )}

        {bulkResultMessage && (
          <p role="status" className="mb-4 text-sm text-muted">
            {bulkResultMessage}
          </p>
        )}

        {isSelectionMode && (
          <div className="mb-4">
            <BulkActionsToolbar
              selectedCount={selectedIds.size}
              totalCount={visibleMedia.length}
              isBusy={isBulkBusy}
              onSelectAll={handleSelectAllFiltered}
              onClearSelection={handleClearSelection}
              onExitSelection={exitSelection}
              onSetStatus={handleBulkSetStatus}
              onSetFavorite={handleBulkSetFavorite}
              onAddToCollection={() => setIsAddToCollectionOpen(true)}
              onRequestDelete={() => setIsBulkDeleteConfirmOpen(true)}
            />
          </div>
        )}

        {isLoading ? (
          <div className="rounded-xl border border-border bg-surface p-8 text-center text-muted">
            Loading your library...
          </div>
        ) : visibleMedia.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface/50 p-12 text-center">
            <Film className="mx-auto h-10 w-10 text-muted" />

            <h3 className="mt-4 text-lg font-semibold text-primary">
              {lockedMediaType === "movie"
                ? "Your movie library is empty"
                : "Your library is empty"}
            </h3>

            <p className="mt-2 text-muted">
              {lockedMediaType === "movie"
                ? "Add your first movie using the form above."
                : "Add your first TV show or movie using the form above."}
            </p>
          </div>
        ) : viewMode === "list" ? (
          <div className="space-y-3">
            {visibleMedia.map((item) => (
              <MediaListItem
                key={item.id}
                media={item}
                density={density}
                progress={progressMap?.get(item.id)}
                onDelete={handleRequestDelete}
                onEdit={handleEdit}
                onToggleFavorite={handleToggleFavorite}
                isSelectionMode={isSelectionMode}
                isSelected={selectedIds.has(item.id)}
                onToggleSelected={toggleSelected}
              />
            ))}
          </div>
        ) : (
          <div
            className={`grid items-start justify-items-start ${CARD_GAP[density]} ${LIBRARY_GRID_COLUMNS[density]}`}
          >
            {visibleMedia.map((item) => (
              <MediaCard
                key={item.id}
                media={item}
                density={density}
                progress={progressMap?.get(item.id)}
                onDelete={handleRequestDelete}
                onEdit={handleEdit}
                onToggleFavorite={handleToggleFavorite}
                isSelectionMode={isSelectionMode}
                isSelected={selectedIds.has(item.id)}
                onToggleSelected={toggleSelected}
              />
            ))}
          </div>
        )}
      </section>
      <EditMediaModal
        media={selectedMedia}
        isOpen={isEditModalOpen}
        isSaving={isEditSaving}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedMedia(null);
        }}
        onSave={handleSave}
      />
      <AddSelectedToCollectionModal
        isOpen={isAddToCollectionOpen}
        isSaving={isBulkBusy}
        collectionCount={selectedIds.size}
        onClose={() => setIsAddToCollectionOpen(false)}
        onPick={handleBulkAddToCollection}
      />
      <ConfirmDialog
        isOpen={deletingMedia !== null}
        title={`Delete ${deletingMedia?.title ?? ""}`}
        description={
          deletingMedia?.mediaType === "tv"
            ? "Deleting this TV show will also delete its episodes and watch history. This action cannot be undone."
            : "This will permanently remove this movie from your library. This action cannot be undone."
        }
        primaryLabel="Delete"
        secondaryLabel="Cancel"
        tertiaryLabel="Cancel"
        busyAction={null}
        onPrimary={() => void handleConfirmDelete()}
        onSecondary={() => setDeletingMedia(null)}
        onTertiary={() => setDeletingMedia(null)}
      />
      <ConfirmDialog
        isOpen={isBulkDeleteConfirmOpen}
        title={`Delete ${selectedIds.size} item(s)`}
        description={`Deleting TV shows also deletes their episodes and watch history. This action cannot be undone.`}
        primaryLabel={`Delete ${selectedIds.size} item(s)`}
        secondaryLabel="Cancel"
        tertiaryLabel="Cancel"
        busyAction={isBulkBusy ? "primary" : null}
        onPrimary={() => void handleBulkDelete()}
        onSecondary={() => setIsBulkDeleteConfirmOpen(false)}
        onTertiary={() => setIsBulkDeleteConfirmOpen(false)}
      />
    </div>
  );
}
