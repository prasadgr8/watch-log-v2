import { describe, expect, it } from "vitest";

import type { ViewingActivitySummary } from "../../domain/analytics/activity";
import type { TrailingYearActivity } from "../../domain/analytics/calendarYear";

import { buildWatchActivityVisualizationProjection } from "./watchActivityVisualization";

function createMonth(
  year: number,
  month: number,
  eventCounts: Readonly<Record<number, number>> = {},
) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;

    return {
      periodStart: new Date(year, month, day),
      eventCount: eventCounts[day] ?? 0,
    };
  });
}

function createActivity(
  days: TrailingYearActivity["days"],
): TrailingYearActivity {
  return {
    windowStart: days[0]?.periodStart ?? new Date(2024, 0, 1),
    windowEnd: days.at(-1)?.periodStart ?? new Date(2024, 0, 1),
    days,
  };
}

function createSummary(
  overrides: Partial<ViewingActivitySummary> = {},
): ViewingActivitySummary {
  return {
    period: "month",
    totalEventCount: 8,
    totalDistinctEpisodeCount: 5,
    activeDayCount: 3,
    eventsPerActiveDay: 8 / 3,
    sourceEventCounts: { manual: 6, import: 2 },
    ...overrides,
  };
}

describe("buildWatchActivityVisualizationProjection", () => {
  it("projects the recorded total, active months, and manual/import ratio", () => {
    const activity = createActivity([
      ...createMonth(2024, 0, { 3: 2 }),
      ...createMonth(2024, 1, { 8: 4 }),
    ]);

    expect(
      buildWatchActivityVisualizationProjection(activity, createSummary()),
    ).toMatchObject({
      totalEventCount: 8,
      activeMonthCount: 2,
      manualEventCount: 6,
      importedEventCount: 2,
      manualPercentage: 0.75,
      importedPercentage: 0.25,
      defaultSelectedMonthKey: "2024-02",
    });
  });

  it("retains inactive months and exposes event volume and active days", () => {
    const projection = buildWatchActivityVisualizationProjection(
      createActivity([
        ...createMonth(2024, 0, { 3: 2 }),
        ...createMonth(2024, 1),
        ...createMonth(2024, 2, { 4: 4, 8: 1 }),
      ]),
      createSummary(),
    );

    expect(projection.months.map((month) => month.eventCount)).toEqual([
      2, 0, 5,
    ]);
    expect(projection.months.map((month) => month.activeDayCount)).toEqual([
      1, 0, 2,
    ]);
    expect(projection.months.map((month) => month.relativeIntensity)).toEqual([
      0.4, 0, 1,
    ]);
  });

  it("selects the latest active month, or the last month when there is no activity", () => {
    const activity = createActivity([
      ...createMonth(2024, 0, { 2: 1 }),
      ...createMonth(2024, 1),
      ...createMonth(2024, 2, { 4: 1 }),
    ]);

    expect(
      buildWatchActivityVisualizationProjection(activity, createSummary())
        .defaultSelectedMonthKey,
    ).toBe("2024-03");
    expect(
      buildWatchActivityVisualizationProjection(
        createActivity([...createMonth(2024, 0), ...createMonth(2024, 1)]),
        createSummary(),
      ).defaultSelectedMonthKey,
    ).toBe("2024-02");
  });

  it("handles empty and all-zero activity safely", () => {
    expect(
      buildWatchActivityVisualizationProjection(
        createActivity([]),
        createSummary({
          totalEventCount: 0,
          sourceEventCounts: { manual: 0, import: 0 },
        }),
      ),
    ).toMatchObject({
      totalEventCount: 0,
      activeMonthCount: 0,
      manualPercentage: 0,
      importedPercentage: 0,
      months: [],
      defaultSelectedMonthKey: null,
    });

    const projection = buildWatchActivityVisualizationProjection(
      createActivity(createMonth(2024, 1)),
      createSummary({
        totalEventCount: 0,
        sourceEventCounts: { manual: 0, import: 0 },
      }),
    );

    expect(projection.activeMonthCount).toBe(0);
    expect(projection.months[0].eventCount).toBe(0);
    expect(projection.months[0].relativeIntensity).toBe(0);
  });

  it("is independent of input order and does not mutate supplied activity", () => {
    const days = [
      ...createMonth(2024, 0, { 1: 2 }),
      ...createMonth(2024, 1, { 2: 3 }),
    ];
    const activity = createActivity(days);
    const before = structuredClone(activity);
    const summary = createSummary();

    const projection = buildWatchActivityVisualizationProjection(
      activity,
      summary,
    );
    const reversedProjection = buildWatchActivityVisualizationProjection(
      createActivity([...days].reverse()),
      summary,
    );

    expect(reversedProjection).toEqual(projection);
    expect(activity).toEqual(before);
  });
});
