import { useEffect, useState } from "react";
import { CalendarDays, Tv } from "lucide-react";

import { mediaRepository } from "../../database/repositories";

import UpcomingEpisodeListItem from "./components/UpcomingEpisodeListItem";
import {
  upcomingEpisodesService,
  type UpcomingEpisodeItem,
} from "./services/upcomingEpisodesService";

import {
  getLocalDateString,
  getRelativeAirDateLabel,
} from "../../domain/dates/airDate";

interface DateGroup {
  airDate: string;
  items: UpcomingEpisodeItem[];
}

function groupByAirDate(items: UpcomingEpisodeItem[]): DateGroup[] {
  const groups: DateGroup[] = [];
  let currentGroup: DateGroup | null = null;

  for (const item of items) {
    if (currentGroup === null || currentGroup.airDate !== item.airDate) {
      currentGroup = { airDate: item.airDate, items: [item] };
      groups.push(currentGroup);
    } else {
      currentGroup.items.push(item);
    }
  }

  return groups;
}

export default function UpcomingPage() {
  const [items, setItems] = useState<UpcomingEpisodeItem[]>([]);
  const [hasLibrary, setHasLibrary] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  const groups = groupByAirDate(items);

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3">
          <Tv className="text-accent-text" size={32} />

          <h1 className="text-3xl font-bold text-primary">Upcoming Episodes</h1>
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
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.airDate} aria-label={group.airDate}>
              <div className="mb-3 border-b border-border pb-2">
                <h2 className="text-xl font-semibold text-primary">
                  {group.airDate}
                </h2>

                <p className="text-sm text-muted">
                  {getRelativeAirDateLabel(group.airDate, today)}
                </p>
              </div>

              <div className="space-y-3">
                {group.items.map((item) => (
                  <UpcomingEpisodeListItem
                    key={`${item.media.id}-${item.episode.seasonNumber}-${item.episode.episodeNumber}`}
                    item={item}
                    relativeLabel={
                      getRelativeAirDateLabel(item.airDate, today) ?? item.airDate
                    }
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
