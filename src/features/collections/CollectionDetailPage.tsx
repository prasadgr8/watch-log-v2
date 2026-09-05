import { useEffect, useState } from "react";
import { ArrowLeft, Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { collectionsService } from "./services/collectionsService";
import type { PersistedCollection, PersistedMedia } from "../../types";

import ConfirmDialog from "../../components/ui/ConfirmDialog";
import CollectionMediaCard from "./components/CollectionMediaCard";
import AddMediaToCollectionModal from "./components/AddMediaToCollectionModal";
import RenameCollectionModal from "./components/RenameCollectionModal";

export default function CollectionDetailPage() {
  const { collectionId } = useParams<{ collectionId: string }>();
  const [collection, setCollection] = useState<PersistedCollection | null>(null);
  const [media, setMedia] = useState<PersistedMedia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isAddMediaModalOpen, setIsAddMediaModalOpen] = useState(false);

  const [deletingCollection, setDeletingCollection] =
    useState<PersistedCollection | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [pickerMedia, setPickerMedia] = useState<PersistedMedia[]>([]);

  useEffect(() => {
    let isActive = true;

    async function loadCollection(): Promise<void> {
      if (!collectionId) {
        setError("Collection not found.");
        setIsLoading(false);
        return;
      }

      try {
        setError(null);
        const loaded = await collectionsService.getCollectionWithMedia(
          Number(collectionId),
        );

        if (!isActive) {
          return;
        }

        if (!loaded || !loaded.collection) {
          setError("Collection not found.");
          setCollection(null);
          setMedia([]);
          return;
        }

        setCollection(loaded.collection);
        setMedia(loaded.media);
      } catch (loadError) {
        console.error("Failed to load collection:", loadError);
        if (isActive) {
          setError("Unable to load this collection.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadCollection();

    return () => {
      isActive = false;
    };
  }, [collectionId]);

  async function reloadCollection(): Promise<void> {
    if (!collectionId) {
      return;
    }
    await collectionsService
      .getCollectionWithMedia(Number(collectionId))
      .then((loaded) => {
        if (loaded?.collection) {
          setCollection(loaded.collection);
          setMedia(loaded.media);
        }
      })
      .catch((loadError) => {
        console.error("Failed to reload collection:", loadError);
      });
  }

  async function handleRename(name: string): Promise<void> {
    if (!collection) {
      return;
    }

    setIsSaving(true);

    try {
      await collectionsService.renameCollection(collection.id, name);
      setIsRenameModalOpen(false);
      await reloadCollection();
    } catch (renameError) {
      console.error("Failed to rename collection:", renameError);
      setError(
        renameError instanceof Error
          ? renameError.message
          : "Failed to rename collection.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddMedia(mediaId: number): Promise<void> {
    if (!collection) {
      return;
    }

    try {
      await collectionsService.addMediaToCollection(collection.id, mediaId);
      await reloadCollection();
    } catch (addError) {
      console.error("Failed to add media to collection:", addError);
    }
  }

  async function handleRemoveMedia(id: number): Promise<void> {
    if (!collection) {
      return;
    }

    try {
      await collectionsService.removeMediaFromCollection(collection.id, id);
      await reloadCollection();
    } catch (removeError) {
      console.error("Failed to remove media from collection:", removeError);
    }
  }

  function handleOpenAddMedia(): void {
    if (!collection) {
      return;
    }

    void (async () => {
      const available = await collectionsService.listLibraryMediaForPicker(
        collection.id,
      );
      setPickerMedia(available);
      setIsAddMediaModalOpen(true);
    })();
  }

  function handleRequestDelete(): void {
    setDeletingCollection(collection);
    setIsDeleteDialogOpen(true);
  }

  async function handleDelete(): Promise<void> {
    if (!deletingCollection) {
      return;
    }

    await collectionsService.deleteCollection(deletingCollection.id);
    setIsDeleteDialogOpen(false);
    setDeletingCollection(null);
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-8 p-6">
        <div className="rounded-xl border border-border bg-surface p-8 text-center text-muted">
          Loading collection...
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="mx-auto max-w-5xl space-y-8 p-6">
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <h2 className="text-lg font-semibold text-primary">
            Collection not found
          </h2>
          <p className="mt-2 text-muted">
            This collection may have been deleted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <div>
        <Link
          to="/collections"
          className="inline-flex items-center gap-2 text-sm text-muted transition hover:text-accent-text"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Collections
        </Link>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-danger"
        >
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="rounded-lg bg-surface-elevated p-2 text-accent-text">
            <Layers className="h-6 w-6" />
          </div>
          <h1 className="truncate text-2xl font-bold text-primary">
            {collection.name}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsRenameModalOpen(true)}
            aria-label={`Rename ${collection.name}`}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted transition hover:bg-surface-elevated hover:text-primary"
          >
            <Pencil className="h-4 w-4" />
            Rename
          </button>

          <button
            type="button"
            onClick={handleOpenAddMedia}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm text-inverted transition hover:bg-accent-hover"
          >
            <Plus className="h-4 w-4" />
            Add Media
          </button>

          <button
            type="button"
            onClick={handleRequestDelete}
            aria-label={`Delete ${collection.name}`}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted transition hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      {media.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 p-12 text-center">
          <Layers className="mx-auto h-10 w-10 text-muted" />
          <h3 className="mt-4 text-lg font-semibold text-primary">
            This collection is empty
          </h3>
          <p className="mt-2 text-muted">
            Add existing library media using the Add Media button above.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {media.map((item) => (
            <CollectionMediaCard
              key={item.id}
              media={item}
              onRemove={handleRemoveMedia}
            />
          ))}
        </div>
      )}

      <RenameCollectionModal
        collection={collection}
        isOpen={isRenameModalOpen}
        isSaving={isSaving}
        onClose={() => setIsRenameModalOpen(false)}
        onSave={handleRename}
      />

      <AddMediaToCollectionModal
        isOpen={isAddMediaModalOpen}
        isSaving={isSaving}
        mediaItems={pickerMedia}
        onClose={() => setIsAddMediaModalOpen(false)}
        onAdd={handleAddMedia}
      />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="Delete Collection"
        description="Deleting this collection will not delete any media, episodes, or watch history. This action cannot be undone."
        primaryLabel="Delete"
        secondaryLabel="Cancel"
        tertiaryLabel="Cancel"
        busyAction={isSaving ? "primary" : null}
        onPrimary={() => void handleDelete()}
        onSecondary={() => {
          setIsDeleteDialogOpen(false);
          setDeletingCollection(null);
        }}
        onTertiary={() => {
          setIsDeleteDialogOpen(false);
          setDeletingCollection(null);
        }}
      />
    </div>
  );
}
