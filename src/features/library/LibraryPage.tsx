import { useEffect, useMemo, useState } from "react";
import { Film } from "lucide-react";

import { mediaRepository } from "../../database/repositories";

import { LIBRARY_VIEW_MODE_SETTING_KEY, useViewMode } from "../../app/viewMode";
import ViewModeToggle from "../../components/ui/ViewModeToggle";

import { filterLibrary, type MediaTypeFilter } from "./services/libraryFilter";

import type {
  Media,
  MediaType,
  PersistedMedia,
  WatchStatus,
} from "../../types";

import AddMediaForm from "./components/AddMediaForm";
import MediaCard from "./components/MediaCard";
import MediaListItem from "./components/MediaListItem";
import EditMediaModal from "./components/EditMediaModal";

import { sortLibrary, type LibrarySort } from "./services/librarySort";

import { watchStatusOptions, librarySortOptions } from "./libraryOptions";

interface AddMediaValues {
  title: string;
  mediaType: MediaType;
  userStatus: WatchStatus;
}

function isPersistedMedia(media: Media): media is PersistedMedia {
  return media.id !== undefined;
}

export default function LibraryPage() {
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

  const [mediaType, setMediaType] = useState<MediaTypeFilter>("all");

  const [status, setStatus] = useState<WatchStatus | "all">("all");
  const [sort, setSort] = useState<LibrarySort>("recent");

  const { viewMode, setViewMode } = useViewMode(LIBRARY_VIEW_MODE_SETTING_KEY);

  async function loadMedia(): Promise<void> {
    try {
      setError(null);

      const storedMedia = await mediaRepository.getAll();

      setMedia(storedMedia.filter(isPersistedMedia));
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
        const storedMedia = await mediaRepository.getAll();

        if (isActive) {
          setMedia(storedMedia.filter(isPersistedMedia));
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
  }, []);
  const visibleMedia = useMemo(() => {
    const filtered = filterLibrary(media, {
      search,
      mediaType,
      status,
    });

    return sortLibrary(filtered, sort);
  }, [media, search, mediaType, status, sort]);
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

  async function handleDelete(id: number): Promise<void> {
    try {
      setError(null);

      await mediaRepository.remove(id);

      await loadMedia();
    } catch (deleteError) {
      console.error("Failed to delete media:", deleteError);

      setError("Unable to delete this media item.");
    }
  }

  function handleEdit(media: PersistedMedia): void {
    setSelectedMedia(media);
    setIsEditModalOpen(true);
  }
  async function handleSave(values: {
    status: PersistedMedia["userStatus"];
    rating: number;
    notes: string;
  }): Promise<void> {
    if (selectedMedia === null || isEditSaving) {
      return;
    }

    try {
      setIsEditSaving(true);
      setError(null);

      await mediaRepository.update(selectedMedia.id, {
        userStatus: values.status,
        rating: values.rating,
        notes: values.notes,
      });

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-primary">Library</h1>

        <p className="mt-2 text-muted">
          Track the TV shows and movies in your personal library.
        </p>
      </div>

      <AddMediaForm isSaving={isSaving} onSubmit={handleAddMedia} />
      <div className="library-filters">
        <input
          type="text"
          placeholder="Search title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-border bg-input-bg px-4 py-2.5 text-primary outline-none transition focus:border-accent-hover focus:ring-2 focus:ring-accent-hover/20"
        />

        <select
          value={mediaType}
          onChange={(e) => setMediaType(e.target.value as MediaTypeFilter)}
          className="min-w-[170px] rounded-lg border border-border bg-input-bg px-4 py-2.5 text-primary outline-none transition focus:border-accent-hover focus:ring-2 focus:ring-accent-hover/20"
        >
          <option value="all">All Media</option>
          <option value="tv">TV Shows</option>
          <option value="movie">Movies</option>
        </select>

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
            <span className="text-sm text-muted">
              {visibleMedia.length} {visibleMedia.length === 1 ? "item" : "items"}
            </span>

            <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-xl border border-border bg-surface p-8 text-center text-muted">
            Loading your library...
          </div>
        ) : visibleMedia.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface/50 p-12 text-center">
            <Film className="mx-auto h-10 w-10 text-muted" />

            <h3 className="mt-4 text-lg font-semibold text-primary">
              Your library is empty
            </h3>

            <p className="mt-2 text-muted">
              Add your first TV show or movie using the form above.
            </p>
          </div>
        ) : viewMode === "list" ? (
          <div className="space-y-3">
            {visibleMedia.map((item) => (
              <MediaListItem
                key={item.id}
                media={item}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleMedia.map((item) => (
              <MediaCard
                key={item.id}
                media={item}
                onDelete={handleDelete}
                onEdit={handleEdit}
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
    </div>
  );
}
