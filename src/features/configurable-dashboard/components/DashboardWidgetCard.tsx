import { LayoutGrid } from "lucide-react";

import ContinueWatchingWidget from "./ContinueWatchingWidget";
import RecentlyWatchedWidget from "./RecentlyWatchedWidget";
import UpcomingReleasesWidget from "./UpcomingReleasesWidget";

import type { ConfigurableDashboardWidgetDefinition } from "../widgetRegistry";

interface DashboardWidgetCardProps {
  widget: ConfigurableDashboardWidgetDefinition;
}

/*
 * Widget shell for one dashboard widget. The three Step 2 core content
 * widgets render live compact content; the remaining five keep the Step 1
 * foundation placeholder until their own step arrives. No data fetching,
 * statistics, progress values, charts, drag/drop, resize, or persistence
 * live in the shell itself.
 */
export default function DashboardWidgetCard({ widget }: DashboardWidgetCardProps) {
  return (
    <article
      aria-labelledby={`widget-title-${widget.id}`}
      data-widget-id={widget.id}
      className="flex min-h-32 w-full min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-surface p-4 md:p-5"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          aria-hidden="true"
          className="shrink-0 rounded-lg bg-accent/15 p-1.5 text-accent-text"
        >
          <LayoutGrid className="h-4 w-4" />
        </span>
        <h2
          id={`widget-title-${widget.id}`}
          className="min-w-0 break-words text-base font-semibold text-primary"
        >
          {widget.title}
        </h2>
      </div>

      {widget.id === "continue-watching" ? (
        <div className="mt-3 min-w-0 flex-1">
          <ContinueWatchingWidget />
        </div>
      ) : widget.id === "recently-watched" ? (
        <div className="mt-3 min-w-0 flex-1">
          <RecentlyWatchedWidget />
        </div>
      ) : widget.id === "upcoming-releases" ? (
        <div className="mt-3 min-w-0 flex-1">
          <UpcomingReleasesWidget />
        </div>
      ) : (
        <>
          <p className="mt-3 min-w-0 break-words text-sm text-muted">
            {widget.description}
          </p>

          <p className="mt-auto pt-4 text-xs text-muted">
            Widget content arrives in a later step.
          </p>
        </>
      )}
    </article>
  );
}

