import { ArrowRight, EllipsisVertical, Grip } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

import ContinueWatchingWidget from "./ContinueWatchingWidget";
import RecentlyWatchedWidget from "./RecentlyWatchedWidget";
import UpcomingReleasesWidget from "./UpcomingReleasesWidget";
import WatchLogHighlightsWidget from "./WatchLogHighlightsWidget";
import StoryLandscapeWidget from "./StoryLandscapeWidget";
import LibraryAtAGlanceWidget from "./LibraryAtAGlanceWidget";
import TopStoriesWidget from "./TopStoriesWidget";
import QuickActionsWidget from "./QuickActionsWidget";

import {
  type ConfigurableDashboardWidgetDefinition,
  type ConfigurableDashboardWidgetId,
} from "../widgetRegistry";

interface WidgetHeaderDetails {
  subtitle?: string;
  destination?: string;
}

const HEADER_DETAILS: Record<
  ConfigurableDashboardWidgetId,
  WidgetHeaderDetails
> = {
  "continue-watching": {
    subtitle: "Pick up where you left off",
    destination: "/library",
  },
  "recently-watched": {
    subtitle: "Your latest watch activity",
    destination: "/library",
  },
  "upcoming-releases": {
    subtitle: "Coming up soon",
    destination: "/upcoming",
  },
  "watchlog-highlights": {
    subtitle: "A quick look at your viewing",
    destination: "/statistics",
  },
  "story-landscape": {
    subtitle: "Genres across your watched titles",
    destination: "/statistics",
  },
  "library-at-a-glance": {
    subtitle: "Your collection at a glance",
    destination: "/library",
  },
  "top-stories": {
    subtitle: "Your most-watched stories",
    destination: "/library",
  },
  "quick-actions": {},
};

interface DashboardWidgetCardProps {
  widget: ConfigurableDashboardWidgetDefinition;
  /** Optional drag handle rendered beside the widget title (Step 5). */
  dragHandle?: ReactNode;
  /** Optional resize handle anchored to the card corner (Step 5). */
  resizeHandle?: ReactNode;
  /** Hide callback for the approved widget menu action. */
  onHideWidget?: (widgetId: ConfigurableDashboardWidgetId) => void;
  /** Reset-size callback for the approved widget menu action. */
  onResetWidgetSize?: (widgetId: ConfigurableDashboardWidgetId) => void;
}

/*
 * Widget shell for one dashboard widget. Each registered core widget renders
 * its compact content; data fetching and presentation stay in the widget
 * components. No visibility toggling or persistence logic lives here.
 *
 * Step 5 lets the grid inject drag and resize handles; the shell only
 * positions them and knows nothing about the interaction model.
 */
export default function DashboardWidgetCard({
  widget,
  dragHandle,
  resizeHandle,
  onHideWidget,
  onResetWidgetSize,
}: DashboardWidgetCardProps) {
  const headerDetails = HEADER_DETAILS[widget.id];
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isMenuOpen) return;
    function onPointerDown(event: PointerEvent): void {
      const target = event.target as Node | null;
      if (!target) return;
      const inMenu = menuRootRef.current?.contains(target) ?? false;
      const onTrigger = menuTriggerRef.current?.contains(target) ?? false;
      if (!inMenu && !onTrigger) setIsMenuOpen(false);
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        event.stopPropagation();
        closeMenuAndRefocus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isMenuOpen]);

  function closeMenuAndRefocus(): void {
    setIsMenuOpen(false);
    menuTriggerRef.current?.focus();
  }

  return (
    <article
      aria-labelledby={`widget-title-${widget.id}`}
      data-widget-id={widget.id}
      className="relative flex h-full min-h-32 w-full min-w-0 flex-col overflow-visible rounded-xl border border-border bg-surface p-4 pb-8 md:p-5 md:pb-9"
    >
      <header className="flex min-w-0 flex-nowrap items-center gap-1.5 sm:gap-2">
        {dragHandle ?? (
          <span
            aria-hidden="true"
            data-drag-handle-fallback="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center text-muted"
          >
            <Grip className="h-4 w-4" />
          </span>
        )}
        <div className="min-w-0 flex-1 basis-0">
          <h2
            id={`widget-title-${widget.id}`}
            className="min-w-0 truncate text-base font-semibold text-primary"
          >
            {widget.title}
          </h2>
          {headerDetails.subtitle && (
            <p className="min-w-0 truncate text-xs text-muted">
              {headerDetails.subtitle}
            </p>
          )}
        </div>
        {headerDetails.destination ? (
          <Link
            to={headerDetails.destination}
            aria-label={`View all ${widget.title}`}
            className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded px-1.5 py-1 text-xs font-medium text-accent-text transition hover:text-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40"
          >
            View All
            <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        ) : null}
        <div ref={menuRootRef} className="relative shrink-0">
          <button
            type="button"
            ref={menuTriggerRef}
            aria-label={`${widget.title} widget menu`}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((open) => !open)}
            className="flex h-8 min-h-8 w-8 min-w-8 shrink-0 items-center justify-center rounded p-1 text-muted transition hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40"
          >
            <EllipsisVertical aria-hidden="true" className="h-4 w-4" />
          </button>
          {isMenuOpen ? (
            <div
              role="menu"
              aria-label={`${widget.title} actions`}
              className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-lg border border-border bg-surface shadow-xl"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onHideWidget?.(widget.id);
                  closeMenuAndRefocus();
                }}
                className="block w-full px-3 py-2 text-left text-sm text-primary transition hover:bg-surface-hover"
              >
                Hide Widget
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onResetWidgetSize?.(widget.id);
                  closeMenuAndRefocus();
                }}
                className="block w-full px-3 py-2 text-left text-sm text-primary transition hover:bg-surface-hover"
              >
                Reset Size
              </button>
            </div>
          ) : null}
        </div>
      </header>

      {resizeHandle ? (
        <div className="pointer-events-none absolute bottom-1 right-1 flex h-6 items-end justify-end">
          <span className="pointer-events-auto">{resizeHandle}</span>
        </div>
      ) : null}

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
