import { useEffect, useState } from "react";
import { Film } from "lucide-react";

import { mediaRepository } from "../../database/repositories";

import type {
  Media,
  MediaType,
  PersistedMedia,
  WatchStatus,
} from "../../types";

import AddMediaForm from "./components/AddMediaForm";
import MediaCard from "./components/MediaCard";

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
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Library</h1>

        <p className="mt-2 text-slate-400">
          Track the TV shows and movies in your personal library.
        </p>
      </div>

      <AddMediaForm isSaving={isSaving} onSubmit={handleAddMedia} />

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300"
        >
          {error}
        </p>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Your Media</h2>

          <span className="text-sm text-slate-400">
            {media.length} {media.length === 1 ? "item" : "items"}
          </span>
        </div>

        {isLoading ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">
            Loading your library...
          </div>
        ) : media.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-12 text-center">
            <Film className="mx-auto h-10 w-10 text-slate-500" />

            <h3 className="mt-4 text-lg font-semibold text-white">
              Your library is empty
            </h3>

            <p className="mt-2 text-slate-400">
              Add your first TV show or movie using the form above.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {media.map((item) => (
              <MediaCard key={item.id} media={item} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
