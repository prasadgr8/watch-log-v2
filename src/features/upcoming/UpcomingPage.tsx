import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Tv } from "lucide-react";

import { mediaRepository } from "../../database/repositories";

import DensityToggle from "../../components/ui/DensityToggle";

import UpcomingShowCard from "./components/UpcomingShowCard";

import {
  upcomingEpisodesService,
  type UpcomingEpisodeItem,
} from "./services/upcomingEpisodesService";

import { getLocalDateString } from "../../domain/dates/airDate";

import { CARD_GAP, EPISODE_GRID_COLUMNS } from "../ui/density";
import { useDensity } from "../ui/useDensity";

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
  episodes: UpcomingEpisodeItem[];
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
 * episodes are grouped by show. Episodes within each show retain the order
 * established by the service comparator (air date → title → season → episode).
 */
function groupUpcomingByMonthAndShow(
  items: UpcomingEpisodeItem[],
): MonthGroup[] {
  const monthMap = new Map<string, Map<number, ShowGroup>>();

  for (const item of items) {
    const yearMonth = item.airDate.slice(0, 7);

    if (!monthMap.has(yearMonth)) {
      monthMap.set(yearMonth, new Map());
    }

    const showMap = monthMap.get(yearMonth)!;

    if (!showMap.has(item.media.id)) {
      showMap.set(item.media.id, {
        media: item.media,
        episodes: [],
      });
    }

    showMap.get(item.media.id)!.episodes.push(item);
  }

  const months: MonthGroup[] = [];

  for (const [yearMonth, showMap] of monthMap.entries()) {
    const year = yearMonth.slice(0, 4);
    const monthIndex = Number(yearMonth.slice(5, 7)) - 1;

    months.push({
      yearMonth,
      label: `${MONTH_NAMES[monthIndex]} ${year}`,
      shows: Array.from(showMap.values()),
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

  const today = getLocalDateString(new Date());

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
                className={`grid items-start ${CARD_GAP[density]} ${EPISODE_GRID_COLUMNS[density]}`}
              >
                {monthGroup.shows.map((show) => (
                  <UpcomingShowCard
                    key={`${show.media.id}-${monthGroup.yearMonth}`}
                    media={show.media}
                    episodes={show.episodes}
                    density={density}
                    today={today}
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
