import { useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle, Sparkles, X } from "lucide-react";
import { EMPTY_MEDIA_FILTERS } from "../../../domain/filters/mediaFilterModel";
import type { MediaFilterState } from "../../../domain/filters/mediaFilterModel";
import { evaluateSmartCollection } from "../services/smartCollectionEvaluation";
import { collectionsService } from "../services/collectionsService";
import type { PersistedMedia } from "../../../types";

interface SmartCollectionEditorProps {
  collectionId?: number;
  initialName?: string;
  initialFilters?: MediaFilterState;
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSaved: (collectionId: number) => void;
}

const MEDIA_TYPES: { label: string; value: MediaFilterState["mediaType"] }[] = [
  { label: "All", value: "all" },
  { label: "Movies", value: "movie" },
  { label: "TV Shows", value: "tv" },
];

const STATUSES: { label: string; value: string }[] = [
  { label: "Any status", value: "all" },
  { label: "Planned", value: "planned" },
  { label: "Watching", value: "watching" },
  { label: "Completed", value: "completed" },
  { label: "On Hold", value: "on-hold" },
  { label: "Dropped", value: "dropped" },
];

const RATINGS: { label: string; value: number | null }[] = [
  { label: "No minimum", value: null },
  ...Array.from({ length: 21 }, (_, i) => {
    const v = i * 0.5;
    return { label: v % 1 === 0 ? String(v) : v.toFixed(1), value: v };
  }),
];

const PREVIEW_LIMIT = 12;

function debounceFn<T extends (...args: never[]) => void>(fn: T, ms: number) {
  let id: ReturnType<typeof setTimeout> | null = null;
  return Object.assign((...args: Parameters<T>) => {
    if (id !== null) clearTimeout(id);
    id = setTimeout(() => fn(...args), ms);
  }, { cancel() { if (id !== null) clearTimeout(id); } });
}


export default function SmartCollectionEditor({
  collectionId, initialName = "", initialFilters, isOpen, isSaving, onClose, onSaved,
}: SmartCollectionEditorProps) {
  const [name, setName] = useState(initialName);
  const [filters, setFilters] = useState<MediaFilterState>(initialFilters ?? EMPTY_MEDIA_FILTERS);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [libraryMedia, setLibraryMedia] = useState<PersistedMedia[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);
  /*
   * Tracks whether the dialog is currently open so the form is re-seeded on
   * every open transition. setState during render is the React-recommended
   * pattern for syncing derived state with a prop change and avoids the
   * set-state-in-effect lint rule.
   */
  const [seededOpen, setSeededOpen] = useState(isOpen);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const prevFocus = useRef<HTMLElement | null>(null);
  const isSavingRef = useRef(isSaving);
  const isSubmittingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const isEditing = collectionId !== undefined;
  const isBusy = isSaving || isSubmitting;

  if (isOpen && !seededOpen) {
    setName(initialName);
    setFilters(initialFilters ?? EMPTY_MEDIA_FILTERS);
    setDebouncedSearch(initialFilters?.search ?? "");
    setError(null);
    setIsSubmitting(false);
    setIsLoadingLibrary(true);
    setSeededOpen(true);
  } else if (!isOpen && seededOpen) {
    setSeededOpen(false);
  }

  useEffect(() => { isSavingRef.current = isSaving; onCloseRef.current = onClose; });

  useEffect(() => {
    if (!isOpen) return undefined;
    isSubmittingRef.current = false;
    prevFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const t = setTimeout(() => { nameRef.current?.focus(); nameRef.current?.select(); }, 0);
    return () => clearTimeout(t);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && !isSavingRef.current && !isSubmittingRef.current) onCloseRef.current(); };
    document.addEventListener("keydown", handler);
    return () => { document.removeEventListener("keydown", handler); prevFocus.current?.focus(); prevFocus.current = null; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    collectionsService.getAllLibraryMedia().then((m) => { if (active) setLibraryMedia(m); }).catch(() => {}).finally(() => { if (active) setIsLoadingLibrary(false); });
    return () => { active = false; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const d = debounceFn((v: string) => setDebouncedSearch(v), 250);
    d(filters.search);
    return () => d.cancel();
  }, [filters.search, isOpen]);

  const matches = useMemo(() => {
    return evaluateSmartCollection(
      { id: collectionId ?? 0, collectionId: collectionId ?? 0, filters: { ...filters, search: debouncedSearch }, createdAt: new Date(), updatedAt: new Date() },
      libraryMedia,
    );
  }, [filters, debouncedSearch, libraryMedia, collectionId]);

  const previewMedia = matches.slice(0, PREVIEW_LIMIT);

  const genres = useMemo(() => {
    const s = new Set<string>();
    libraryMedia.forEach((m) => (m.genres ?? []).forEach((g) => s.add(g)));
    return Array.from(s).sort();
  }, [libraryMedia]);

  function setFilter<K extends keyof MediaFilterState>(k: K, v: MediaFilterState[K]) {
    setFilters((p) => ({ ...p, [k]: v }));
  }

  function toggleGenre(g: string) {
    setFilters((p) => ({ ...p, selectedGenres: p.selectedGenres.includes(g) ? p.selectedGenres.filter((x) => x !== g) : [...p.selectedGenres, g] }));
  }

  function clearFilters() { setFilters(EMPTY_MEDIA_FILTERS); setDebouncedSearch(""); }

  async function submitHandler(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmittingRef.current || isSavingRef.current) return;
    const t = name.trim();
    if (t.length === 0) { setError("Collection name is required."); return; }
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      if (isEditing && collectionId !== undefined) {
        await collectionsService.updateSmartCollectionFilters(collectionId, filters);
        onSaved(collectionId);
      } else {
        const r = await collectionsService.createSmartCollection(t, filters);
        onSaved(r.collection.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save Smart Collection.");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div aria-hidden="true" onClick={() => { if (!isBusy) onClose(); }} className="absolute inset-0 bg-app-bg/80" />
      <div role="dialog" aria-modal="true" aria-labelledby="sce-title" className="relative flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-accent/15 p-2 text-accent-text"><Sparkles className="h-5 w-5" /></div>
            <h2 id="sce-title" className="text-lg font-semibold text-primary">{isEditing ? "Edit Smart Collection" : "Create Smart Collection"}</h2>
          </div>
          <button type="button" onClick={onClose} disabled={isBusy} aria-label="Close" className="rounded-lg p-2 text-muted hover:bg-surface-elevated hover:text-primary disabled:opacity-50"><X className="h-5 w-5" /></button>
        </div>
        <form className="flex flex-1 flex-col overflow-y-auto" onSubmit={submitHandler}>
          <div className="grid flex-1 gap-6 overflow-y-auto p-6 md:grid-cols-2">
            <section className="space-y-5">
              <div>
                <label htmlFor="sce-name" className="block text-sm font-medium text-muted">Name</label>
                <input id="sce-name" ref={nameRef} type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Collection name" className="mt-2 w-full rounded-lg border border-border bg-input-bg px-3 py-2 text-primary outline-none transition focus:border-accent-hover focus:ring-2 focus:ring-accent-hover/20" />
              </div>
              <div>
                <label htmlFor="sce-search" className="block text-sm font-medium text-muted">Search</label>
                <input id="sce-search" type="text" value={filters.search} onChange={(e) => setFilter("search", e.target.value)} placeholder="Search titles..." className="mt-2 w-full rounded-lg border border-border bg-input-bg px-3 py-2 text-primary outline-none transition focus:border-accent-hover focus:ring-2 focus:ring-accent-hover/20" />
              </div>
              <div>
                <span className="block text-sm font-medium text-muted">Media Type</span>
                <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Media type">
                  {MEDIA_TYPES.map((o) => (
                    <button key={o.value} type="button" onClick={() => setFilter("mediaType", o.value)} aria-pressed={filters.mediaType === o.value}
                      className={`rounded-lg border px-4 py-2 text-sm transition ${filters.mediaType === o.value ? "border-accent bg-accent/15 text-accent-text" : "border-border text-muted hover:bg-surface-elevated hover:text-primary"}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="sce-status" className="block text-sm font-medium text-muted">Watch Status</label>
                <select id="sce-status" value={filters.status} onChange={(e) => setFilter("status", e.target.value as MediaFilterState["status"])} className="mt-2 w-full rounded-lg border border-border bg-input-bg px-3 py-2 text-primary outline-none transition focus:border-accent-hover focus:ring-2 focus:ring-accent-hover/20">
                  {STATUSES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="sce-rating" className="block text-sm font-medium text-muted">Minimum Rating</label>
                <select id="sce-rating" value={filters.minRating === null ? "null" : String(filters.minRating)} onChange={(e) => setFilter("minRating", e.target.value === "null" ? null : Number(e.target.value))} className="mt-2 w-full rounded-lg border border-border bg-input-bg px-3 py-2 text-primary outline-none transition focus:border-accent-hover focus:ring-2 focus:ring-accent-hover/20">
                  {RATINGS.map((o) => <option key={o.value === null ? "null" : String(o.value)} value={o.value === null ? "null" : String(o.value)}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <span className="block text-sm font-medium text-muted">Favorites</span>
                <label className="mt-2 flex items-center gap-3">
                  <input type="checkbox" checked={filters.favoritesOnly} onChange={(e) => setFilter("favoritesOnly", e.target.checked)} className="h-4 w-4 rounded border-border text-accent focus:ring-accent-hover" />
                  <span className="text-sm text-primary">Favorites only</span>
                </label>
              </div>
              {genres.length > 0 && (
                <div>
                  <span className="block text-sm font-medium text-muted">Genres</span>
                  <p className="mt-1 text-xs text-muted">Multiple genres use OR</p>
                  <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Genres">
                    {genres.map((g) => (
                      <button key={g} type="button" onClick={() => toggleGenre(g)} aria-pressed={filters.selectedGenres.includes(g)}
                        className={`rounded-lg border px-3 py-1.5 text-sm transition ${filters.selectedGenres.includes(g) ? "border-accent bg-accent/15 text-accent-text" : "border-border text-muted hover:bg-surface-elevated hover:text-primary"}`}>
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <button type="button" onClick={clearFilters} className="text-sm text-muted underline-offset-2 transition hover:text-primary hover:underline">Clear filters</button>
            </section>
            <section className="flex flex-col">
              <h3 className="text-sm font-medium text-muted">Preview</h3>
              <p className="mt-1 text-xs text-muted">{matches.length} {matches.length === 1 ? "title" : "titles"} match</p>
              <div className="mt-3 flex-1 overflow-y-auto rounded-lg border border-border bg-surface/50 p-4">
                {isLoadingLibrary ? (
                  <div className="flex h-full items-center justify-center p-8 text-muted"><LoaderCircle className="mr-2 h-4 w-4 animate-spin" />Loading library...</div>
                ) : previewMedia.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                    <p className="text-sm text-muted">0 titles match</p>
                    <p className="mt-1 text-xs text-muted">No media currently matches these filters.</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {previewMedia.map((m) => (
                      <article key={m.id} className="rounded-lg border border-border bg-surface p-3">
                        <div className="flex items-start gap-3">
                          <div className="rounded bg-surface-elevated p-1.5 text-xs text-accent-text">{m.mediaType === "tv" ? "TV" : "Movie"}</div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-primary">{m.title}</p>
                            <p className="mt-0.5 text-xs text-muted">{m.mediaType === "tv" ? "TV Show" : "Movie"}{m.rating !== undefined && ` · ${m.rating}`}</p>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
          <div className="border-t border-border p-6">
            {error && <p role="alert" className="mb-4 text-sm text-danger">{error}</p>}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={onClose} disabled={isBusy} className="rounded-lg border border-border px-4 py-2 text-muted hover:bg-surface-elevated hover:text-primary disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={isBusy} className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-inverted hover:bg-accent-hover disabled:cursor-wait disabled:opacity-50">
                {isBusy && <LoaderCircle className="h-4 w-4 animate-spin" />}{isBusy ? "Saving..." : isEditing ? "Save Changes" : "Create Smart Collection"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
