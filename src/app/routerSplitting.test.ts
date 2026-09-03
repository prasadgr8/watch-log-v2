import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const appDirectory = resolve(process.cwd(), "src", "app");

const routerSource = readFileSync(resolve(appDirectory, "router.tsx"), "utf-8");

/*
 * Normalize line endings so multi-line assertions are independent of the
 * editor's CRLF output.
 */
const normalizedRouterSource = routerSource.replace(/\r\n/g, "\n");

const viteConfigSource = readFileSync(
  resolve(process.cwd(), "vite.config.ts"),
  "utf-8",
);

const LAZY_ROUTES = [
  { name: "DashboardPage", module: "../features/dashboard/DashboardPage" },
  { name: "LibraryPage", module: "../features/library/LibraryPage" },
  {
    name: "TvShowDetailsPage",
    module: "../features/library/TvShowDetailsPage",
  },
  { name: "SearchPage", module: "../features/search/SearchPage" },
  { name: "SettingsPage", module: "../features/settings/SettingsPage" },
  { name: "StatisticsPage", module: "../features/statistics/StatisticsPage" },
] as const;

/*
 * Source-level regression coverage for route-level code splitting, matching
 * the repository's source-assertion conventions. Runtime routing cannot be
 * exercised in the node test environment, so these assertions pin the lazy
 * loading contract: every page-level route is lazy, the shell stays eager,
 * every existing path remains defined, and the Suspense fallback follows the
 * muted loading-text convention. PWA configuration (autoUpdate, SPA
 * navigation fallback, bounded image caching) continues to be covered by
 * pwaConfig.test.ts and is intentionally not duplicated here.
 */
describe("route-level code splitting", () => {
  it("lazy-loads every page-level route component", () => {
    for (const { name, module } of LAZY_ROUTES) {
      expect(
        normalizedRouterSource,
        name,
      ).toMatch(
        new RegExp(
          `const ${name} = lazy\\(\\s*\\(\\) => import\\("${module}"\\),?\\s*\\);`,
        ),
      );
    }

    expect(normalizedRouterSource.match(/=> import\(/g)?.length).toBe(6);
  });

  it("keeps the application shell eager", () => {
    expect(normalizedRouterSource).toContain(
      'import AppLayout from "../components/layout/AppLayout";',
    );
    expect(normalizedRouterSource).toContain("element: <AppLayout />");
    expect(normalizedRouterSource).not.toContain("AppLayout = lazy");
  });

  it("wraps lazy routes in a Suspense boundary", () => {
    expect(normalizedRouterSource).toContain(
      "<Suspense fallback={<RouteLoadingFallback />}>",
    );
    expect(
      normalizedRouterSource.match(/suspended\(<[A-Z]/g)?.length,
    ).toBe(6);
  });

  it("styles the fallback with the muted loading-text convention", () => {
    expect(normalizedRouterSource).toContain("Loading...");
    expect(normalizedRouterSource).toContain("text-muted");
    expect(normalizedRouterSource).not.toMatch(/slate-|text-white|bg-blue-/);
  });

  it("keeps the trivial Movies stub eager without a Suspense boundary", () => {
    expect(normalizedRouterSource).toContain("function MoviesPage()");
    expect(normalizedRouterSource).toContain("element: <MoviesPage />");
  });

  it("defines every existing route path exactly as before", () => {
    expect(normalizedRouterSource).toContain('path: "/"');
    expect(normalizedRouterSource).toContain("index: true");
    expect(normalizedRouterSource).toContain('path: "library"');
    expect(normalizedRouterSource).toContain('path: "library/tv/:mediaId"');
    expect(normalizedRouterSource).toContain('path: "search"');
    expect(normalizedRouterSource).toContain('path: "movies"');
    expect(normalizedRouterSource).toContain('path: "statistics"');
    expect(normalizedRouterSource).toContain('path: "settings"');
    expect(normalizedRouterSource.match(/path: "/g)?.length).toBe(7);
  });

  it("does not silence the chunk size warning instead of splitting", () => {
    expect(viteConfigSource).not.toContain("chunkSizeWarningLimit");
  });
});

