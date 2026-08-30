import { LayoutGrid, LayoutList } from "lucide-react";

import type { ViewMode } from "../../types";

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onChange: (viewMode: ViewMode) => void;
  label?: string;
}

interface ViewModeOption {
  value: ViewMode;
  label: string;
  icon: typeof LayoutGrid;
}

const VIEW_MODE_OPTIONS: ViewModeOption[] = [
  { value: "grid", label: "Grid view", icon: LayoutGrid },
  { value: "list", label: "List view", icon: LayoutList },
];

/*
 * Accessible Grid/List presentation toggle. The active mode is communicated
 * through aria-pressed in addition to styling so the state never relies on
 * color alone. Both buttons are native controls, so keyboard activation works
 * without extra handling.
 */
export default function ViewModeToggle({
  viewMode,
  onChange,
  label = "View mode",
}: ViewModeToggleProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-elevated p-1"
    >
      {VIEW_MODE_OPTIONS.map((option) => {
        const isActive = viewMode === option.value;

        const Icon = option.icon;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            aria-label={option.label}
            title={option.label}
            onClick={() => onChange(option.value)}
            className={`rounded-md p-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40 ${
              isActive
                ? "bg-accent/15 text-accent-text"
                : "text-muted hover:bg-surface-hover hover:text-accent"
            }`}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
