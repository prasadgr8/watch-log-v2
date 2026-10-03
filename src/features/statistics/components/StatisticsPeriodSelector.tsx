import type { AnalyticsPeriod } from "../../../domain/analytics/types";

interface PeriodOption {
  value: AnalyticsPeriod;
  label: string;
  title: string;
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { value: "day", label: "Day", title: "Group activity by day" },
  { value: "week", label: "Week", title: "Group activity by week" },
  { value: "month", label: "Month", title: "Group activity by month" },
  { value: "year", label: "Year", title: "Group activity by year" },
];

interface StatisticsPeriodSelectorProps {
  period: AnalyticsPeriod;
  onChange: (period: AnalyticsPeriod) => void;
}

/*
 * Ephemeral analytics-period selector local to the Statistics feature.
 *
 * Follows the repository Toggle conventions (DensityToggle, ViewModeToggle):
 * a `role="group"` container with an accessible label, native buttons with
 * `aria-pressed`, `aria-label`, and `title`, and visible focus states, so the
 * selected period never relies on color alone.
 *
 * Selection is intentionally ephemeral page state. Nothing is persisted, no
 * settings key is introduced, and no URL state is involved.
 */
export default function StatisticsPeriodSelector({
  period,
  onChange,
}: StatisticsPeriodSelectorProps) {
  return (
    <div
      role="group"
      aria-label="Activity period"
      className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-elevated p-1"
    >
      {PERIOD_OPTIONS.map((option) => {
        const isActive = period === option.value;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            aria-label={option.label}
            title={option.title}
            onClick={() => onChange(option.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40 ${
              isActive
                ? "bg-accent/15 text-accent-text"
                : "text-muted hover:bg-surface-hover hover:text-accent"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
