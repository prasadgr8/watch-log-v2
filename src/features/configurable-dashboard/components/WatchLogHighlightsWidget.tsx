import { useEffect, useState } from "react";

import { Link } from "react-router-dom";

import { Activity, Flame } from "lucide-react";

import {
  getWatchLogHighlightsData,
  type WatchLogHighlightsData,
} from "../services/watchlogHighlightsWidgetService";

/* Compact WatchLog Highlights widget: a few glanceable metrics plus small
 * personalized insights. Links to Statistics for the full picture; deliberately
 * free of charts, calendars, heatmaps, or detailed historical analysis. */
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
      <div className="rounded-lg border border-dashed border-border bg-app-bg/60 p-6 text-center">
        <Activity
          aria-hidden="true"
          className="mx-auto h-8 w-8 text-muted"
        />
        <p className="mt-3 text-sm font-medium text-primary">
          No viewing activity yet
        </p>
        <p className="mt-1 text-sm text-muted">
          Your streak, titles watched, and insights will appear here as you
          watch.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {renderMetric("Streak", data.currentStreak, "days", Flame)}
        {renderMetric(
          "Titles watched",
          data.titlesWatched,
          "titles",
          null,
        )}
        {renderMetric("Last 30 days", data.recentWatches, "watches", null)}
        {renderMetric("Active days", data.activeDays, "days", null)}
      </div>

      {data.insights.length > 0 && (
        <section aria-label="Highlights insights" className="space-y-2">
          {data.insights.map((insight) => (
            <div
              key={insight.id}
              className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-border bg-app-bg/60 p-3"
            >
              <p className="min-w-0 truncate text-xs font-medium text-primary">
                {insight.label}
              </p>
              <p className="shrink-0 text-sm font-semibold text-primary">
                {insight.value} {insight.unit}
              </p>
            </div>
          ))}
        </section>
      )}

      <Link
        to="/statistics"
        aria-label="View all statistics"
        className="inline-flex items-center gap-2 text-sm font-medium text-accent-text transition hover:text-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40"
      >
        View Statistics
        <ArrowRightIcon aria-hidden="true" className="h-4 w-4" />
      </Link>
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
    <div key={label} className="rounded-lg border border-border bg-surface p-3">
      <div className="flex items-center gap-2">
        {Icon !== null && (
          <Icon
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-accent-text"
          />
        )}
        <p className="text-xs font-medium text-muted">{label}</p>
      </div>
      <p className="mt-1 text-sm font-semibold text-primary">
        {value} {unit}
      </p>
    </div>
  );
}

function ArrowRightIcon({ className }: { className: string }) {
  // Inline icon keeps the widget free of an extra barrel import for one icon.
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5l7 7-7 7"
      />
    </svg>
  );
}
