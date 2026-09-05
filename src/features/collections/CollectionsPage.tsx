import { useEffect, useState } from "react";
import { Layers, Pencil, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

import { collectionsService } from "./services/collectionsService";
import type { PersistedCollection } from "../../types";

import ConfirmDialog from "../../components/ui/ConfirmDialog";
import RenameCollectionModal from "./components/RenameCollectionModal";

export default function CollectionsPage() {
  const [collections, setCollections] = useState<PersistedCollection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newCollectionName, setNewCollectionName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const [renamingCollection, setRenamingCollection] =
    useState<PersistedCollection | null>(null);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);

  const [deletingCollection, setDeletingCollection] =
    useState<PersistedCollection | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadCollections(): Promise<void> {
      try {
        setError(null);
        const loaded = await collectionsService.listCollections();
        if (isActive) {
          setCollections(loaded);
        }
      } catch (loadError) {
        console.error("Failed to load collections:", loadError);
        if (isActive) {
          setError("Unable to load your collections.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadCollections();

    return () => {
      isActive = false;
    };
  }, []);

  async function reloadCollections(): Promise<void> {
    try {
      const loaded = await collectionsService.listCollections();
      setCollections(loaded);
    } catch (loadError) {
      console.error("Failed to reload collections:", loadError);
      setError("Unable to refresh your collections.");
    }
  }

  async function handleCreate(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const trimmed = newCollectionName.trim();

    if (trimmed.length === 0) {
      setCreateError("Collection name is required.");
      return;
    }

    setIsSaving(true);
    setCreateError(null);

    try {
      await collectionsService.createCollection(trimmed);
      setNewCollectionName("");
      await reloadCollections();
    } catch (createError) {
      console.error("Failed to create collection:", createError);
      setCreateError(
        createError instanceof Error
          ? createError.message
          : "Failed to create collection.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleRequestRename(collection: PersistedCollection): void {
    setRenamingCollection(collection);
    setIsRenameModalOpen(true);
  }

  async function handleRename(name: string): Promise<void> {
    if (!renamingCollection) {
      return;
    }

    await collectionsService.renameCollection(renamingCollection.id, name);
    setIsRenameModalOpen(false);
    setRenamingCollection(null);
    await reloadCollections();
  }

  function handleRequestDelete(collection: PersistedCollection): void {
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
    await reloadCollections();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Collections</h1>
        <p className="mt-1 text-muted">
          Organize your library into custom collections.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-surface p-6">
        <div className="mb-6 flex items-center gap-3">
          <Layers className="h-5 w-5 text-accent-text" />
          <h2 className="text-xl font-semibold text-primary">
            Create Collection
          </h2>
        </div>

        <form className="flex flex-col gap-4 sm:flex-row" onSubmit={handleCreate}>
          <div className="flex-1">
            <label
              className="mb-2 block text-sm font-medium text-muted"
              htmlFor="new-collection-name"
            >
              Name
            </label>
            <input
              id="new-collection-name"
              type="text"
              value={newCollectionName}
              onChange={(event) => setNewCollectionName(event.target.value)}
              placeholder="Collection name"
              className="w-full rounded-lg border border-border bg-input-bg px-4 py-2.5 text-primary outline-none transition focus:border-accent-hover focus:ring-2 focus:ring-accent-hover/20"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 font-medium text-inverted transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Layers className="h-4 w-4" />
              {isSaving ? "Creating..." : "Create"}
            </button>
          </div>
        </form>

        {createError && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {createError}
          </p>
        )}
      </section>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-danger/60 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      )}

      <section>
        <h2 className="mb-4 text-xl font-semibold text-primary">
          Your Collections
        </h2>

        {isLoading ? (
          <div className="rounded-xl border border-border bg-surface p-8 text-center text-muted">
            Loading your collections...
          </div>
        ) : collections.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface/50 p-12 text-center">
            <Layers className="mx-auto h-10 w-10 text-muted" />
            <h3 className="mt-4 text-lg font-semibold text-primary">
              No collections yet
            </h3>
            <p className="mt-2 text-muted">
              Create your first collection using the form above.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {collections.map((collection) => (
              <article
                key={collection.id}
                className="rounded-xl border border-border bg-surface p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <Link
                    to={`/collections/${collection.id}`}
                    aria-label={`Open ${collection.name}`}
                    className="min-w-0 flex-1"
                  >
                    <h3 className="truncate font-semibold text-primary hover:text-accent-text">
                      {collection.name}
                    </h3>
                  </Link>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleRequestRename(collection)}
                      aria-label={`Rename ${collection.name}`}
                      className="rounded-lg p-2 text-muted transition hover:bg-accent/15 hover:text-accent-text"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRequestDelete(collection)}
                      aria-label={`Delete ${collection.name}`}
                      className="rounded-lg p-2 text-muted transition hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <RenameCollectionModal
        collection={renamingCollection}
        isOpen={isRenameModalOpen}
        isSaving={isSaving}
        onClose={() => {
          setIsRenameModalOpen(false);
          setRenamingCollection(null);
        }}
        onSave={handleRename}
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