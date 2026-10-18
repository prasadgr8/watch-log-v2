import { useEffect, useState } from "react";

import { Film, Library, Tv } from "lucide-react";

import { getLibraryAtAGlanceData, type LibraryAtAGlanceData } from "../services/libraryAtAGlanceWidgetService";

/* Your Library at a Glance: compact collection snapshot (total titles, TV
 * shows, movies, genres), not a replacement for the Library screen. */
export default function LibraryAtAGlanceWidget() {
  const [data, setData] = useState<LibraryAtAGlanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadLibrarySnapshot(): Promise<void> {
      try {
        setError(null);

        const snapshot = await getLibraryAtAGlanceData();

        if (isActive) {
          setData(snapshot);
        }
      } catch {
        if (isActive) {
          setError("Unable to load Your Library at a Glance.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadLibrarySnapshot();

    return () => {
      isActive = false;
    };
  }, []);

  if (isLoading) {
    return (
      <p role="status" className="text-sm text-muted">
        Loading Your Library at a Glance...
      </p>
    );
  }

  if (error !== null) {
    return (
      <p role="alert" className="text-sm text-danger">{error}</p>
    );
  }

  if (data === null) {
    return (
      <p role="status" className="text-sm text-muted">
        Loading Your Library at a Glance...
      </p>
    );
  }

  if (data.totalTitles === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-app-bg/60 px-3 py-3 text-center">
        <Library aria-hidden="true" className="mx-auto h-5 w-5 text-muted" />
        <p className="mt-1.5 text-sm font-medium text-primary">
          Your library is empty
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
        {renderMetric("Total titles", data.totalTitles, Library)}
        {renderMetric("TV shows", data.tvShows, Tv)}
        {renderMetric("Movies", data.movies, Film)}
        {renderMetric("Genres", data.genres, null)}
      </div>

    </div>
  );
}

function renderMetric(
  label: string,
  value: number,
  Icon: typeof Film | null,
) {
  return (
    <div
      key={label}
      className="min-w-0 rounded-lg border border-border bg-surface p-3"
    >
      <div className="flex min-w-0 items-center gap-2">
        {Icon !== null && (
          <Icon
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-accent-text"
          />
        )}
        <p className="min-w-0 truncate text-xs font-medium text-muted">
          {label}
        </p>
      </div>
      <p className="mt-1 whitespace-nowrap text-sm font-semibold text-primary">
        {value}
      </p>
    </div>
  );
}
