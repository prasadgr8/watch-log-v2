import type { AnalyticsPeriod } from "../../../domain/analytics/types";
import type { TrailingYearActivity } from "../../../domain/analytics/calendarYear";

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
  yearDayActivity: TrailingYearActivity;
  isActivityLoading: boolean;
  isStatisticsLoading: boolean;
  statisticsError: string | null;
  activityError: string | null;
}

/*
 * Presentation-only view of the existing viewing-activity section.
 *
 * This component owns no reading and no arithmetic: `activitySection` arrives
 * fully computed from the Statistics and watch-activity services. The
 * historical summary, selector, trends, timeline, and their loading/error
 * behavior remain separate from the monthly/daily visualization.
 *
 * Each content block is grouped in a named landmark bound to its own
 * sub-heading (A30 Step 3.1), mirroring the Statistics Overview section
 * pattern, so assistive technology can navigate them.
 */
export default function WatchingActivitySection({
  activityPeriod,
  onActivityPeriodChange,
  activitySection,
  yearDayActivity,
  isActivityLoading,
  isStatisticsLoading,
  statisticsError,
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
          <section
            aria-labelledby="watching-activity-summary"
            className="space-y-8"
          >
            <div className="border-b border-border pb-2">
              <h3
                id="watching-activity-summary"
                className="text-lg font-semibold text-primary"
              >
                Historical Summary
              </h3>
            </div>

            <HistoricalViewingActivity
              activity={activitySection.summary}
              isLoading={isActivityLoading}
            />
          </section>

          <section
            aria-labelledby="watching-activity-visualization"
            className="space-y-8"
          >
            <div className="border-b border-border pb-2">
              <h3
                id="watching-activity-visualization"
                className="text-lg font-semibold text-primary"
              >
                Activity Visualization
              </h3>
            </div>

            <WatchActivityVisualization
              visualization={buildWatchActivityVisualizationProjection(
                yearDayActivity,
                activitySection.summary,
              )}
              summary={activitySection.summary}
              isLoading={isActivityLoading || isStatisticsLoading}
              error={statisticsError}
            />
          </section>

          <section
            aria-labelledby="watching-activity-trends"
            className="space-y-8"
          >
            <div className="border-b border-border pb-2">
              <h3
                id="watching-activity-trends"
                className="text-lg font-semibold text-primary"
              >
                Viewing Activity Trends
              </h3>
            </div>

            <WatchActivityTrends
              trends={activitySection.trends}
              isLoading={isActivityLoading}
            />
          </section>

          <section
            aria-labelledby="watching-activity-timeline"
            className="space-y-8"
          >
            <div className="border-b border-border pb-2">
              <h3
                id="watching-activity-timeline"
                className="text-lg font-semibold text-primary"
              >
                Activity Timeline
              </h3>
            </div>

            <WatchActivityTimeline
              timeline={activitySection.timeline}
              isLoading={isActivityLoading}
            />
          </section>
        </>
      )}
    </div>
  );
}
