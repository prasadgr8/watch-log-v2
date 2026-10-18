import { useEffect, useState } from "react";

import { Film, PieChart } from "lucide-react";

import {
  getStoryLandscapeData,
  STORY_LANDSCAPE_BUBBLE_LIMIT,
  type StoryLandscapeBubble,
  type StoryLandscapeData,
} from "../services/storyLandscapeWidgetService";

function bubbleSizeClass(relativeSize: number): string {
  if (relativeSize >= 0.75) {
    return "h-24 w-24";
  }
  if (relativeSize >= 0.5) {
    return "h-20 w-20";
  }
  if (relativeSize >= 0.35) {
    return "h-16 w-16";
  }
  return "h-12 w-12";
}

/* Your Story Landscape: genre distribution of watched titles as lightweight
 * bubbles sized by relative contribution, with percentages. */
export default function StoryLandscapeWidget() {
  const [data, setData] = useState<StoryLandscapeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadStoryLandscape(): Promise<void> {
      try {
        setError(null);

        const landscape = await getStoryLandscapeData();

        if (isActive) {
          setData(landscape);
        }
      } catch {
        if (isActive) {
          setError("Unable to load Your Story Landscape.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadStoryLandscape();

    return () => {
      isActive = false;
    };
  }, []);

  if (isLoading) {
    return (
      <p role="status" className="text-sm text-muted">
        Loading Your Story Landscape...
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
        Loading Your Story Landscape...
      </p>
    );
  }

  if (data.totalTitles === 0 || data.bubbles.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-app-bg/60 px-3 py-3 text-center">
        <PieChart aria-hidden="true" className="mx-auto h-5 w-5 text-muted" />
        <p className="mt-1.5 text-sm font-medium text-primary">
          No story landscape yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <section aria-label="Genre distribution" className="space-y-3">
        <div className="flex flex-wrap justify-center gap-3" role="list">
          {data.bubbles.slice(0, STORY_LANDSCAPE_BUBBLE_LIMIT).map(
            (bubble) => renderBubble(bubble),
          )}
        </div>

        <p className="mt-2 text-xs text-muted text-center">
          {data.bubbles.length} genre{data.bubbles.length !== 1 ? "s" : ""} across
          {data.totalTitles} watched title{data.totalTitles !== 1 ? "s" : ""}
        </p>
      </section>

    </div>
  );
}

function renderBubble(bubble: StoryLandscapeBubble): React.JSX.Element {
  return (
    <div
      key={bubble.genre}
      className={`flex min-w-[80px] flex-col items-center gap-1 ${bubbleSizeClass(
        bubble.relativeSize,
      )} rounded-full border border-border bg-surface p-2 text-center`}
      role="listitem"
    >
      <div className="flex min-w-0 items-center justify-center gap-1">
        <Film
          aria-hidden="true"
          className="shrink-0 h-4 w-4 text-accent-text"
        />
        <span className="min-w-0 break-words text-[10px] font-medium text-primary leading-none">
          {bubble.genre}
        </span>
      </div>
      <p className="text-[11px] font-semibold text-primary">
        {bubble.percentage}%
      </p>
      <p className="text-[9px] text-muted">
        {bubble.titleCount} title{bubble.titleCount !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
