import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import StatisticsOverview from "./components/StatisticsOverview";
import StatisticsSectionTabs from "./components/StatisticsSectionTabs";
import {
  STATISTICS_PANEL_IDS,
  STATISTICS_TAB_IDS,
  type StatisticsSection,
} from "./statisticsSections";
import WatchingActivitySection from "./components/WatchingActivitySection";
import {
  calculateEpisodeStatistics,
  calculateLibraryStatistics,
  calculateRecentActivity,
  calculateShowProgress,
  calculateWatchTimeStatistics,
  loadStatistics,
  type StatisticsDashboard,
} from "./services/statisticsService";
import type { AnalyticsPeriod } from "../../domain/analytics/types";
import {
  loadWatchActivitySection,
  type WatchActivitySectionWithTrends,
} from "./services/watchActivityService";

const initialStatistics: StatisticsDashboard = {
  library: calculateLibraryStatistics([]),
  episodes: calculateEpisodeStatistics([]),
  watchTime: calculateWatchTimeStatistics([]),
  showProgress: calculateShowProgress([], []),
  recentActivity: calculateRecentActivity([], []),
  watchEventCount: 0,
};

export default function StatisticsPage() {
  const [activeSection, setActiveSection] =
    useState<StatisticsSection>("overview");
  const [stats, setStats] = useState<StatisticsDashboard>(initialStatistics);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activityPeriod, setActivityPeriod] =
    useState<AnalyticsPeriod>("month");
  const [activitySection, setActivitySection] =
    useState<WatchActivitySectionWithTrends | null>(null);
  const [isActivityLoading, setIsActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPage(): Promise<void> {
      try {
        setError(null);

        const result = await loadStatistics();

        setStats(result);
      } catch (loadError) {
        console.error("Failed to load statistics:", loadError);

        setError("Unable to load statistics.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadPage();
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadActivity(): Promise<void> {
      setIsActivityLoading(true);

      try {
        setActivityError(null);

        const section = await loadWatchActivitySection(activityPeriod);

        if (!isActive) {
          return;
        }

        setActivitySection(section);
      } catch (loadError) {
        if (!isActive) {
          return;
        }

        console.error("Failed to load viewing activity:", loadError);

        setActivityError("Unable to load viewing activity.");
      } finally {
        if (isActive) {
          setIsActivityLoading(false);
        }
      }
    }

    void loadActivity();

    return () => {
      isActive = false;
    };
  }, [activityPeriod]);

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3">
          <BarChart3 className="text-accent-text" size={32} />

          <h1 className="text-3xl font-bold text-primary">Statistics</h1>
        </div>

        <p className="mt-2 text-muted">
          View insights and statistics about your media library.
        </p>
      </div>

      <StatisticsSectionTabs
        activeSection={activeSection}
        onChange={setActiveSection}
      />

      {activeSection === "overview" ? (
        <div
          role="tabpanel"
          id={STATISTICS_PANEL_IDS.overview}
          aria-labelledby={STATISTICS_TAB_IDS.overview}
        >
          <StatisticsOverview
            stats={stats}
            isLoading={isLoading}
            error={error}
          />
        </div>
      ) : (
        <div
          role="tabpanel"
          id={STATISTICS_PANEL_IDS.activity}
          aria-labelledby={STATISTICS_TAB_IDS.activity}
        >
          <WatchingActivitySection
            activityPeriod={activityPeriod}
            onActivityPeriodChange={setActivityPeriod}
            activitySection={activitySection}
            isActivityLoading={isActivityLoading}
            activityError={activityError}
          />
        </div>
      )}
    </div>
  );
}
