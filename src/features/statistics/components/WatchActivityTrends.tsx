import { CalendarDays, History, Minus, TrendingDown, TrendingUp } from "lucide-react";

import type { WatchActivityTrends } from "../../../domain/analytics/trends";

import StatisticCard from "./StatisticCard";

interface WatchActivityTrendsProps {
  trends: WatchActivityTrends;
  isLoading: boolean;
}

/*
 * Presentation-only view over the A28 recorded-activity trend projection.
 *
 * This component owns no reading and no trend arithmetic: the trends arrive
 * fully computed from `watchActivityService.loadWatchActivitySection`, and this
 * component only renames fields into the approved presentation vocabulary and
 * formats them for display. Every percentage is rendered from the domain's
 * unrounded ratio; nothing is divided, summed, or compared here.
 *
 * TERMINOLOGY
 *
 * The domain keeps precise names. The UI uses the approved A28 vocabulary:
 * Active, Inactive, Current Run, Longest Run, Change, Previous, and Current,
 * under the "Viewing Activity" label. "Activity" is never shortened into a
 * claim about what the user watched, because `WatchHistory` is not a complete
 * lifetime viewing ledger: unwatching deletes rows, a manual re-watch need not
 * create another event, TV
 * Time import can collapse duplicates, and the store is episode-based and does
 * not represent movies. "Consecutive periods with recorded activity." is the
 * supporting wording for the run metrics.
 *
 * INDEPENDENCE FROM THE TIMELINE
 *
 * Trends describe the FULL natural history window and are deliberately not
 * bounded by the timeline's 120-bucket presentation cap. This component
 * therefore reads no timeline projection field at all — neither its omission
 * metadata nor its per-period counts — so a shortened timeline can never
 * silently narrow the trend metrics.
 *
 * Purely presentational: no repository, network, clock, or persistence access,
 * no page state, and no interaction. All metrics are real DOM text, so no chart,
 * SVG, canvas, or `progressbar` role is involved.
 */

/** Shown wherever a value is still loading or genuinely undefined. */
const PLACEHOLDER = "—";

/**
 * Formats the domain's unrounded signed ratio as a display percentage.
 *
 * The ratio is never recomputed here — only rounded for reading — so the value
 * can never be `NaN` or `Infinity`: the domain yields `null` instead whenever no
 * finite ratio exists, and a `null` ratio renders as the placeholder rather
 * than a misleading `0%`.
 */
function formatPercentage(percentageChange: number | null): string {
  if (percentageChange === null || !Number.isFinite(percentageChange)) {
    return PLACEHOLDER;
  }

  const rounded = Math.round(percentageChange * 100);

  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}
export default function WatchActivityTrends({
  trends,
  isLoading,
}: WatchActivityTrendsProps) {
  function placeholder(value: number): number | string {
    return isLoading ? PLACEHOLDER : value;
  }

  const hasHistory = trends.totalPeriodCount > 0;
  const { periodOverPeriod } = trends;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium uppercase tracking-wide text-muted">
        Viewing Activity
      </p>

      {!hasHistory ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 p-6 text-center">
          <History aria-hidden="true" className="mx-auto h-8 w-8 text-muted" />

          <p className="mt-3 text-sm text-muted">
            No recorded activity to compare yet.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <StatisticCard
              title="Active"
              value={placeholder(trends.activePeriodCount)}
              suffix="periods"
              icon={<CalendarDays size={24} aria-hidden="true" />}
              iconClassName="text-accent-text"
            />

            <StatisticCard
              title="Inactive"
              value={placeholder(trends.inactivePeriodCount)}
              suffix="periods"
              icon={<Minus size={24} aria-hidden="true" />}
              iconClassName="text-muted"
            />

            <StatisticCard
              title="Current Run"
              value={placeholder(trends.latestConsecutiveActivePeriods)}
              suffix="periods"
              icon={<TrendingUp size={24} aria-hidden="true" />}
              iconClassName="text-accent-text"
            />

            <StatisticCard
              title="Longest Run"
              value={placeholder(trends.longestConsecutiveActivePeriods)}
              suffix="periods"
              icon={<TrendingDown size={24} aria-hidden="true" />}
              iconClassName="text-accent-text"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <StatisticCard
              title="Change"
              value={
                isLoading
                  ? PLACEHOLDER
                  : formatPercentage(periodOverPeriod.percentageChange)
              }
              icon={<TrendingUp size={24} aria-hidden="true" />}
              iconClassName="text-accent-text"
            />

            <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
              <p className="text-sm font-medium uppercase tracking-wide text-muted">
                Previous
              </p>

              <p className="mt-2 text-lg font-semibold text-primary">
                {periodOverPeriod.hasPredecessor &&
                periodOverPeriod.previousEventCount !== null
                  ? placeholder(periodOverPeriod.previousEventCount)
                  : PLACEHOLDER}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
              <p className="text-sm font-medium uppercase tracking-wide text-muted">
                Current
              </p>

              <p className="mt-2 text-lg font-semibold text-primary">
                {placeholder(periodOverPeriod.currentEventCount)}
              </p>
            </div>
          </div>
        </>
      )}

      <p className="text-sm text-muted">
        Consecutive periods with recorded activity. Recorded events may be
        removed when an episode is marked unwatched, and movies are not
        represented.
      </p>
    </div>
  );
}