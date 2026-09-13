import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Tv } from "lucide-react";

import { mediaRepository } from "../../database/repositories";

import DensityToggle from "../../components/ui/DensityToggle";

import UpcomingShowCard, {
  type UpcomingShowDateHint,
} from "./components/UpcomingShowCard";
import {
  upcomingEpisodesService,
  type UpcomingEpisodeItem,
} from "./services/upcomingEpisodesService";

import { useDensity } from "../ui/useDensity";
import { CARD_GAP, LIBRARY_GRID_COLUMNS } from "../ui/density";

const UPCOMING_DENSITY_KEY = "upcoming-card-density";

const MONTH_NAMES = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
] as const;

interface ShowGroup {
  media: UpcomingEpisodeItem["media"];
  seasons: number[];
  dateHint: UpcomingShowDateHint;
}

interface MonthGroup {
  yearMonth: string;
  label: string;
  shows: ShowGroup[];
}

/**
 * Pure client-side projection: flat upcoming items → Month/Year → Show.
 *
 * This is a deterministic, read-only transformation: no database reads, no
 * network calls, no async operations. Depends only on the episode data, never
 * on density or presentation state.
 *
 * Months are derived from the YYYY-MM portion of each airDate string (ISO
 * format sorts lexicographically → chronological order). Within each month,
 * episodes collapse to one card per show carrying sorted distinct seasons
 * plus a min/max air-date hint.
 */
function groupUpcomingByMonthAndShow(
  items: UpcomingEpisodeItem[],
): MonthGroup[] {
  const monthMap = new Map<string, Map<number, UpcomingEpisodeItem[]>>();

  for (const item of items) {
    const yearMonth = item.airDate.slice(0, 7);

    if (!monthMap.has(yearMonth)) {
      monthMap.set(yearMonth, new Map());
    }

    const showMap = monthMap.get(yearMonth)!;

    if (!showMap.has(item.media.id)) {
      showMap.set(item.media.id, []);
    }

    showMap.get(item.media.id)!.push(item);
  }

  const months: MonthGroup[] = [];

  for (const [yearMonth, showMap] of monthMap.entries()) {
    const year = yearMonth.slice(0, 4);
    const monthIndex = Number(yearMonth.slice(5, 7)) - 1;
    const shows: ShowGroup[] = [];

    for (const showItems of showMap.values()) {
      const seasonSet = new Set<number>();
      let firstAirDate = showItems[0].airDate;
      let lastAirDate = showItems[0].airDate;

      for (const item of showItems) {
        seasonSet.add(item.episode.seasonNumber);

        if (item.airDate < firstAirDate) {
          firstAirDate = item.airDate;
        }

        if (item.airDate > lastAirDate) {
          lastAirDate = item.airDate;
        }
      }

      shows.push({
        media: showItems[0].media,
        seasons: Array.from(seasonSet).sort((a, b) => a - b),
        dateHint: {
          firstAirDate,
          lastAirDate,
          episodeCount: showItems.length,
        },
      });
    }

    shows.sort((a, b) => a.media.title.localeCompare(b.media.title));

    months.push({
      yearMonth,
      label: `${MONTH_NAMES[monthIndex]} ${year}`,
      shows,
    });
  }

  // ISO YYYY-MM strings sort lexicographically → chronological order.
  months.sort((a, b) =>
    a.yearMonth < b.yearMonth ? -1 : a.yearMonth > b.yearMonth ? 1 : 0,
  );

  return months;
}

export default function UpcomingPage() {
  const [items, setItems] = useState<UpcomingEpisodeItem[]>([]);
  const [hasLibrary, setHasLibrary] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { density, setDensity } = useDensity(UPCOMING_DENSITY_KEY);

  useEffect(() => {
    let isActive = true;

    async function loadUpcoming(): Promise<void> {
      try {
        setError(null);

        const [upcomingItems, mediaCount] = await Promise.all([
          upcomingEpisodesService.getItems(),
          mediaRepository.count(),
        ]);

        if (!isActive) {
          return;
        }

        setItems(upcomingItems);
        setHasLibrary(mediaCount > 0);
      } catch (loadError) {
        if (!isActive) {
          return;
        }

        console.error("Failed to load upcoming episodes:", loadError);
        setError("Unable to load upcoming episodes.");
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadUpcoming();

    return () => {
      isActive = false;
    };
  }, []);

  const groups = useMemo(() => groupUpcomingByMonthAndShow(items), [items]);

  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Tv className="text-accent-text" size={32} />

            <h1 className="text-3xl font-bold text-primary">
              Upcoming Episodes
            </h1>
          </div>

          <DensityToggle density={density} onChange={setDensity} />
        </div>

        <p className="mt-2 text-muted">
          TV episodes airing today, tomorrow, and in the future.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-danger/60 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      )}

      {isLoading ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center text-muted">
          Loading your upcoming episodes...
        </div>
      ) : !hasLibrary ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 p-12 text-center">
          <Tv className="mx-auto h-10 w-10 text-muted" />

          <h2 className="mt-4 text-lg font-semibold text-primary">
            Your library is empty
          </h2>

          <p className="mt-2 text-muted">
            Add your first TV show using the Library page.
          </p>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 p-12 text-center">
          <CalendarDays className="mx-auto h-10 w-10 text-muted" />

          <h2 className="mt-4 text-lg font-semibold text-primary">
            No upcoming episodes
          </h2>

          <p className="mt-2 text-muted">
            Episodes airing today, tomorrow, and in the future will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((monthGroup) => (
            <section
              key={monthGroup.yearMonth}
              aria-labelledby={`month-${monthGroup.yearMonth}`}
            >
              <div className="mb-3 border-b border-border pb-2">
                <h2
                  id={`month-${monthGroup.yearMonth}`}
                  className="text-xl font-semibold text-primary"
                >
                  {monthGroup.label}
                </h2>
              </div>

              <div
                className={`grid items-start ${CARD_GAP[density]} ${LIBRARY_GRID_COLUMNS[density]}`}
              >
                {monthGroup.shows.map((show) => (
                  <UpcomingShowCard
                    key={`${show.media.id}-${monthGroup.yearMonth}`}
                    media={show.media}
                    seasons={show.seasons}
                    dateHint={show.dateHint}
                    density={density}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
