import { Grid2X2, Grid3X3, Square } from "lucide-react";

import {
  DENSITY_LABELS,
  type CardDensity,
} from "../../features/ui/density";

interface DensityToggleProps {
  density: CardDensity;
  onChange: (density: CardDensity) => void;
  label?: string;
}

interface DensityOption {
  value: CardDensity;
  label: string;
  icon: typeof Grid3X3;
}

const DENSITY_OPTIONS: DensityOption[] = [
  { value: "compact", label: DENSITY_LABELS.compact, icon: Grid3X3 },
  { value: "comfortable", label: DENSITY_LABELS.comfortable, icon: Grid2X2 },
  { value: "large", label: DENSITY_LABELS.large, icon: Square },
];

/**
 * Accessible card-density selector. The active density is communicated
 * through aria-pressed in addition to styling so the state never relies on
 * color alone. All buttons are native controls, so keyboard activation works
 * without extra handling.
 */
export default function DensityToggle({
  density,
  onChange,
  label = "Card density",
}: DensityToggleProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-elevated p-1"
    >
      {DENSITY_OPTIONS.map((option) => {
        const isActive = density === option.value;
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
