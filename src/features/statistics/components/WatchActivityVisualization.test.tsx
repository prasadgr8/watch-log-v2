import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import type { ViewingActivitySummary } from "../../../domain/analytics/activity";
import type { TrailingYearActivity } from "../../../domain/analytics/calendarYear";

import WatchActivityVisualization from "./WatchActivityVisualization";
import { buildWatchActivityVisualizationProjection } from "../watchActivityVisualization";

(
  globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT: boolean;
  }
).IS_REACT_ACT_ENVIRONMENT = true;

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
    totalEventCount: 4,
    totalDistinctEpisodeCount: 3,
    activeDayCount: 2,
    eventsPerActiveDay: 2,
    sourceEventCounts: { manual: 3, import: 1 },
    ...overrides,
  };
}

let container: HTMLDivElement | null = null;
let root: Root | null = null;

afterEach(() => {
  if (root !== null) {
    act(() => root?.unmount());
    root = null;
  }

  container?.remove();
  container = null;
});

async function renderVisualization(
  activity: TrailingYearActivity,
  summary: ViewingActivitySummary,
) {
  const renderContainer = document.createElement("div");
  container = renderContainer;
  document.body.append(renderContainer);
  root = createRoot(container);
  const visualization = buildWatchActivityVisualizationProjection(
    activity,
    summary,
  );

  await act(async () => {
    root?.render(
      createElement(WatchActivityVisualization, {
        visualization,
        summary,
        isLoading: false,
        error: null,
      }),
    );
  });

  return renderContainer;
}

describe("WatchActivityVisualization", () => {
  it("renders the actual summary, source ratio, monthly activity, and daily counts", async () => {
    const view = await renderVisualization(
      createActivity([
        ...createMonth(2024, 0, { 3: 2 }),
        ...createMonth(2024, 1, { 8: 2 }),
      ]),
      createSummary(),
    );

    expect(view.textContent).toContain("Total Events");
    expect(view.textContent).toContain("Active Months");
    expect(view.textContent).toContain("Manual / Imported Source Ratio");
    expect(view.textContent).toContain("Manual 3 (75%)");
    expect(view.textContent).toContain("Imported 1 (25%)");
    expect(
      view.querySelector('button[aria-label^="January 2024"]'),
    ).not.toBeNull();
    expect(
      view.querySelector('button[aria-label^="February 2024"]'),
    ).not.toBeNull();
    expect(view.textContent).toContain("Daily Activity · February 2024");
    expect(
      view.querySelectorAll("li[aria-label*='recorded events']"),
    ).toHaveLength(29);
  });

  it("selects the most recent active month deterministically and updates on click", async () => {
    const view = await renderVisualization(
      createActivity([
        ...createMonth(2024, 0, { 1: 1 }),
        ...createMonth(2024, 1),
        ...createMonth(2024, 2, { 4: 3 }),
      ]),
      createSummary(),
    );
    const march = view.querySelector<HTMLButtonElement>(
      'button[aria-label^="March 2024"]',
    );
    const january = view.querySelector<HTMLButtonElement>(
      'button[aria-label^="January 2024"]',
    );

    expect(march?.getAttribute("aria-pressed")).toBe("true");
    expect(view.textContent).toContain("Daily Activity · March 2024");

    await act(async () => january?.click());

    expect(january?.getAttribute("aria-pressed")).toBe("true");
    expect(march?.getAttribute("aria-pressed")).toBe("false");
    expect(view.textContent).toContain("Daily Activity · January 2024");
  });

  it("renders a safe all-zero month without hiding inactive dates", async () => {
    const view = await renderVisualization(
      createActivity([
        ...createMonth(2023, 0, { 2: 1 }),
        ...createMonth(2023, 1),
      ]),
      createSummary({
        totalEventCount: 1,
        activeDayCount: 1,
        eventsPerActiveDay: 1,
        sourceEventCounts: { manual: 1, import: 0 },
      }),
    );

    expect(view.textContent).toContain("Total Events");
    expect(view.textContent).toContain("Active Months");
    const february = view.querySelector<HTMLButtonElement>(
      'button[aria-label^="February 2023"]',
    );
    expect(february?.getAttribute("aria-label")).toContain(
      "0 recorded events, 0 active days",
    );
    expect(february?.className).toContain("bg-surface-elevated/50");

    await act(async () => february?.click());

    expect(
      view.querySelectorAll("li[aria-label*='recorded events']"),
    ).toHaveLength(28);
    expect(view.textContent).toContain("Daily Activity · February 2023");
  });
});
