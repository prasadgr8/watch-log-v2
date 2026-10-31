import type { ViewingActivitySummary } from "../../domain/analytics/activity";
import type { TrailingYearActivity } from "../../domain/analytics/calendarYear";

export interface WatchActivityVisualizationDay {
  readonly key: string;
  readonly dayOfMonth: number;
  readonly periodStart: Date;
  readonly eventCount: number;
  /** Event count divided by the busiest day in this month; zero for empty days. */
  readonly relativeIntensity: number;
}

export interface WatchActivityVisualizationMonth {
  readonly key: string;
  readonly periodStart: Date;
  readonly eventCount: number;
  readonly activeDayCount: number;
  /** Event count divided by the busiest month in the displayed year. */
  readonly relativeIntensity: number;
  readonly days: readonly WatchActivityVisualizationDay[];
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
 * Composes a twelve-month matrix and the daily values available for each
 * month. The source summary covers the supplied recorded history; the monthly
 * and daily visualization follows the trailing-year window supplied by the
 * Statistics service.
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
    const daysInMonth = new Date(
      month.periodStart.getFullYear(),
      month.periodStart.getMonth() + 1,
      0,
    ).getDate();
    const days = Array.from({ length: daysInMonth }, (_, index) => {
      const dayOfMonth = index + 1;
      const periodStart = new Date(
        month.periodStart.getFullYear(),
        month.periodStart.getMonth(),
        dayOfMonth,
      );

      return {
        key: getDayKey(periodStart),
        dayOfMonth,
        periodStart,
        eventCount: month.countsByDay.get(getDayKey(periodStart)) ?? 0,
      };
    });
    const eventCount = days.reduce((total, day) => total + day.eventCount, 0);
    const maxDayCount = days.reduce(
      (maximum, day) => Math.max(maximum, day.eventCount),
      0,
    );

    return {
      key,
      periodStart: month.periodStart,
      eventCount,
      activeDayCount: days.filter((day) => day.eventCount > 0).length,
      maxDayCount,
      days: days.map((day) => ({
        ...day,
        relativeIntensity: maxDayCount > 0 ? day.eventCount / maxDayCount : 0,
      })),
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
    days: month.days,
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
