import {
  STATISTICS_PANEL_IDS,
  STATISTICS_TAB_IDS,
  type StatisticsSection,
} from "../statisticsSections";

interface StatisticsSectionTabsProps {
  activeSection: StatisticsSection;
  onChange: (section: StatisticsSection) => void;
}

const SECTIONS: Array<{ value: StatisticsSection; label: string }> = [
  { value: "overview", label: "Overview" },
  { value: "activity", label: "Watching Activity" },
];

/*
 * Tab control for the Statistics information-architecture foundation.
 *
 * Presentation only: the Statistics page owns the active-section state and
 * renders exactly one matching tabpanel. Switching tabs never moves focus —
 * activation is click/Enter/Space on the native buttons and focus stays on
 * the selected tab. Selection is local page state: no route, no URL/hash
 * state, and no persistence are involved.
 *
 * Selection never relies on color alone: the selected tab is exposed through
 * `aria-selected` and reinforced with a font-weight change alongside the
 * accent background.
 */
export default function StatisticsSectionTabs({
  activeSection,
  onChange,
}: StatisticsSectionTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Statistics sections"
      className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-elevated p-1"
    >
      {SECTIONS.map((section) => {
        const isSelected = activeSection === section.value;

        return (
          <button
            key={section.value}
            type="button"
            role="tab"
            id={STATISTICS_TAB_IDS[section.value]}
            aria-selected={isSelected}
            aria-controls={STATISTICS_PANEL_IDS[section.value]}
            onClick={() => onChange(section.value)}
            className={`rounded-md px-3 py-1.5 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40 ${
              isSelected
                ? "bg-accent/15 font-semibold text-accent-text"
                : "font-medium text-muted hover:bg-surface-hover hover:text-accent"
            }`}
          >
            {section.label}
          </button>
        );
      })}
    </div>
  );
}
