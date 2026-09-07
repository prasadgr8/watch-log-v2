import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

interface GenreMultiSelectProps {
  genres: string[];
  selectedGenres: string[];
  onChange: (genres: string[]) => void;
}

/*
 * Dependency-free accessible multi-select dropdown for Library genre
 * filtering. The trigger mirrors the other filter controls; the panel is a
 * non-modal dialog anchored to the trigger that closes on Escape, outside
 * pointer-down, or Done. Checkbox changes apply immediately through onChange
 * (empty selection = no genre filtering), the search input only filters the
 * displayed options, and the genre list is provided by the caller.
 */
export default function GenreMultiSelect({
  genres,
  selectedGenres,
  onChange,
}: GenreMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [alignment, setAlignment] = useState<"left" | "right">("left");

  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  function openPanel(): void {
    const triggerRect = triggerRef.current?.getBoundingClientRect();
    const margin = 16;

    if (triggerRect) {
      const overflowsRight =
        triggerRect.right + 256 > window.innerWidth - margin;
      const fitsLeft = triggerRect.left - 256 >= margin;

      setAlignment(overflowsRight && fitsLeft ? "right" : "left");
    }

    setQuery("");
    setIsOpen(true);
  }

  function closePanel(refocusTrigger: boolean): void {
    setQuery("");
    setIsOpen(false);

    if (refocusTrigger) {
      triggerRef.current?.focus();
    }
  }

  function toggleGenre(genre: string): void {
    if (selectedGenres.includes(genre)) {
      onChange(selectedGenres.filter((selected) => selected !== genre));
    } else {
      onChange([...selectedGenres, genre]);
    }
  }

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    searchRef.current?.focus();

    function handleDocumentKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setIsOpen(false);
        setQuery("");
        triggerRef.current?.focus();
      }
    }

    function handleDocumentPointerDown(event: PointerEvent): void {
      if (
        containerRef.current &&
        event.target instanceof Node &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setQuery("");
      }
    }

    document.addEventListener("keydown", handleDocumentKeyDown);
    document.addEventListener("pointerdown", handleDocumentPointerDown);

    return () => {
      document.removeEventListener("keydown", handleDocumentKeyDown);
      document.removeEventListener("pointerdown", handleDocumentPointerDown);
    };
  }, [isOpen]);

  const normalizedQuery = query.trim().toLowerCase();
  const visibleGenres =
    normalizedQuery.length > 0
      ? genres.filter((genre) =>
          genre.toLowerCase().includes(normalizedQuery),
        )
      : genres;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        ref={triggerRef}
        onClick={() => (isOpen ? closePanel(true) : openPanel())}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-controls="library-genre-popover"
        className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40 ${
          isOpen
            ? "border-accent-hover bg-input-bg text-primary"
            : "border-border bg-input-bg text-muted hover:text-primary"
        }`}
      >
        {selectedGenres.length > 0
          ? `Genre (${selectedGenres.length})`
          : "Genre"}

        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          id="library-genre-popover"
          role="dialog"
          aria-modal="false"
          aria-label="Filter by genres"
          className={`absolute top-full z-30 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-surface-elevated p-3 shadow-lg ${
            alignment === "right" ? "right-0" : "left-0"
          }`}
        >
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search genres..."
            aria-label="Search genres"
            className="w-full rounded-md border border-border bg-input-bg px-3 py-2 text-sm text-primary outline-none transition placeholder:text-muted focus:border-accent-hover focus:ring-2 focus:ring-accent-hover/20"
          />

          <ul className="mt-2 max-h-56 overflow-y-auto">
            {visibleGenres.map((genre) => {
              const isSelected = selectedGenres.includes(genre);

              return (
                <li key={genre}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-primary transition hover:bg-surface">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleGenre(genre)}
                      className="h-4 w-4 accent-accent"
                    />
                    {genre}
                  </label>
                </li>
              );
            })}

            {visibleGenres.length === 0 && (
              <li className="px-2 py-1.5 text-sm text-muted">
                No genres match your search.
              </li>
            )}
          </ul>

          <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2">
            <button
              type="button"
              onClick={() => onChange([])}
              className="rounded-md px-2 py-1 text-sm text-muted transition hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40"
            >
              Clear
            </button>

            <span aria-live="polite" className="text-xs text-muted">
              {selectedGenres.length} selected
            </span>

            <button
              type="button"
              onClick={() => closePanel(true)}
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-inverted transition hover:bg-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}