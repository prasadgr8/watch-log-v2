import { LayoutGrid } from "lucide-react";

import ContinueWatchingWidget from "./ContinueWatchingWidget";
import RecentlyWatchedWidget from "./RecentlyWatchedWidget";
import UpcomingReleasesWidget from "./UpcomingReleasesWidget";
import WatchLogHighlightsWidget from "./WatchLogHighlightsWidget";
import StoryLandscapeWidget from "./StoryLandscapeWidget";
import LibraryAtAGlanceWidget from "./LibraryAtAGlanceWidget";
import TopStoriesWidget from "./TopStoriesWidget";
import QuickActionsWidget from "./QuickActionsWidget";

import type { ConfigurableDashboardWidgetDefinition } from "../widgetRegistry";

interface DashboardWidgetCardProps {
  widget: ConfigurableDashboardWidgetDefinition;
}

/*
 * Widget shell for one dashboard widget. Each registered core widget renders
 * its compact content; data fetching and presentation stay in the widget
 * components. No drag/drop, resize, or persistence lives in the shell.
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
      ) : widget.id === "watchlog-highlights" ? (
        <div className="mt-3 min-w-0 flex-1">
          <WatchLogHighlightsWidget />
        </div>
      ) : widget.id === "story-landscape" ? (
        <div className="mt-3 min-w-0 flex-1">
          <StoryLandscapeWidget />
        </div>
      ) : widget.id === "library-at-a-glance" ? (
        <div className="mt-3 min-w-0 flex-1">
          <LibraryAtAGlanceWidget />
        </div>
      ) : widget.id === "top-stories" ? (
        <div className="mt-3 min-w-0 flex-1">
          <TopStoriesWidget />
        </div>
      ) : widget.id === "quick-actions" ? (
        <div className="mt-3 min-w-0 flex-1">
          <QuickActionsWidget />
        </div>
      ) : (
        <>
          <p className="mt-3 min-w-0 break-words text-sm text-muted">
            {widget.description}
          </p>
        </>
      )}
    </article>
  );
}
