import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const pageSource = readFileSync(
  join(featureDirectory, "StatisticsPage.tsx"),
  "utf-8",
);

const existingOverviewSource = readFileSync(
  join(featureDirectory, "components", "StatisticsOverview.tsx"),
  "utf-8",
);

const candidateOverviewSource = readFileSync(
  join(featureDirectory, "components", "StatisticsOverviewCandidate.tsx"),
  "utf-8",
);

const variantSource = readFileSync(
  join(featureDirectory, "statisticsOverviewVariant.ts"),
  "utf-8",
);

/*
 * Source-level contract coverage for the A/B Foundation (Step 0): a new
 * candidate Statistics Overview coexists with the existing control
 * implementation, both consume the same precomputed StatisticsDashboard, and a
 * single reversible switch selects which one renders — without a new route,
 * without deleting the existing Overview, and without any candidate business
 * calculations or hard-coded screenshot sample values.
 */

describe("statistics overview A/B candidate component", () => {
  it("consumes the computed dashboard through a type-only import", () => {
    expect(candidateOverviewSource).toContain(
      'import type { StatisticsDashboard } from "../services/statisticsService";',
    );
  });

  it("accepts the same props contract as the existing Overview", () => {
    expect(candidateOverviewSource).toContain("StatisticsDashboard");
    expect(candidateOverviewSource).toContain("isLoading: boolean");
    expect(candidateOverviewSource).toContain("error: string | null");
    expect(candidateOverviewSource).toContain("stats.library.total");
    expect(candidateOverviewSource).toContain("stats.watchEventCount");
  });

  it("never reads the database, a repository, or a service loader", () => {
    for (const forbidden of [
      "loadStatistics(",
      "loadWatchActivitySection(",
      "mediaRepository",
      "episodeRepository",
      "watchHistoryRepository",
      "indexedDB",
      "openDB(",
      "db.",
    ]) {
      expect(candidateOverviewSource, forbidden).not.toContain(forbidden);
    }
  });

  it("introduces no business calculations or screenshot sample values", () => {
    // Strip comments so the guard targets actual code, not documentation
    // prose that legitimately names the out-of-scope analytics.
    const codeOnly = candidateOverviewSource
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "");

    for (const forbidden of [
      "426",
      "68 titles",
      "76%",
      "streak",
      "genre",
      "milestone",
    ]) {
      expect(codeOnly, forbidden).not.toContain(forbidden);
    }
  });

  it("preserves loading and error semantics", () => {
    expect(candidateOverviewSource).toContain('role="alert"');
    expect(candidateOverviewSource).toContain(
      'return isDataUnavailable ? "—" : value;',
    );
    expect(candidateOverviewSource).toContain(
      "Daily watch activity is unavailable because statistics could not be loaded.",
    );
  });
});

describe("statistics overview A/B switch", () => {
  it("defaults to the existing Overview so the baseline stays the default", () => {
    expect(variantSource).toContain(
      "export const STATISTICS_OVERVIEW_VARIANT: StatisticsOverviewVariant =",
    );
    expect(variantSource).toContain('"existing"');
  });

  it("is a single controlled constant, not a route or persistence switch", () => {
    for (const forbidden of [
      "useNavigate",
      "useSearchParams",
      "window.location",
      "URLSearchParams",
      "localStorage",
      "sessionStorage",
    ]) {
      expect(variantSource, forbidden).not.toContain(forbidden);
    }
  });
});

describe("statistics page A/B integration", () => {
  it("keeps the existing Overview and adds the candidate as a selectable branch", () => {
    expect(pageSource).toContain(
      'import StatisticsOverview from "./components/StatisticsOverview";',
    );
    expect(pageSource).toContain(
      'import StatisticsOverviewCandidate from "./components/StatisticsOverviewCandidate";',
    );
    expect(pageSource).toContain(
      'import { STATISTICS_OVERVIEW_VARIANT } from "./statisticsOverviewVariant";',
    );
    expect(pageSource).toContain("<StatisticsOverview");
    expect(pageSource).toContain("<StatisticsOverviewCandidate");
  });

  it("passes the identical dashboard, loading, and error props to both", () => {
    expect(
      pageSource.match(/stats=\{stats\}/g)?.length ?? 0,
    ).toBeGreaterThanOrEqual(2);
    expect(
      pageSource.match(/isLoading=\{isLoading\}/g)?.length ?? 0,
    ).toBeGreaterThanOrEqual(2);
    expect(
      pageSource.match(/error=\{error\}/g)?.length ?? 0,
    ).toBeGreaterThanOrEqual(2);
  });

  it("selects the Overview through the switch without a second route or read", () => {
    expect(pageSource).toContain(
      'STATISTICS_OVERVIEW_VARIANT === "candidate" ? (',
    );
    expect(pageSource).not.toContain("/statistics-new");
    expect(pageSource.match(/await loadStatistics\(\)/g)).toHaveLength(1);
    expect(pageSource.match(/role="tabpanel"/g)).toHaveLength(2);
  });

  it("leaves the existing Overview implementation untouched", () => {
    expect(existingOverviewSource).toContain(
      'import type { StatisticsDashboard } from "../services/statisticsService";',
    );
    expect(existingOverviewSource).not.toContain("Candidate");
  });
});
