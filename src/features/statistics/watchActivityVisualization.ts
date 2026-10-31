import type { ViewingActivitySummary } from "../../domain/analytics/activity";
import type { TrailingYearActivity } from "../../domain/analytics/calendarYear";

export interface WatchActivityVisualizationMonth {
  readonly key: string;
  readonly periodStart: Date;
  readonly eventCount: number;
  readonly activeDayCount: number;
  /** Event count divided by the busiest month in the displayed year. */
  readonly relativeIntensity: number;
}

/**
 * Presentation data composed from the existing trailing-year daily activity
 * and the recorded-history summary. No repository access or new analytics is
 * introduced here.
 */
export interface WatchActivityVisualizationProjection {
  readonly totalEventCount: number;
  readonly activeMonthCount: number;
  readonly manualEventCount: number;
  readonly importedEventCount: number;
  readonly manualPercentage: number;
  readonly importedPercentage: number;
  readonly months: readonly WatchActivityVisualizationMonth[];
  /** Most recent active month; otherwise the final displayed month, if any. */
  readonly defaultSelectedMonthKey: string | null;
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getDayKey(date: Date): string {
  return `${getMonthKey(date)}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * Composes a twelve-month matrix from the trailing-year daily activity. The
 * source summary covers the supplied recorded history; the monthly
 * visualization follows the window supplied by the Statistics service.
 */
export function buildWatchActivityVisualizationProjection(
  activity: TrailingYearActivity,
  summary: ViewingActivitySummary,
): WatchActivityVisualizationProjection {
  const daysByMonth = new Map<
    string,
    { periodStart: Date; countsByDay: Map<string, number> }
  >();

  for (const day of activity.days) {
    const key = getMonthKey(day.periodStart);
    let month = daysByMonth.get(key);

    if (month === undefined) {
      month = {
        periodStart: new Date(
          day.periodStart.getFullYear(),
          day.periodStart.getMonth(),
          1,
        ),
        countsByDay: new Map(),
      };
      daysByMonth.set(key, month);
    }

    month.countsByDay.set(getDayKey(day.periodStart), day.eventCount);
  }

  const orderedMonths = [...daysByMonth.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  );
  const rawMonths = orderedMonths.map(([key, month]) => {
    const dailyCounts = [...month.countsByDay.values()];
    const eventCount = dailyCounts.reduce((total, count) => total + count, 0);

    return {
      key,
      periodStart: month.periodStart,
      eventCount,
      activeDayCount: dailyCounts.filter((count) => count > 0).length,
    };
  });
  const maxMonthCount = rawMonths.reduce(
    (maximum, month) => Math.max(maximum, month.eventCount),
    0,
  );
  const months = rawMonths.map((month) => ({
    key: month.key,
    periodStart: month.periodStart,
    eventCount: month.eventCount,
    activeDayCount: month.activeDayCount,
    relativeIntensity: maxMonthCount > 0 ? month.eventCount / maxMonthCount : 0,
  }));
  const activeMonths = months.filter((month) => month.eventCount > 0);
  const latestMonthKey = months.at(-1)?.key ?? null;
  const sourceEventCount =
    summary.sourceEventCounts.manual + summary.sourceEventCounts.import;

  return {
    totalEventCount: summary.totalEventCount,
    activeMonthCount: activeMonths.length,
    manualEventCount: summary.sourceEventCounts.manual,
    importedEventCount: summary.sourceEventCounts.import,
    manualPercentage:
      sourceEventCount > 0
        ? summary.sourceEventCounts.manual / sourceEventCount
        : 0,
    importedPercentage:
      sourceEventCount > 0
        ? summary.sourceEventCounts.import / sourceEventCount
        : 0,
    months,
    defaultSelectedMonthKey: activeMonths.at(-1)?.key ?? latestMonthKey,
  };
}
