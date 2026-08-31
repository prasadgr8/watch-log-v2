import { Film } from "lucide-react";

import type { PersistedEpisode, ViewMode } from "../../../types";

import EpisodeCard from "./EpisodeCard";
import EpisodeListItem from "./EpisodeListItem";

interface EpisodeListProps {
  episodes: PersistedEpisode[];
  viewMode: ViewMode;
  updatingEpisodeId: number | null;
  onToggleWatched: (episode: PersistedEpisode) => Promise<void>;
}

export default function EpisodeList({
  episodes,
  viewMode,
  updatingEpisodeId,
  onToggleWatched,
}: EpisodeListProps) {
  if (episodes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface/50 p-10 text-center">
        <Film className="mx-auto h-10 w-10 text-muted" />

        <h3 className="mt-4 text-lg font-semibold text-primary">
          No episodes found
        </h3>

        <p className="mt-2 text-muted">
          This season does not currently contain episode metadata.
        </p>
      </div>
    );
  }

  return viewMode === "list" ? (
    <div className="space-y-3">
      {episodes.map((episode) => (
        <EpisodeListItem
          key={episode.id}
          episode={episode}
          isUpdating={updatingEpisodeId === episode.id}
          onToggleWatched={onToggleWatched}
        />
      ))}
    </div>
  ) : (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {episodes.map((episode) => (
        <EpisodeCard
          key={episode.id}
          episode={episode}
          isUpdating={updatingEpisodeId === episode.id}
          onToggleWatched={onToggleWatched}
        />
      ))}
    </div>
  );
}
