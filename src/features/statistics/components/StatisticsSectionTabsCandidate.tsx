import { useRef, type KeyboardEvent } from "react";

import {
  STATISTICS_PANEL_IDS,
  STATISTICS_TAB_IDS,
  type StatisticsSection,
} from "../statisticsSections";

interface StatisticsSectionTabsCandidateProps {
  activeSection: StatisticsSection;
  onChange: (section: StatisticsSection) => void;
}

/*
 * Candidate section navigation — Step 1.1 visual-contract correction.
 *
 * Establishes the approved Overview information architecture as presentation
 * only:
 *
 *   Desktop: Overview | Viewing Activity | Genres | Library | Providers
 *   Mobile:  Overview | Activity | Genres | Library
 *
 * Only Overview and Viewing Activity are implemented sections. They reuse the
 * page-owned active-section state and the shared tab/panel id wiring, so
 * activation behaves exactly like the control. Genres, Library, and Providers
 * are not implemented in this step: they render as disabled no-op controls
 * following the established WatchLog disabled convention (native `disabled`
 * plus `disabled:cursor-not-allowed disabled:opacity-50`) rather than inventing
 * routes, pages, or navigation behavior. No route, URL/hash state, or
 * persistence is introduced.
 *
 * This component is intentionally separate from the shared
 * StatisticsSectionTabs so the existing/control information architecture
 * (Overview | Watching Activity) is never affected by the candidate layout.
 */

const TAB_BASE =
  "rounded-md px-3 py-1.5 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40";
const TAB_SELECTED = "bg-accent/15 font-semibold text-accent-text";
const TAB_IDLE =
  "font-medium text-muted hover:bg-surface-hover hover:text-accent";
const TAB_DISABLED =
  "font-medium text-muted disabled:cursor-not-allowed disabled:opacity-50";

const IMPLEMENTED_SECTIONS: StatisticsSection[] = ["overview", "activity"];

export default function StatisticsSectionTabsCandidate({
  activeSection,
  onChange,
}: StatisticsSectionTabsCandidateProps) {
  const tabRefs = useRef<
    Record<StatisticsSection, HTMLButtonElement | null>
  >({
    overview: null,
    activity: null,
  });

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    section: StatisticsSection,
  ) {
    const currentIndex = IMPLEMENTED_SECTIONS.indexOf(section);
    let nextIndex: number | undefined;

    switch (event.key) {
      case "ArrowRight":
        nextIndex = (currentIndex + 1) % IMPLEMENTED_SECTIONS.length;
        break;
      case "ArrowLeft":
        nextIndex =
          (currentIndex - 1 + IMPLEMENTED_SECTIONS.length) %
          IMPLEMENTED_SECTIONS.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = IMPLEMENTED_SECTIONS.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const nextSection = IMPLEMENTED_SECTIONS[nextIndex];
    onChange(nextSection);
    tabRefs.current[nextSection]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label="Statistics sections"
      className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-lg border border-border bg-surface-elevated p-1"
    >
      <button
        type="button"
        role="tab"
        id={STATISTICS_TAB_IDS.overview}
        ref={(element) => {
          tabRefs.current.overview = element;
        }}
        aria-selected={activeSection === "overview"}
        aria-controls={STATISTICS_PANEL_IDS.overview}
        tabIndex={activeSection === "overview" ? 0 : -1}
        onClick={() => onChange("overview")}
        onKeyDown={(event) => handleTabKeyDown(event, "overview")}
        className={`${TAB_BASE} ${
          activeSection === "overview" ? TAB_SELECTED : TAB_IDLE
        }`}
      >
        Overview
      </button>

      <button
        type="button"
        role="tab"
        id={STATISTICS_TAB_IDS.activity}
        ref={(element) => {
          tabRefs.current.activity = element;
        }}
        aria-selected={activeSection === "activity"}
        aria-controls={STATISTICS_PANEL_IDS.activity}
        tabIndex={activeSection === "activity" ? 0 : -1}
        onClick={() => onChange("activity")}
        onKeyDown={(event) => handleTabKeyDown(event, "activity")}
        className={`${TAB_BASE} ${
          activeSection === "activity" ? TAB_SELECTED : TAB_IDLE
        }`}
      >
        <span className="hidden md:inline">Viewing Activity</span>
        <span className="md:hidden">Activity</span>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={false}
        aria-disabled="true"
        tabIndex={-1}
        disabled
        className={`${TAB_BASE} ${TAB_DISABLED}`}
      >
        Genres
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={false}
        aria-disabled="true"
        tabIndex={-1}
        disabled
        className={`${TAB_BASE} ${TAB_DISABLED}`}
      >
        Library
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={false}
        aria-disabled="true"
        tabIndex={-1}
        disabled
        className={`${TAB_BASE} ${TAB_DISABLED} hidden md:inline-flex`}
      >
        Providers
      </button>
    </div>
  );
}
