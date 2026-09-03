import { lazy, Suspense } from "react";
import type { ReactNode } from "react";

import { createBrowserRouter } from "react-router-dom";

import AppLayout from "../components/layout/AppLayout";

/*
 * Page-level routes are lazily loaded so the initial application shell
 * (layout, sidebar, header) does not download every feature at once. Every
 * emitted chunk is precached by the PWA service worker, so offline behavior
 * and deep links are unchanged. The Movies stub stays eager because splitting
 * it would provide no meaningful reduction.
 */
const DashboardPage = lazy(() => import("../features/dashboard/DashboardPage"));
const LibraryPage = lazy(() => import("../features/library/LibraryPage"));
const TvShowDetailsPage = lazy(
  () => import("../features/library/TvShowDetailsPage"),
);
const SearchPage = lazy(() => import("../features/search/SearchPage"));
const SettingsPage = lazy(() => import("../features/settings/SettingsPage"));
const StatisticsPage = lazy(
  () => import("../features/statistics/StatisticsPage"),
);

function MoviesPage() {
  return <h1 className="text-3xl font-bold">🎬 Movies</h1>;
}

/*
 * Route-level loading fallback shown while a lazily loaded page chunk is
 * fetched. Uses the same muted loading-text convention as the feature-level
 * loading states.
 */
function RouteLoadingFallback() {
  return (
    <div className="flex h-full items-center justify-center p-8 text-muted">
      <p>Loading...</p>
    </div>
  );
}

function suspended(element: ReactNode) {
  return <Suspense fallback={<RouteLoadingFallback />}>{element}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: suspended(<DashboardPage />),
      },
      {
        path: "library",
        element: suspended(<LibraryPage />),
      },
      {
        path: "library/tv/:mediaId",
        element: suspended(<TvShowDetailsPage />),
      },
      {
        path: "search",
        element: suspended(<SearchPage />),
      },
      {
        path: "movies",
        element: <MoviesPage />,
      },
      {
        path: "statistics",
        element: suspended(<StatisticsPage />),
      },
      {
        path: "settings",
        element: suspended(<SettingsPage />),
      },
    ],
  },
]);
