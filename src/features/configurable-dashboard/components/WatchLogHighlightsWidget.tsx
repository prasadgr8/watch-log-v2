import { useEffect, useState } from "react";

import { Activity, Flame } from "lucide-react";

import {
  getWatchLogHighlightsData,
  type WatchLogHighlightsData,
} from "../services/watchlogHighlightsWidgetService";

/* Compact WatchLog Highlights widget: a few glanceable metrics plus small
* personalized insights; deliberately free of detailed historical analysis. */
export default function WatchLogHighlightsWidget() {
  const [data, setData] = useState<WatchLogHighlightsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadHighlights(): Promise<void> {
      try {
        setError(null);

        const highlights = await getWatchLogHighlightsData();

        if (isActive) {
          setData(highlights);
        }
      } catch {
        if (isActive) {
          setError("Unable to load WatchLog Highlights.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadHighlights();

    return () => {
      isActive = false;
    };
  }, []);

  if (isLoading) {
    return (
      <p role="status" className="text-sm text-muted">
        Loading WatchLog Highlights...
      </p>
    );
  }

  if (error !== null) {
    return (
      <p role="alert" className="text-sm text-danger">{error}</p>
    );
  }

  if (data === null) {
    return (
      <p role="status" className="text-sm text-muted">
        Loading WatchLog Highlights...
      </p>
    );
  }

  if (
    data.currentStreak === 0 &&
    data.titlesWatched === 0 &&
    data.recentWatches === 0 &&
    data.activeDays === 0
  ) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-app-bg/60 px-3 py-3 text-center">
        <Activity aria-hidden="true" className="mx-auto h-5 w-5 text-muted" />
        <p className="mt-1.5 text-sm font-medium text-primary">
          No viewing activity yet
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
      {renderMetric("Streak", data.currentStreak, "days", Flame)}
      {renderMetric("Titles watched", data.titlesWatched, "titles", null)}
      {renderMetric("Last 30 days", data.recentWatches, "watches", null)}
      {renderMetric("Active days", data.activeDays, "days", null)}
    </div>
  );
}

function renderMetric(
  label: string,
  value: number,
  unit: string,
  Icon: typeof Flame | null,
) {
  return (
    <div
      key={label}
      className="min-w-0 rounded-lg border border-border bg-surface p-3"
    >
      <div className="flex min-w-0 items-center gap-2">
        {Icon !== null && (
          <Icon
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-accent-text"
          />
        )}
        <p className="min-w-0 truncate text-xs font-medium text-muted">
          {label}
        </p>
      </div>
      <p className="mt-1 whitespace-nowrap text-sm font-semibold text-primary">
        {value} {unit}
      </p>
    </div>
  );
}
