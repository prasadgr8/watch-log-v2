import { createBrowserRouter } from "react-router-dom";

import AppLayout from "../components/layout/AppLayout";

import DashboardPage from "../features/dashboard/DashboardPage";
import LibraryPage from "../features/library/LibraryPage";
import SearchPage from "../features/search/SearchPage";
import SettingsPage from "../features/settings/SettingsPage";

function MoviesPage() {
  return <h1 className="text-3xl font-bold">🎬 Movies</h1>;
}

function StatisticsPage() {
  return <h1 className="text-3xl font-bold">📊 Statistics</h1>;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: "library",
        element: <LibraryPage />,
      },
      {
        path: "search",
        element: <SearchPage />,
      },
      {
        path: "movies",
        element: <MoviesPage />,
      },
      {
        path: "statistics",
        element: <StatisticsPage />,
      },
      {
        path: "settings",
        element: <SettingsPage />,
      },
    ],
  },
]);