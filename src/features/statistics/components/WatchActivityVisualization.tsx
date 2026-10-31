import { useState } from "react";
import { History } from "lucide-react";

import type { ViewingActivitySummary } from "../../../domain/analytics/activity";
import type { WatchActivityVisualizationProjection } from "../watchActivityVisualization";

interface WatchActivityVisualizationProps {
  visualization: WatchActivityVisualizationProjection;
  summary: ViewingActivitySummary;
  isLoading: boolean;
  error: string | null;
}

function formatMonth(date: Date, month: "long" | "short" = "long"): string {
  return new Intl.DateTimeFormat(undefined, {
    month,
    year: "numeric",
  }).format(date);
}

function formatPercentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/*
 * The monthly matrix consumes the existing trailing-year daily activity
 * projection. Total and source values come from the existing recorded-history
 * summary. Selection is ephemeral component state.
 */
export default function WatchActivityVisualization({
  visualization,
  summary,
  isLoading,
  error,
}: WatchActivityVisualizationProps) {
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const selectedMonth =
    visualization.months.find((month) => month.key === selectedMonthKey) ??
    visualization.months.find(
      (month) => month.key === visualization.defaultSelectedMonthKey,
    ) ??
    visualization.months.at(-1);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4 text-center text-sm text-muted">
        Loading watch activity visualization...
      </div>
    );
  }

  if (error !== null) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-border bg-surface p-4 text-center text-sm text-muted"
      >
        Activity visualization is unavailable because statistics could not be
        loaded.
      </div>
    );
  }

  if (visualization.months.length === 0 || selectedMonth === undefined) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface/50 p-8 text-center">
        <History aria-hidden="true" className="mx-auto h-8 w-8 text-muted" />
        <p className="mt-3 text-sm text-muted">
          No recorded activity to visualize yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div
        role="group"
        aria-label="Activity summary"
        className="grid gap-3 sm:grid-cols-3"
      >
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Total Events
          </p>
          <p className="mt-2 text-2xl font-bold text-primary">
            {visualization.totalEventCount}
          </p>
          <p className="mt-1 text-xs text-muted">
            In currently recorded history
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Active Months
          </p>
          <p className="mt-2 text-2xl font-bold text-primary">
            {visualization.activeMonthCount}
          </p>
          <p className="mt-1 text-xs text-muted">In the last 12 months</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Manual / Imported Source Ratio
          </p>
          <p className="mt-2 text-sm font-semibold text-primary">
            Manual {visualization.manualEventCount} (
            {formatPercentage(visualization.manualPercentage)})
          </p>
          <p className="mt-1 text-sm font-semibold text-primary">
            Imported {visualization.importedEventCount} (
            {formatPercentage(visualization.importedPercentage)})
          </p>
          <p className="mt-1 text-xs text-muted">
            {summary.totalEventCount} recorded events by source
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-semibold text-primary">
            Monthly Activity · Last 12 Months
          </h4>
          <p className="mt-1 text-xs text-muted">
            Select a month to highlight its recorded activity.
          </p>
        </div>

        <div
          role="group"
          aria-label="Monthly activity by month"
          className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6"
        >
          {visualization.months.map((month) => {
            const isSelected = month.key === selectedMonth.key;
            const isActive = month.eventCount > 0;

            return (
              <button
                key={month.key}
                type="button"
                aria-pressed={isSelected}
                aria-label={`${formatMonth(month.periodStart)}: ${month.eventCount} recorded events, ${month.activeDayCount} active days`}
                onClick={() => setSelectedMonthKey(month.key)}
                className={`min-w-0 rounded-xl border p-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/50 motion-reduce:transition-none ${
                  isSelected
                    ? "border-accent-hover bg-accent/10 ring-2 ring-accent-hover/30"
                    : isActive
                      ? "border-accent/40 bg-accent/5 hover:bg-accent/10"
                      : "border-border bg-surface-elevated/50 text-muted hover:bg-surface-hover"
                }`}
              >
                <span className="block truncate text-xs font-semibold">
                  {formatMonth(month.periodStart, "short")}
                </span>
                <span className="mt-1 block text-lg font-bold text-primary">
                  {month.eventCount}
                </span>
                <span className="block text-[11px] text-muted">
                  {month.activeDayCount} active days
                </span>
                <span
                  aria-hidden="true"
                  className="mt-2 block h-1.5 overflow-hidden rounded-full bg-surface-elevated"
                >
                  <span
                    className="block h-full rounded-full bg-accent-hover"
                    style={{ width: `${month.relativeIntensity * 100}%` }}
                  />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
