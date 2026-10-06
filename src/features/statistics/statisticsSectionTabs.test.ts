import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const pageSource = readFileSync(
  join(featureDirectory, "StatisticsPage.tsx"),
  "utf-8",
);

const tabsSource = readFileSync(
  join(featureDirectory, "components", "StatisticsSectionTabs.tsx"),
  "utf-8",
);

const sectionsSource = readFileSync(
  join(featureDirectory, "statisticsSections.ts"),
  "utf-8",
);

const overviewSource = readFileSync(
  join(featureDirectory, "components", "StatisticsOverview.tsx"),
  "utf-8",
);

const activitySectionSource = readFileSync(
  join(featureDirectory, "components", "WatchingActivitySection.tsx"),
  "utf-8",
);

/*
 * Source-level contract coverage for the A30 Step 1 Statistics
 * information-architecture foundation: an accessible two-section tab
 * interface (Overview / Watching Activity) with local page state only —
 * no route, no URL/hash state — and exclusive tabpanel rendering. Data
 * logic is out of scope: the tabs only choose which pre-loaded section
 * the page renders.
 */

describe("statistics section tablist", () => {
  it("renders two tabs in a labelled tablist", () => {
    expect(tabsSource).toContain('role="tablist"');
    expect(tabsSource).toContain('aria-label="Statistics sections"');
    expect(tabsSource).toContain('{ value: "overview", label: "Overview" }');
    expect(tabsSource).toContain(
      '{ value: "activity", label: "Watching Activity" }',
    );
    expect(tabsSource.match(/role="tab"/g)).toHaveLength(1); // once inside the map
    expect(tabsSource).toContain("SECTIONS.map(");
  });

  it("exposes selection through aria-selected on each tab", () => {
    expect(tabsSource).toContain("aria-selected={isSelected}");
    expect(tabsSource).toContain(
      "const isSelected = activeSection === section.value;",
    );
    expect(tabsSource).not.toMatch(/aria-selected=\{true\}/);
  });

  it("wires stable tab and panel id relationships", () => {
    expect(sectionsSource).toContain(
      'overview: "statistics-tab-overview"',
    );
    expect(sectionsSource).toContain('activity: "statistics-tab-activity"');
    expect(sectionsSource).toContain(
      'overview: "statistics-panel-overview"',
    );
    expect(sectionsSource).toContain('activity: "statistics-panel-activity"');
    expect(tabsSource).toContain("id={STATISTICS_TAB_IDS[section.value]}");
    expect(tabsSource).toContain("aria-controls={STATISTICS_PANEL_IDS[section.value]}");

    expect(pageSource).toContain("STATISTICS_PANEL_IDS.overview");
    expect(pageSource).toContain("STATISTICS_PANEL_IDS.activity");
    expect(pageSource).toContain("aria-labelledby={STATISTICS_TAB_IDS.overview}");
    expect(pageSource).toContain("aria-labelledby={STATISTICS_TAB_IDS.activity}");
  });

  it("keeps focus on the activated tab without moving it", () => {
    expect(tabsSource).not.toContain("useRef");
    expect(tabsSource).not.toContain(".focus(");
    expect(tabsSource).not.toContain("autoFocus");
    expect(tabsSource).toContain("type=\"button\"");
    expect(tabsSource).toContain(
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40",
    );
  });
});

describe("statistics section selection state", () => {
  it("defaults to the Overview section", () => {
    expect(pageSource).toContain(
      'useState<StatisticsSection>("overview")',
    );
    expect(pageSource).toContain("activeSection === \"overview\"");
  });

  it("hands page-owned state to the tab control", () => {
    expect(pageSource).toContain("activeSection={activeSection}");
    expect(pageSource).toContain("onChange={setActiveSection}");
    expect(pageSource).toContain("import StatisticsSectionTabs from");
    expect(pageSource).toContain('from "./statisticsSections"');
    expect(pageSource).toMatch(
      /import[\s\S]*?StatisticsSection[\s\S]*?from ".\/statisticsSections"/,
    );
    expect(sectionsSource).toContain("export type StatisticsSection");
  });

  it("introduces no route or URL state for the selected section", () => {
    expect(pageSource).not.toContain("useNavigate");
    expect(pageSource).not.toContain("useSearchParams");
    expect(pageSource).not.toContain("window.location");
    expect(pageSource).not.toContain("location.hash");
    expect(pageSource).not.toContain("URLSearchParams");
    expect(pageSource).not.toContain("localStorage");
    expect(pageSource).not.toContain("sessionStorage");
    expect(tabsSource).not.toContain("localStorage");
    expect(tabsSource).not.toContain("window.location");
  });
});

describe("statistics section tabpanels", () => {
  it("renders exactly one panel through an exclusive branch", () => {
    expect(pageSource).toContain("activeSection === \"overview\" ? (");
    expect(pageSource.match(/role="tabpanel"/g)).toHaveLength(2); // both arms of the ternary
    expect(pageSource).toContain("<StatisticsOverview");
    expect(pageSource).toContain("<WatchingActivitySection");
    expect(pageSource).not.toContain("&& activeSection");
    expect(pageSource).not.toContain("&& activeSection ===");
  });

  it("keeps each section's markup inside its own component", () => {
    expect(overviewSource).toContain("Library Overview");
    expect(overviewSource).not.toContain("Historical Viewing Activity");
    expect(activitySectionSource).toContain("Historical Viewing Activity");
    expect(activitySectionSource).not.toContain("Library Overview");
  });
});
