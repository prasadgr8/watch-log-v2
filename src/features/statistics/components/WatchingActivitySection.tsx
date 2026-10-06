import type { AnalyticsPeriod } from "../../../domain/analytics/types";

import { buildWatchActivityVisualizationProjection } from "../watchActivityVisualization";
import type { WatchActivitySectionWithTrends } from "../services/watchActivityService";

import HistoricalViewingActivity from "./HistoricalViewingActivity";
import StatisticsPeriodSelector from "./StatisticsPeriodSelector";
import WatchActivityTimeline from "./WatchActivityTimeline";
import WatchActivityTrends from "./WatchActivityTrends";
import WatchActivityVisualization from "./WatchActivityVisualization";

interface WatchingActivitySectionProps {
  activityPeriod: AnalyticsPeriod;
  onActivityPeriodChange: (period: AnalyticsPeriod) => void;
  activitySection: WatchActivitySectionWithTrends | null;
  isActivityLoading: boolean;
  activityError: string | null;
}

/*
 * Presentation-only view of the existing viewing-activity section.
 *
 * This component owns no reading and no arithmetic: `activitySection` arrives
 * fully computed from `watchActivityService.loadWatchActivitySection`, driven
 * by `activityPeriod` on the Statistics page, and every value is rendered
 * verbatim (with display-only formatting in the child views). The historical
 * activity behavior, selector, A29 visualization, trends, timeline, and the
 * loading/error behavior are unchanged from the pre-tab Statistics page.
 */
export default function WatchingActivitySection({
  activityPeriod,
  onActivityPeriodChange,
  activitySection,
  isActivityLoading,
  activityError,
}: WatchingActivitySectionProps) {
  return (
    <div className="space-y-8">
      <div className="border-b border-border pb-2">
        <h2 className="text-xl font-semibold text-primary">
          Historical Viewing Activity
        </h2>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted">
          Recorded watch events grouped by calendar period.
        </p>

        <StatisticsPeriodSelector
          period={activityPeriod}
          onChange={onActivityPeriodChange}
        />
      </div>

      {activityError && (
        <p
          role="alert"
          className="rounded-lg border border-danger/60 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {activityError}
        </p>
      )}

      {activitySection !== null && (
        <>
          <HistoricalViewingActivity
            activity={activitySection.summary}
            isLoading={isActivityLoading}
          />

          <WatchActivityVisualization
            visualization={buildWatchActivityVisualizationProjection(
              activitySection.timeline,
            )}
            isLoading={isActivityLoading}
          />

          <WatchActivityTrends
            trends={activitySection.trends}
            isLoading={isActivityLoading}
          />

          <WatchActivityTimeline
            timeline={activitySection.timeline}
            isLoading={isActivityLoading}
          />
        </>
      )}
    </div>
  );
}
