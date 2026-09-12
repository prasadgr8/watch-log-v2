import { useEffect, useMemo, useRef, useState } from "react";
import { Layers, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { collectionsService } from "./services/collectionsService";
import type { CollectionClassification } from "./services/collectionsService";

import ConfirmDialog from "../../components/ui/ConfirmDialog";
import RenameCollectionModal from "./components/RenameCollectionModal";
import CollectionTypeSelector from "./components/CollectionTypeSelector";
import SmartCollectionEditor from "./components/SmartCollectionEditor";

type CollectionFilter = "all" | "manual" | "smart";

export default function CollectionsPage() {
  const [classifications, setClassifications] = useState<
    CollectionClassification[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeFilter, setActiveFilter] = useState<CollectionFilter>("all");
  const [isTypeSelectorOpen, setIsTypeSelectorOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSmartEditorOpen, setIsSmartEditorOpen] = useState(false);

  const [newCollectionName, setNewCollectionName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const [renamingCollection, setRenamingCollection] =
    useState<CollectionClassification | null>(null);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);

  const [deletingCollection, setDeletingCollection] =
    useState<CollectionClassification | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const navigate = useNavigate();

  /*
   * Manual-create dialog behavior mirrors RenameCollectionModal: initial
   * focus on the name control, Escape/backdrop cancellation while a save is
   * not running, and focus restoration to the previously focused element
   * when the dialog closes. The saving ref lets the document-level Escape
   * handler read the latest saving state without re-binding per render.
   */
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const isSavingRef = useRef(isSaving);

  useEffect(() => {
    isSavingRef.current = isSaving;
  });

  useEffect(() => {
    if (!isCreateModalOpen) {
      return undefined;
    }

    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    nameInputRef.current?.focus();

    function handleDocumentKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape" && !isSavingRef.current) {
        setIsCreateModalOpen(false);
      }
    }

    document.addEventListener("keydown", handleDocumentKeyDown);

    return () => {
      document.removeEventListener("keydown", handleDocumentKeyDown);
      previouslyFocusedRef.current?.focus();
      previouslyFocusedRef.current = null;
    };
  }, [isCreateModalOpen]);

  useEffect(() => {
    let isActive = true;

    async function loadCollections(): Promise<void> {
      try {
        setError(null);
        const collections = await collectionsService.listCollections();
        const loaded = await collectionsService.classifyCollections(
          collections,
        );
        if (isActive) {
          setClassifications(loaded);
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
      setError(null);
      const collections = await collectionsService.listCollections();
      const loaded = await collectionsService.classifyCollections(collections);
      setClassifications(loaded);
    } catch (loadError) {
      console.error("Failed to reload collections:", loadError);
      setError("Unable to refresh your collections.");
    }
  }

  function openCreateManualModal(): void {
    setNewCollectionName("");
    setCreateError(null);
    setIsTypeSelectorOpen(false);
    setIsCreateModalOpen(true);
  }

  function openSmartEditor(): void {
    setIsTypeSelectorOpen(false);
    setIsSmartEditorOpen(true);
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
      setIsCreateModalOpen(false);
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

  function handleRequestRename(
    classification: CollectionClassification,
  ): void {
    setRenamingCollection(classification);
    setIsRenameModalOpen(true);
  }

  async function handleRename(name: string): Promise<void> {
    if (!renamingCollection) {
      return;
    }

    setIsSaving(true);

    try {
      await collectionsService.renameCollection(
        renamingCollection.collection.id,
        name,
      );
      setIsRenameModalOpen(false);
      setRenamingCollection(null);
      await reloadCollections();
    } catch (renameError) {
      console.error("Failed to rename collection:", renameError);
    } finally {
      setIsSaving(false);
    }
  }

  function handleRequestDelete(
    classification: CollectionClassification,
  ): void {
    setDeletingCollection(classification);
    setIsDeleteDialogOpen(true);
  }

  async function handleDelete(): Promise<void> {
    if (!deletingCollection) {
      return;
    }

    setIsSaving(true);

    try {
      if (deletingCollection.isSmart) {
        await collectionsService.deleteSmartCollection(
          deletingCollection.collection.id,
        );
      } else {
        await collectionsService.deleteCollection(
          deletingCollection.collection.id,
        );
      }
      setIsDeleteDialogOpen(false);
      setDeletingCollection(null);
      await reloadCollections();
    } catch (deleteError) {
      console.error("Failed to delete collection:", deleteError);
    } finally {
      setIsSaving(false);
    }
  }

  const filteredClassifications = useMemo(() => {
    if (activeFilter === "all") {
      return classifications;
    }
    return classifications.filter((classification) =>
      activeFilter === "smart"
        ? classification.isSmart
        : !classification.isSmart,
    );
  }, [classifications, activeFilter]);
  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Collections</h1>
        <p className="mt-1 text-muted">
          Organize your library into manual and smart collections.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-surface p-6">
        <div className="mb-6 flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-accent-text" />
          <h2 className="text-xl font-semibold text-primary">
            Create Collection
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setIsTypeSelectorOpen(true)}
          aria-haspopup="dialog"
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 font-medium text-inverted transition hover:bg-accent-hover"
        >
          <Plus className="h-4 w-4" />
          + Create Collection
        </button>

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-lg border border-danger/60 bg-danger/10 px-4 py-3 text-sm text-danger"
          >
            {error}
          </p>
        )}
      </section>

      <nav
        className="flex gap-1 rounded-xl border border-border bg-surface p-1"
        aria-label="Filter collections"
      >
        {([
          { key: "all", label: "All" },
          { key: "manual", label: "Manual" },
          { key: "smart", label: "Smart" },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveFilter(tab.key)}
            aria-pressed={activeFilter === tab.key}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeFilter === tab.key
                ? "bg-accent text-inverted"
                : "text-muted hover:bg-surface-elevated hover:text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-primary">
          Your Collections
        </h2>

        {isLoading ? (
          <div className="rounded-xl border border-border bg-surface p-8 text-center text-muted">
            Loading your collections...
          </div>
        ) : classifications.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface/50 p-12 text-center">
            <Layers className="mx-auto h-10 w-10 text-muted" />
            <h3 className="mt-4 text-lg font-semibold text-primary">
              No collections yet
            </h3>
            <p className="mt-2 text-muted">
              Create your first collection using the button above.
            </p>
          </div>
        ) : filteredClassifications.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface/50 p-12 text-center">
            <Layers className="mx-auto h-10 w-10 text-muted" />
            <h3 className="mt-4 text-lg font-semibold text-primary">
              No {activeFilter} collections
            </h3>
            <p className="mt-2 text-muted">
              Create a collection or switch tabs to see more.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredClassifications.map((classification) => {
              const collection = classification.collection;
              const isSmart = classification.isSmart;

              return (
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
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-semibold text-primary hover:text-accent-text">
                          {collection.name}
                        </h3>
                        {isSmart && (
                          <span
                            aria-label="Smart Collection"
                            className="inline-flex items-center gap-1 rounded-md bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent-text"
                          >
                            <Sparkles className="h-3 w-3" />
                            Smart
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        {isSmart ? "Auto-updating" : "Manual"}
                      </p>
                    </Link>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleRequestRename(classification)}
                        aria-label={`Rename ${collection.name}`}
                        className="rounded-lg p-2 text-muted transition hover:bg-accent/15 hover:text-accent-text"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRequestDelete(classification)}
                        aria-label={`Delete ${collection.name}`}
                        className="rounded-lg p-2 text-muted transition hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <CollectionTypeSelector
        isOpen={isTypeSelectorOpen}
        onClose={() => setIsTypeSelectorOpen(false)}
        onSelectManual={openCreateManualModal}
        onSelectSmart={openSmartEditor}
      />

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            aria-hidden="true"
            onClick={() => {
              if (!isSaving) {
                setIsCreateModalOpen(false);
              }
            }}
            className="absolute inset-0 bg-app-bg/80"
          ></div>

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-collection-modal-title"
            className="relative w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl"
          >
            <h2
              id="new-collection-modal-title"
              className="text-lg font-semibold text-primary"
            >
              Create Collection
            </h2>
            <p className="mt-1 text-sm text-muted">
              Enter a name for your manual collection.
            </p>

            <form className="mt-5" onSubmit={handleCreate}>
              <label
                htmlFor="new-collection-name"
                className="block text-sm font-medium text-muted"
              >
                Name
              </label>
              <input
                id="new-collection-name"
                ref={nameInputRef}
                type="text"
                value={newCollectionName}
                onChange={(event) =>
                  setNewCollectionName(event.target.value)
                }
                placeholder="Collection name"
                className="mt-2 w-full rounded-lg border border-border bg-input-bg px-3 py-2 text-primary outline-none transition focus:border-accent-hover focus:ring-2 focus:ring-accent-hover/20"
              />

              {createError && (
                <p role="alert" className="mt-2 text-sm text-danger">
                  {createError}
                </p>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isSaving}
                  className="rounded-lg border border-border px-4 py-2 text-muted transition hover:bg-surface-elevated hover:text-primary disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-inverted transition hover:bg-accent-hover disabled:cursor-wait disabled:opacity-50"
                >
                  {isSaving ? "Creating..." : "Create Collection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <SmartCollectionEditor
        isOpen={isSmartEditorOpen}
        isSaving={isSaving}
        onClose={() => setIsSmartEditorOpen(false)}
        onSaved={(smartCollectionId: number) => {
          void reloadCollections();
          void navigate(`/collections/${smartCollectionId}`);
        }}
      />

      <RenameCollectionModal
        collection={renamingCollection ? renamingCollection.collection : null}
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
        description={
          deletingCollection?.isSmart
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
    </div>
  );
}
