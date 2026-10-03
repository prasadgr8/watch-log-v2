import { CalendarCheck, CalendarDays, History, TrendingUp } from "lucide-react";

import type { ViewingActivitySummary } from "../../../domain/analytics/activity";

import StatisticCard from "./StatisticCard";

function formatEventsPerActiveDay(value: number): string {
  return value.toFixed(1);
}

function formatWatchedDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatPeriodRange(start: Date, end: Date): string {
  const startLabel = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(start);
  const endLabel = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(end);

  return `${startLabel} – ${endLabel}`;
}

interface HistoricalViewingActivityProps {
  activity: ViewingActivitySummary;
  isLoading: boolean;
}

/*
 * Presentation-only view over a history-derived ViewingActivitySummary.
 *
 * This component owns no reading and no arithmetic: the summary arrives fully
 * computed from `watchActivityService.loadWatchActivity`, and every value is
 * rendered verbatim (with display-only formatting). All labels describe
 * recorded events so the layer is never confused with the current-state
 * statistics sections.
 */
export default function HistoricalViewingActivity({
  activity,
  isLoading,
}: HistoricalViewingActivityProps) {
  function placeholder(value: number | string): number | string {
    return isLoading ? "—" : value;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        <StatisticCard
          title="Recorded watch events"
          value={placeholder(activity.totalEventCount)}
          icon={<History size={24} aria-hidden="true" />}
          iconClassName="text-accent-text"
        />

        <StatisticCard
          title="Distinct episodes with recorded events"
          value={placeholder(activity.totalDistinctEpisodeCount)}
          icon={<History size={24} aria-hidden="true" />}
          iconClassName="text-accent-text"
        />

        <StatisticCard
          title="Active viewing days"
          value={placeholder(activity.activeDayCount)}
          icon={<CalendarDays size={24} aria-hidden="true" />}
          iconClassName="text-accent-text"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <StatisticCard
          title="Events per active day"
          value={
            isLoading || activity.eventsPerActiveDay === null
              ? "—"
              : formatEventsPerActiveDay(activity.eventsPerActiveDay)
          }
          icon={<TrendingUp size={24} aria-hidden="true" />}
          iconClassName="text-accent-text"
        />

        <StatisticCard
          title="Manual events"
          value={placeholder(activity.sourceEventCounts.manual)}
          icon={<History size={24} aria-hidden="true" />}
          iconClassName="text-accent-text"
        />

        <StatisticCard
          title="Imported events"
          value={placeholder(activity.sourceEventCounts.import)}
          icon={<History size={24} aria-hidden="true" />}
          iconClassName="text-accent-text"
        />
      </div>

      {(activity.firstWatchedAt !== undefined ||
        activity.lastWatchedAt !== undefined) && (
        <div className="grid gap-6 md:grid-cols-2">
          {activity.firstWatchedAt !== undefined && (
            <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium uppercase tracking-wide text-muted">
                    Recorded history begins
                  </p>

                  <h3 className="mt-3 text-lg font-semibold text-primary">
                    {formatWatchedDate(activity.firstWatchedAt)}
                  </h3>
                </div>

                <div className="text-accent-text">
                  <CalendarDays size={24} aria-hidden="true" />
                </div>
              </div>
            </div>
          )}

          {activity.lastWatchedAt !== undefined && (
            <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium uppercase tracking-wide text-muted">
                    Recorded history ends
                  </p>

                  <h3 className="mt-3 text-lg font-semibold text-primary">
                    {formatWatchedDate(activity.lastWatchedAt)}
                  </h3>
                </div>

                <div className="text-accent-text">
                  <CalendarCheck size={24} aria-hidden="true" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activity.mostActivePeriod !== undefined && (
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-muted">
            Most active recorded period
          </p>

          <p className="mt-3 text-lg font-semibold text-primary">
            {activity.mostActivePeriod.eventCount} recorded{" "}
            {activity.mostActivePeriod.eventCount === 1 ? "event" : "events"},{" "}
            {formatPeriodRange(
              activity.mostActivePeriod.periodStart,
              activity.mostActivePeriod.periodEnd,
            )}
          </p>
        </div>
      )}

      <p className="text-sm text-muted">
        Values describe recorded watch events that are still present; marking
        an episode unwatched removes its recorded events, and movies are not
        represented in watch history.
      </p>
    </div>
  );
}