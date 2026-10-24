import type { ReactNode } from "react";
import {
  Activity,
  CalendarDays,
  Clock3,
  Film,
  Layers,
  Library,
  ListVideo,
  Percent,
  Sparkles,
  Star,
  Trophy,
  Tv,
} from "lucide-react";

import type { StatisticsDashboard } from "../services/statisticsService";

/*
 * A/B candidate Overview — Visual Foundation (Step 1).
 *
 * This reversible candidate coexists with the existing StatisticsOverview and
 * is selected through the Step 0 variant switch in StatisticsPage. It stays
 * presentation-only: it consumes the exact same precomputed StatisticsDashboard
 * contract plus the page-owned loading and error state as the control, and it
 * performs no data reads or analytics/business calculations of its own. Values
 * are never read by a repository, a service loader, or the persistence layer —
 * `stats` arrives fully computed from the Statistics page, exactly like the
 * control. Date placement and intensity normalization are display-only.
 *
 * Step 1 establishes the target visual composition only. Metrics that already
 * exist on the contract render their real values verbatim; metrics that would
 * require new analytics (previous-period comparisons, streaks, allocations,
 * rankings, milestones) render an explicit unavailable state instead of an
 * invented number. No screenshot sample value is hard-coded and no business
 * calculation is introduced here.
 */

interface KpiCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  icon: ReactNode;
  tone?: "accent" | "muted" | "warning";
}

const KPI_TONE: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  accent: "text-accent-text",
  muted: "text-muted",
  warning: "text-warning",
};

function KpiCard({ label, value, hint, icon, tone = "accent" }: KpiCardProps) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {label}
          </p>

          <p className="mt-3 text-3xl font-bold leading-none text-primary">
            {value}
          </p>

          {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
        </div>

        <span
          className={`shrink-0 rounded-xl bg-surface-elevated p-2 ${KPI_TONE[tone]}`}
        >
          {icon}
        </span>
      </div>
    </div>
  );
}

function PendingCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-36 flex-col rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-xl bg-surface-elevated p-2 text-muted">
          {icon}
        </span>
        <span className="rounded-full border border-border bg-surface-elevated px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
          Pending
        </span>
      </div>

      <p className="mt-4 text-sm font-semibold text-primary">{title}</p>
      <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
    </div>
  );
}

function SectionShell({
  id,
  icon,
  title,
  note,
  children,
}: {
  id: string;
  icon: ReactNode;
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="space-y-4">
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <span className="text-accent-text">{icon}</span>

        <h2 id={id} className="text-xl font-semibold text-primary">
          {title}
        </h2>
      </div>

      {children}

      {note && <p className="text-xs text-muted">{note}</p>}
    </section>
  );
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

interface StatisticsOverviewCandidateProps {
  stats: StatisticsDashboard;
  isLoading: boolean;
  error: string | null;
}

export default function StatisticsOverviewCandidate({
  stats,
  isLoading,
  error,
}: StatisticsOverviewCandidateProps) {
  const isDataUnavailable = isLoading || error !== null;

  function placeholder(value: number | string): number | string {
    return isDataUnavailable ? "—" : value;
  }

  const yearDayActivity = stats.yearDayActivity;
  // Peak daily count in the displayed series, used only to scale cell
  // intensity proportionally (presentation-only; no thresholds or levels).
  const yearDayPeak = yearDayActivity.days.reduce(
    (peak, day) => (day.eventCount > peak ? day.eventCount : peak),
    0,
  );
  const firstYearDay = yearDayActivity.days[0]?.periodStart;
  // Normalize local dates in UTC so DST-length days do not skew week columns.
  const firstWeekStart = firstYearDay
    ? Date.UTC(
        firstYearDay.getFullYear(),
        firstYearDay.getMonth(),
        firstYearDay.getDate() -
          ((firstYearDay.getDay() + 6) % 7),
      )
    : 0;
  const yearCalendarCells = yearDayActivity.days.map((day) => {
    const periodStart = day.periodStart;
    const dayStart = Date.UTC(
      periodStart.getFullYear(),
      periodStart.getMonth(),
      periodStart.getDate(),
    );

    return {
      ...day,
      weekdayIndex: (periodStart.getDay() + 6) % 7,
      weekIndex: Math.floor(
        (dayStart - firstWeekStart) / (7 * 24 * 60 * 60 * 1000),
      ),
    };
  });
  const yearCalendarWeekCount =
    (yearCalendarCells[yearCalendarCells.length - 1]?.weekIndex ?? -1) + 1;
  const yearCalendarColumns =
    yearCalendarWeekCount > 0
      ? `2rem repeat(${yearCalendarWeekCount}, minmax(0.75rem, 1fr))`
      : "2rem";
  const activeCalendarDays = yearCalendarCells.filter(
    (day) => day.eventCount > 0,
  );
  const calendarEventCount = yearDayActivity.days.reduce(
    (total, day) => total + day.eventCount,
    0,
  );
  const calendarAccessibilityDescription =
    error !== null
      ? "Daily watch activity is unavailable because statistics could not be loaded."
      : isLoading
        ? "Daily watch activity is loading."
        : calendarEventCount === 0
          ? "No recorded watch events in the displayed calendar. Every day has zero events."
          : `${activeCalendarDays.length} active days with ${calendarEventCount} recorded events. ${activeCalendarDays
              .map(
                (day) =>
                  `${day.periodStart.toLocaleDateString(undefined, {
                    dateStyle: "long",
                  })}: ${day.eventCount} event${
                    day.eventCount === 1 ? "" : "s"
                  }`,
              )
              .join("; ")}. All other displayed calendar days had no recorded events.`;
  const hasRecordedHourActivity = stats.hourOfDayBuckets.some(
    (bucket) => bucket.eventCount > 0,
  );
  const peakHour = stats.hourOfDayBuckets.reduce(
    (best, bucket) =>
      bucket.eventCount > best.eventCount ? bucket : best,
    stats.hourOfDayBuckets[0] ?? { hour: 0, eventCount: 0 },
  ).hour;
  const hourlyActivityAlternative =
    error !== null
      ? "Hourly watch activity is unavailable because statistics could not be loaded."
      : isLoading
        ? "Hourly watch activity is loading."
        : hasRecordedHourActivity
          ? `Recorded watch events by local hour: ${stats.hourOfDayBuckets
              .filter((bucket) => bucket.eventCount > 0)
              .map(
                (bucket) =>
                  `${String(bucket.hour).padStart(2, "0")}:00, ${
                    bucket.eventCount
                  } event${bucket.eventCount === 1 ? "" : "s"}`,
              )
              .join("; ")}. Peak hour: ${String(peakHour).padStart(2, "0")}:00.`
          : "No recorded viewing activity by local hour.";
  return (
    <div className="mx-auto max-w-6xl space-y-10">
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-danger/60 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      )}

      <section
        aria-labelledby="candidate-story-label"
        className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8"
      >
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-accent-text">
              <Sparkles size={18} />

              <p
                id="candidate-story-label"
                className="text-xs font-semibold uppercase tracking-[0.2em]"
              >
                Your watching story
              </p>
            </div>

            <p className="mt-6 text-4xl font-bold leading-tight text-primary sm:text-5xl">
              {placeholder(stats.watchTime.watchedHours)}{" "}
              <span className="text-accent-text">hours</span> of stories
            </p>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              Estimated from watched TV episodes with runtime data; movie
              runtimes aren&rsquo;t included.
            </p>

            <p className="mt-3 text-sm italic text-muted">
              &ldquo;Every story takes you somewhere.&rdquo;
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface-elevated p-4">
            {/*
              Presentation-only period scope, styled to match the active state
              of the existing StatisticsPeriodSelector. It is intentionally a
              non-interactive label: this adds no period-selection behavior.
            */}
            <span className="inline-flex rounded-lg bg-accent/15 px-3 py-1.5 text-sm font-medium text-accent-text">
              Last 12 months
            </span>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-surface p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Titles in library
                </p>
                <p className="mt-2 text-xl font-bold text-primary">
                  {placeholder(stats.library.total)}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-surface p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Watch events
                </p>
                <p className="mt-2 text-xl font-bold text-primary">
                  {placeholder(stats.watchEventCount)}
                </p>
              </div>
            </div>

            <p className="mt-3 text-xs leading-5 text-muted">
              Previous-period comparisons are not available yet.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          label="Titles Watched"
          value={placeholder(stats.uniqueMediaCount)}
          hint="Distinct titles with recorded events"
          icon={<Library size={24} />}
        />

        <KpiCard
          label="Total Watch Time"
          value={
            isDataUnavailable ? "—" : `${stats.watchTime.watchedHours}h`
          }
          hint="Watched TV episode runtime; movie runtimes excluded"
          icon={<Clock3 size={24} />}
        />

        <KpiCard
          label="TV Episodes"
          value={placeholder(stats.tvEpisodeEventCount)}
          hint="Episode watch events"
          icon={<ListVideo size={24} />}
        />

        <KpiCard
          label="Movies"
          value={placeholder(stats.movieEventCount)}
          hint="Movie watch events"
          icon={<Film size={24} />}
        />

        <KpiCard
          label="Current Streak"
          value={placeholder(stats.currentStreak)}
          hint="Consecutive viewing days"
          icon={<Activity size={24} />}
        />

        <KpiCard
          label="Completion Rate"
          value={
            isDataUnavailable ? "—" : `${stats.library.completionRate}%`
          }
          hint="Library completion"
          icon={<Percent size={24} />}
        />
      </div>

      {/* Your year in stories — activity heatmap frame. */}
      <SectionShell
        id="candidate-year"
        icon={<CalendarDays size={20} />}
        title="Your Year in Stories"
        note="Recorded watch events by calendar day over the last 12 months."
      >
        <div className="space-y-3 rounded-xl border border-dashed border-border bg-surface p-4">
          <div className="overflow-x-auto">
            <div className="min-w-[46rem] md:min-w-0">
              <div
                role="img"
                aria-label="Daily watch activity over the last 12 months. Columns are weeks; rows run Monday through Sunday."
                aria-describedby="candidate-year-calendar-description"
                className="grid gap-x-0.5 gap-y-1"
                style={{ gridTemplateColumns: yearCalendarColumns }}
              >
                {yearCalendarCells
                  .filter((day) => day.periodStart.getDate() === 1)
                  .map((day) => (
                    <span
                      key={`month-${day.periodStart.toISOString()}`}
                      className="row-start-1 text-[10px] font-medium text-muted"
                      style={{ gridColumn: day.weekIndex + 2 }}
                    >
                      {day.periodStart.toLocaleString(undefined, {
                        month: "short",
                      })}
                    </span>
                  ))}

                {WEEKDAYS.map((day, weekdayIndex) => (
                  <span
                    key={day}
                    className="flex items-center text-[10px] font-medium uppercase tracking-wide text-muted"
                    style={{
                      gridColumn: 1,
                      gridRow: weekdayIndex + 2,
                    }}
                  >
                    {day}
                  </span>
                ))}

                {yearCalendarCells.map((day) => {
                  const intensity =
                    yearDayPeak > 0 && day.eventCount > 0
                      ? day.eventCount / yearDayPeak
                      : 0;

                  return (
                    <span
                      key={day.periodStart.toISOString()}
                      title={
                        isDataUnavailable
                          ? undefined
                          : `${day.periodStart.toLocaleDateString()} — ${
                              day.eventCount
                            } event${day.eventCount === 1 ? "" : "s"}`
                      }
                      className="aspect-square w-full rounded-sm border border-border bg-surface-elevated"
                      style={{
                        gridColumn: day.weekIndex + 2,
                        gridRow: day.weekdayIndex + 2,
                        backgroundColor:
                          intensity > 0
                            ? `color-mix(in srgb, var(--color-accent) ${
                                intensity * 100
                              }%, var(--color-surface-elevated))`
                            : undefined,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
          <p
            id="candidate-year-calendar-description"
            className="sr-only"
          >
            {calendarAccessibilityDescription}
          </p>

          {yearDayPeak === 0 && !isDataUnavailable && (
            <p className="text-xs text-muted">
              No recorded activity in the last 12 months.
            </p>
          )}

          <div className="flex items-center justify-between text-[10px] text-muted">
            <span>Less activity</span>

            <span aria-hidden="true" className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-sm border border-border bg-surface-elevated" />
              {[25, 50, 75, 100].map((intensity) => (
                <span
                  key={intensity}
                  className="h-3 w-3 rounded-sm border border-border"
                  style={{
                    backgroundColor: `color-mix(in srgb, var(--color-accent) ${intensity}%, var(--color-surface-elevated))`,
                  }}
                />
              ))}
            </span>

            <span>More activity</span>
          </div>
        </div>
      </SectionShell>

      {/* Key insights. */}
      <SectionShell
        id="candidate-insights"
        icon={<Sparkles size={20} />}
        title="Key Insights"
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Most active month"
            value={isDataUnavailable ? "—" : stats.mostActiveMonth.label}
            hint={
              isDataUnavailable
                ? undefined
                : stats.mostActiveMonth.isAvailable
                ? stats.mostActiveMonth.isTie
                  ? "Multiple months tied"
                  : "Recorded events · last 12 months"
                : "No recorded activity in the last 12 months"
            }
            icon={<CalendarDays size={20} />}
          />

          <KpiCard
            label="Weekend viewing"
            value={
              isDataUnavailable
                ? "—"
                : stats.weekendViewing.isAvailable
                ? `${stats.weekendViewing.percentage}%`
                : "No activity"
            }
            hint={
              isDataUnavailable
                ? undefined
                : stats.weekendViewing.isAvailable
                ? "Saturday and Sunday"
                : "No recorded viewing activity"
            }
            icon={<Activity size={20} />}
          />

          <KpiCard
            label="Time of day"
            value={
              isDataUnavailable
                ? "—"
                : stats.timeOfDay.isAvailable
                  ? stats.timeOfDay.buckets.reduce(
                      (top, bucket) =>
                        bucket.eventCount > top.eventCount ? bucket : top,
                      stats.timeOfDay.buckets[0],
                    ).bucket
                  : "No activity"
            }
            hint={
              isDataUnavailable
                ? undefined
                : stats.timeOfDay.isAvailable
                ? stats.timeOfDay.buckets
                    .map((bucket) => `${bucket.bucket} ${bucket.percentage}%`)
                    .join(" · ")
                : "No recorded viewing activity"
            }
            icon={<Clock3 size={20} />}
          />

          <KpiCard
            label="Genre count"
            value={
              isDataUnavailable
                ? "—"
                : stats.genreCount.isAvailable
                ? String(stats.genreCount.count)
                : "No activity"
            }
            hint={
              isDataUnavailable
                ? undefined
                : stats.genreCount.isAvailable
                ? "Distinct genres across watched titles"
                : "No recorded viewing activity"
            }
            icon={<Layers size={20} />}
/>
        </div>
      </SectionShell>

      {/* Viewing rhythm — hour-of-day and day-of-week distribution. */}
      <SectionShell
        id="candidate-rhythm"
        icon={<Activity size={20} />}
        title="Viewing Rhythm"
        note="Recorded watch events by local hour of day and day of week."
      >
        <div className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              By hour of day
            </p>

            <p className="sr-only">{hourlyActivityAlternative}</p>

            <div aria-hidden="true" className="flex h-20 items-end gap-0.5">
              {(isDataUnavailable ? [] : stats.hourOfDayBuckets).map((bucket) => {
                const peak = Math.max(
                  1,
                  ...stats.hourOfDayBuckets.map((entry) => entry.eventCount),
                );

                return (
                  <span
                    key={bucket.hour}
                    title={`${bucket.hour}:00 — ${bucket.eventCount}`}
                    className="flex-1 rounded-sm bg-accent/60"
                    style={{
                      height: `${Math.round((bucket.eventCount / peak) * 100)}%`,
                    }}
                  />
                );
              })}
            </div>

            <div
              aria-hidden="true"
              className="grid grid-cols-[repeat(24,minmax(0,1fr))] text-[10px] leading-none text-muted"
            >
              {[0, 6, 12, 18, 23].map((hour) => (
                <span
                  key={hour}
                  className={
                    hour === 0
                      ? "justify-self-start"
                      : hour === 23
                        ? "justify-self-end"
                        : "justify-self-center"
                  }
                  style={{ gridColumn: hour + 1 }}
                >
                  {String(hour).padStart(2, "0")}:00
                </span>
              ))}
            </div>

            <p className="text-xs text-muted">
              {error !== null
                ? "Viewing rhythm is unavailable because statistics could not be loaded."
                : isLoading
                ? "—"
                : hasRecordedHourActivity
                  ? `Peak hour: ${peakHour}:00`
                  : "No recorded viewing activity."}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              By day of week
            </p>

            <div className="space-y-1">
              {(isDataUnavailable ? [] : stats.dayOfWeekBuckets).map((bucket) => {
                const peak = Math.max(
                  1,
                  ...stats.dayOfWeekBuckets.map((entry) => entry.eventCount),
                );

                return (
                  <div
                    key={bucket.isoWeekday}
                    className="flex items-center gap-2"
                  >
                    <span className="w-8 shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted">
                      {WEEKDAYS[bucket.isoWeekday - 1]}
                    </span>

                    <span className="h-2 flex-1 overflow-hidden rounded-full border border-border bg-surface-elevated">
                      <span
                        className="block h-full bg-accent/60"
                        style={{
                          width: `${Math.round(
                            (bucket.eventCount / peak) * 100,
                          )}%`,
                        }}
                      />
                    </span>

                    <span className="w-6 shrink-0 text-right text-xs text-muted">
                      {bucket.eventCount}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </SectionShell>
{/* Story landscape analytics are not yet supported. */}
<SectionShell
  id="candidate-landscape"
  icon={<Layers size={20} />}
  title="Your Story Landscape"
>
  <div className="max-w-md">
    <PendingCard
      icon={<Layers size={20} />}
      title="Story landscape"
      description="Library distribution will appear when supporting analytics are available."
    />
  </div>
</SectionShell>

{/* Biggest-story rankings are not yet supported. */}
<SectionShell
  id="candidate-biggest"
  icon={<Star size={20} />}
  title="Your Biggest Stories"
>
  <div className="max-w-md">
    <PendingCard
      icon={<Star size={20} />}
      title="Story rankings"
      description="Your biggest stories will appear when ranking analytics are supported."
    />
  </div>
</SectionShell>

{/* Milestone analytics are not yet supported. */}
<SectionShell
  id="candidate-progress"
  icon={<Trophy size={20} />}
  title="Your Milestones"
>
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {[
      { label: "Movies", icon: <Film size={20} /> },
      { label: "Episodes", icon: <ListVideo size={20} /> },
      { label: "Consistency", icon: <Activity size={20} /> },
      { label: "Shows", icon: <Tv size={20} /> },
    ].map((target) => (
      <PendingCard
        key={target.label}
        icon={target.icon}
        title={target.label}
        description="Milestone analytics are not available yet."
      />
    ))}
  </div>
      </SectionShell>
    </div>
  );
}
