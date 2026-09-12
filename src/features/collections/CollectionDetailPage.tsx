import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Edit,
  Layers,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { collectionsService } from "./services/collectionsService";
import { evaluateSmartCollection } from "./services/smartCollectionEvaluation";
import { mediaRepository } from "../../database/repositories";

import type {
  PersistedCollection,
  PersistedMedia,
  PersistedSmartCollectionDefinition,
} from "../../types";

import ConfirmDialog from "../../components/ui/ConfirmDialog";
import CollectionMediaCard from "./components/CollectionMediaCard";
import AddMediaToCollectionModal from "./components/AddMediaToCollectionModal";
import RenameCollectionModal from "./components/RenameCollectionModal";
import SmartCollectionEditor from "./components/SmartCollectionEditor";
import EditMediaModal from "../library/components/EditMediaModal";
import SmartFilterSummary from "./components/SmartFilterSummary";
import SmartResultsSection from "./components/SmartResultsSection";

export default function CollectionDetailPage() {
  const { collectionId } = useParams<{ collectionId: string }>();
  const [collection, setCollection] = useState<PersistedCollection | null>(
    null,
  );
  const [definition, setDefinition] =
    useState<PersistedSmartCollectionDefinition | undefined>(undefined);
  const [isSmart, setIsSmart] = useState(false);
  const [media, setMedia] = useState<PersistedMedia[]>([]);
  const [libraryMedia, setLibraryMedia] = useState<PersistedMedia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isAddMediaModalOpen, setIsAddMediaModalOpen] = useState(false);
  const [isSmartEditorOpen, setIsSmartEditorOpen] = useState(false);

  const [deletingCollection, setDeletingCollection] =
    useState<PersistedCollection | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [pickerMedia, setPickerMedia] = useState<PersistedMedia[]>([]);

  // Smart results surface normal media actions (favorite, edit, delete) while
  // Smart membership itself remains derived and never manually mutable.
  const [editingMedia, setEditingMedia] = useState<PersistedMedia | null>(null);
  const [isEditMediaModalOpen, setIsEditMediaModalOpen] = useState(false);
  const [deletingMedia, setDeletingMedia] = useState<PersistedMedia | null>(
    null,
  );
  const [isDeleteMediaDialogOpen, setIsDeleteMediaDialogOpen] = useState(false);

  const navigate = useNavigate();

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
          setIsSmart(false);
          setDefinition(undefined);
          return;
        }

        setCollection(loaded.collection);
        setMedia(loaded.media);

        const smartDefinition =
          await collectionsService.getSmartCollectionDefinition(
            loaded.collection.id,
          );
        if (isActive) {
          setDefinition(smartDefinition);
          setIsSmart(smartDefinition !== undefined);
        }

        const library = await collectionsService.getAllLibraryMedia();
        if (isActive) {
          setLibraryMedia(library);
        }
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

  async function refreshCollection(): Promise<boolean> {
    if (!collectionId) {
      return false;
    }

    const loaded = await collectionsService.getCollectionWithMedia(
      Number(collectionId),
    );

    if (!loaded || !loaded.collection) {
      setError("Collection not found.");
      setCollection(null);
      setMedia([]);
      setIsSmart(false);
      setDefinition(undefined);
      return false;
    }

    setCollection(loaded.collection);
    setMedia(loaded.media);

    const smartDefinition =
      await collectionsService.getSmartCollectionDefinition(
        loaded.collection.id,
      );
    setDefinition(smartDefinition);
    setIsSmart(smartDefinition !== undefined);

    const library = await collectionsService.getAllLibraryMedia();
    setLibraryMedia(library);

    return true;
  }

  async function handleRename(name: string): Promise<void> {
    if (!collection) {
      return;
    }

    setIsSaving(true);

    try {
      await collectionsService.renameCollection(collection.id, name);
      setIsRenameModalOpen(false);
      await refreshCollection();
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
      await refreshCollection();
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
      await refreshCollection();
    } catch (removeError) {
      console.error("Failed to remove media from collection:", removeError);
    }
  }

  async function handleToggleFavorite(
    mediaItem: PersistedMedia,
  ): Promise<void> {
    try {
      await mediaRepository.update(mediaItem.id, {
        favorite: !mediaItem.favorite,
      });
      await refreshCollection();
    } catch (favoriteError) {
      console.error("Failed to update favorite:", favoriteError);
      setError("Failed to update favorite.");
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

    setIsSaving(true);

    try {
      if (isSmart) {
        await collectionsService.deleteSmartCollection(deletingCollection.id);
      } else {
        await collectionsService.deleteCollection(deletingCollection.id);
      }
      setIsDeleteDialogOpen(false);
      setDeletingCollection(null);
      navigate("/collections");
    } catch (deleteError) {
      console.error("Failed to delete collection:", deleteError);
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete collection.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleSmartEdit(): void {
    setIsSmartEditorOpen(true);
  }

  function handleEditMedia(mediaItem: PersistedMedia): void {
    setEditingMedia(mediaItem);
    setIsEditMediaModalOpen(true);
  }

  async function handleSaveMedia(values: {
    status: PersistedMedia["userStatus"];
    rating: number;
    notes: string;
    watchedAt?: Date | null;
  }): Promise<void> {
    if (!editingMedia) {
      return;
    }

    setIsSaving(true);

    try {
      await mediaRepository.update(editingMedia.id, values);
      setIsEditMediaModalOpen(false);
      setEditingMedia(null);
      await refreshCollection();
    } catch (editError) {
      console.error("Failed to update media:", editError);
      setError("Failed to update media.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleRequestDeleteMedia(mediaItem: PersistedMedia): void {
    setDeletingMedia(mediaItem);
    setIsDeleteMediaDialogOpen(true);
  }

  async function handleDeleteMedia(): Promise<void> {
    if (!deletingMedia) {
      return;
    }

    setIsSaving(true);

    try {
      await mediaRepository.remove(deletingMedia.id);
      setIsDeleteMediaDialogOpen(false);
      setDeletingMedia(null);
      await refreshCollection();
    } catch (deleteMediaError) {
      console.error("Failed to delete media:", deleteMediaError);
      setError("Failed to delete media.");
    } finally {
      setIsSaving(false);
    }
  }

  const smartMedia = useMemo(() => {
    if (!isSmart || !definition) {
      return [];
    }
    return evaluateSmartCollection(definition, libraryMedia);
  }, [isSmart, definition, libraryMedia]);
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
        </div>
        <div>
          <Link
            to="/collections"
            className="inline-flex items-center gap-2 text-sm text-muted transition hover:text-accent-text"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Collections
          </Link>
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
            {isSmart ? (
              <Sparkles className="h-6 w-6" />
            ) : (
              <Layers className="h-6 w-6" />
            )}
          </div>
          <div className="min-w-0">
            <h1
              className="truncate text-2xl font-bold text-primary"
              title={collection.name}
            >
              {collection.name}
            </h1>
            {isSmart && (
              <span className="inline-flex items-center gap-1 rounded-md bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent-text">
                <Sparkles className="h-3 w-3" />
                Smart Collection
              </span>
            )}
          </div>
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

          {!isSmart && (
            <button
              type="button"
              onClick={handleOpenAddMedia}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm text-inverted transition hover:bg-accent-hover"
            >
              <Plus className="h-4 w-4" />
              Add Media
            </button>
          )}

          {isSmart && definition && (
            <button
              type="button"
              onClick={handleSmartEdit}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted transition hover:bg-surface-elevated hover:text-primary"
            >
              <Edit className="h-4 w-4" />
              Edit Filters
            </button>
          )}

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

      {isSmart && definition && (
        <SmartFilterSummary filters={definition.filters} />
      )}

      {isSmart ? (
        <SmartResultsSection
          media={smartMedia}
          libraryMediaCount={libraryMedia.length}
          onToggleFavorite={handleToggleFavorite}
          onEdit={handleEditMedia}
          onDelete={handleRequestDeleteMedia}
        />
      ) : media.length === 0 ? (
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
              onToggleFavorite={handleToggleFavorite}
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

      {!isSmart && (
        <AddMediaToCollectionModal
          isOpen={isAddMediaModalOpen}
          isSaving={isSaving}
          mediaItems={pickerMedia}
          onClose={() => setIsAddMediaModalOpen(false)}
          onAdd={handleAddMedia}
        />
      )}

      {isSmart && definition && (
        <SmartCollectionEditor
          isOpen={isSmartEditorOpen}
          collectionId={collection.id}
          initialName={collection.name}
          initialFilters={definition.filters}
          isSaving={isSaving}
          onClose={() => setIsSmartEditorOpen(false)}
          onSaved={() => {
            void refreshCollection();
            setIsSmartEditorOpen(false);
          }}
        />
      )}

      <EditMediaModal
        media={editingMedia}
        isOpen={isEditMediaModalOpen}
        isSaving={isSaving}
        onClose={() => setIsEditMediaModalOpen(false)}
        onSave={(values) => void handleSaveMedia(values)}
      />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="Delete Collection"
        description={
          isSmart
            ? "Deleting this Smart Collection will delete its saved filters. Media in your library, watch history, and episodes will NOT be deleted. This action cannot be undone."
            : "Deleting this collection will not delete any media, episodes, or watch history. This action cannot be undone."
        }
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

      <ConfirmDialog
        isOpen={isDeleteMediaDialogOpen}
        title="Delete Media"
        description={
          deletingMedia
            ? `Deleting ${deletingMedia.title} will remove it from your library, its episodes, and watch history. This action cannot be undone.`
            : "This action cannot be undone."
        }
        primaryLabel="Delete"
        secondaryLabel="Cancel"
        tertiaryLabel="Cancel"
        busyAction={isSaving ? "primary" : null}
        onPrimary={() => void handleDeleteMedia()}
        onSecondary={() => {
          setIsDeleteMediaDialogOpen(false);
          setDeletingMedia(null);
        }}
        onTertiary={() => {
          setIsDeleteMediaDialogOpen(false);
          setDeletingMedia(null);
        }}
      />
    </div>
  );
}
