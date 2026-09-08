import { Heart, Star, Trash2, UserCheck } from "lucide-react";

import type { WatchStatus } from "../../../types";

interface BulkActionsToolbarProps {
  selectedCount: number;
  totalCount: number;
  isBusy: boolean;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onExitSelection: () => void;
  onSetStatus: (status: WatchStatus) => void;
  onSetFavorite: (favorite: boolean) => void;
  onAddToCollection: () => void;
  onRequestDelete: () => void;
}

const statusOptions: { value: WatchStatus; label: string }[] = [
  { value: "planned", label: "Plan to Watch" },
  { value: "watching", label: "Watching" },
  { value: "completed", label: "Completed" },
  { value: "on-hold", label: "On Hold" },
  { value: "dropped", label: "Dropped" },
];

/*
 * Toolbar presented while the Library is in selection mode. Surfaces the
 * selected count and bulk actions (set status, favorite/unfavorite, add to a
 * collection, delete) and reports selection changes via a live region. All
 * action buttons carry visible labels and are disabled when nothing is
 * selected or an operation is running.
 */
export default function BulkActionsToolbar({
  selectedCount,
  totalCount,
  isBusy,
  onSelectAll,
  onClearSelection,
  onExitSelection,
  onSetStatus,
  onSetFavorite,
  onAddToCollection,
  onRequestDelete,
}: BulkActionsToolbarProps) {
  const hasSelection = selectedCount > 0;
  const disabled = !hasSelection || isBusy;

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-3">
        <p role="status" className="text-sm font-medium text-primary">
          {selectedCount} selected
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onSelectAll}
            disabled={isBusy}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition hover:bg-surface-elevated hover:text-primary disabled:cursor-wait disabled:opacity-50"
          >
            Select all ({totalCount})
          </button>

          <button
            type="button"
            onClick={onClearSelection}
            disabled={isBusy}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition hover:bg-surface-elevated hover:text-primary disabled:cursor-wait disabled:opacity-50"
          >
            Clear
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="bulk-status-select">
            Set watch status for selected items
          </label>
          <select
            id="bulk-status-select"
            disabled={disabled}
            value=""
            onChange={(event) => {
              if (event.target.value) {
                onSetStatus(event.target.value as WatchStatus);
                event.target.value = "";
              }
            }}
            className="rounded-lg border border-border bg-input-bg px-3 py-1.5 text-sm text-primary focus:border-accent-hover focus:outline-none disabled:cursor-wait disabled:opacity-50"
          >
            <option value="" disabled>
              Set status…
            </option>
            {statusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => onSetFavorite(true)}
            disabled={disabled}
            aria-label="Add selected items to favorites"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition hover:bg-surface-elevated hover:text-primary disabled:cursor-wait disabled:opacity-50"
          >
            <Star className="h-4 w-4" aria-hidden="true" />
            Favorite
          </button>

          <button
            type="button"
            onClick={() => onSetFavorite(false)}
            disabled={disabled}
            aria-label="Remove selected items from favorites"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition hover:bg-surface-elevated hover:text-primary disabled:cursor-wait disabled:opacity-50"
          >
            <Heart className="h-4 w-4" aria-hidden="true" />
            Unfavorite
          </button>

          <button
            type="button"
            onClick={onAddToCollection}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition hover:bg-surface-elevated hover:text-primary disabled:cursor-wait disabled:opacity-50"
          >
            <UserCheck className="h-4 w-4" aria-hidden="true" />
            Add to Collection
          </button>

          <button
            type="button"
            onClick={onRequestDelete}
            disabled={disabled}
            aria-label={`Delete ${selectedCount} selected items`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition hover:bg-danger/10 hover:text-danger disabled:cursor-wait disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete{hasSelection ? ` ${selectedCount}` : ""}
          </button>
        </div>

        <button
          type="button"
          onClick={onExitSelection}
          disabled={isBusy}
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition hover:bg-surface-elevated hover:text-primary disabled:cursor-wait disabled:opacity-50"
        >
          Exit Selection
        </button>
      </div>
    </div>
  );
}
