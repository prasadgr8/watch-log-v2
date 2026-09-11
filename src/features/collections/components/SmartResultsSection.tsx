import { Layers } from "lucide-react";

import MediaCard from "../../library/components/MediaCard";
import MediaListItem from "../../library/components/MediaListItem";
import ViewModeToggle from "../../../components/ui/ViewModeToggle";
import DensityToggle from "../../../components/ui/DensityToggle";

import {
  useViewMode,
  LIBRARY_VIEW_MODE_SETTING_KEY,
} from "../../../app/viewMode";
import { useDensity } from "../../ui/useDensity";
import { CARD_GAP, LIBRARY_GRID_COLUMNS } from "../../ui/density";

import type { PersistedMedia } from "../../../types";

interface SmartResultsSectionProps {
  media: PersistedMedia[];
  onToggleFavorite: (mediaItem: PersistedMedia) => Promise<void>;
  onEdit: (mediaItem: PersistedMedia) => void;
  onDelete: (mediaItem: PersistedMedia) => void;
}

/** Smart results reuse the shared library density preference - no Smart-specific key. */
const SMART_DENSITY_KEY = "library-card-density";

/**
 * Live Smart Collection results. Membership is always derived from the media
 * snapshot the parent supplies. Presentation reuses the existing
 * MediaCard/MediaListItem components and the shared view-mode and density
 * preferences, so Smart results never introduce a duplicate card system or a
 * Smart-specific preference key.
 */
export default function SmartResultsSection({
  media,
  onToggleFavorite,
  onEdit,
  onDelete,
}: SmartResultsSectionProps) {
  const { viewMode, setViewMode } = useViewMode(
    LIBRARY_VIEW_MODE_SETTING_KEY,
  );
  const { density, setDensity } = useDensity(SMART_DENSITY_KEY);

  if (media.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface/50 p-12 text-center">
        <Layers className="mx-auto h-10 w-10 text-muted" />
        <h3 className="mt-4 text-lg font-semibold text-primary">
          0 titles match
        </h3>
        <p className="mt-2 text-muted">
          No media currently matches these filters.
        </p>
      </div>
    );
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted">
          {media.length} {media.length === 1 ? "title" : "titles"} match
        </p>

        <div className="flex items-center gap-2">
          <ViewModeToggle
            viewMode={viewMode}
            onChange={setViewMode}
            label="Smart results view"
          />
          <DensityToggle
            density={density}
            onChange={setDensity}
            label="Smart results density"
          />
        </div>
      </div>

      {viewMode === "list" ? (
        <div className="space-y-3">
          {media.map((item) => (
            <MediaListItem
              key={item.id}
              media={item}
              density={density}
              onDelete={async (id) => {
                const target = media.find((m) => m.id === id);
                if (target) {
                  onDelete(target);
                }
              }}
              onEdit={onEdit}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      ) : (
        <div
          className={`grid ${LIBRARY_GRID_COLUMNS[density]} ${CARD_GAP[density]}`}
        >
          {media.map((item) => (
            <MediaCard
              key={item.id}
              media={item}
              density={density}
              onDelete={async (id) => {
                const target = media.find((m) => m.id === id);
                if (target) {
                  onDelete(target);
                }
              }}
              onEdit={onEdit}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      )}
    </section>
  );
}