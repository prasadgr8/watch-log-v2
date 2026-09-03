import { useState } from "react";
import { AlertTriangle, Search } from "lucide-react";

import type {
  TvTimeImportPlan,
  TvTimeImportResolutions,
  TvTimeMatchDecision,
  TvTimePlannedShow,
  TvTimePlannedWatchedEpisode,
} from "../../import/types/tvTimeImportPlan";

import ManualMatchSearch from "./ManualMatchSearch";

interface TvTimeImportPreviewProps {
  plan: TvTimeImportPlan;

  /** Name of the ZIP the user selected, shown for context. */
  fileName?: string;

  /** Review decisions keyed by TV Time show id. */
  resolutions?: TvTimeImportResolutions;

  /** Called when the user picks a match (or Skip) for a reviewed show. */
  onResolve?: (
    tvTimeShowId: string,
    decision: TvTimeMatchDecision,
  ) => void;
}

/** Candidates shown per review; the full ranked list stays in the plan. */
const MAX_VISIBLE_CANDIDATES = 5;

type PlannedShowKind = TvTimePlannedShow["kind"];

const kindBadgeClasses: Record<PlannedShowKind, string> = {
  new: "bg-accent/15 text-accent-text",
  existing: "bg-surface-elevated text-muted",
  unmatched: "bg-warning/10 text-warning",
};

const kindLabels: Record<PlannedShowKind, string> = {
  new: "New",
  existing: "In Library",
  unmatched: "Not Matched",
};

const watchedDateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
});

function padTwo(value: number): string {
  return String(value).padStart(2, "0");
}

function formatSeasonEpisode(
  seasonNumber: number,
  episodeNumber: number,
): string {
  return `S${padTwo(seasonNumber)}E${padTwo(episodeNumber)}`;
}

function getMatchedYear(show: TvTimePlannedShow): string | null {
  if (show.kind === "unmatched") {
    return null;
  }

  const year = show.tmdbShow.first_air_date?.slice(0, 4);

  return year && /^\d{4}$/.test(year) ? year : null;
}

function groupWatchedEpisodesByTitle(
  episodes: TvTimePlannedWatchedEpisode[],
): Map<string, TvTimePlannedWatchedEpisode[]> {
  const groups = new Map<string, TvTimePlannedWatchedEpisode[]>();

  for (const episode of episodes) {
    const group = groups.get(episode.showTitle);

    if (group) {
      group.push(episode);
    } else {
      groups.set(episode.showTitle, [episode]);
    }
  }

  return groups;
}

function pluralizeCount(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

/*
 * Presentational projection of a TvTimeImportPlan. Derives everything it
 * shows from the plan; performs no service calls and owns no import state.
 */
export default function TvTimeImportPreview({
  plan,
  fileName,
  resolutions,
  onResolve,
}: TvTimeImportPreviewProps) {
  const [manualMatchShowId, setManualMatchShowId] = useState<string | null>(null);

  const watchedByTitle = groupWatchedEpisodesByTitle(plan.watchedEpisodes);

  const plannedShowTitles = new Set(
    plan.shows.map((show) => show.candidate.title),
  );

  const unlinkedWatchedGroups = [...watchedByTitle.entries()].filter(
    ([title]) => !plannedShowTitles.has(title),
  );

  const unlinkedWatchedEpisodeCount = unlinkedWatchedGroups.reduce(
    (total, [, episodes]) => total + episodes.length,
    0,
  );

  const summaryCards = [
    { label: "New Shows", value: plan.summary.newShows },
    { label: "Already in Library", value: plan.summary.existingShows },
    { label: "Not Matched", value: plan.summary.unmatchedShows },
    { label: "Watched Episodes", value: plan.summary.plannedWatchedEpisodes },
  ];

  const hasWarnings =
    plan.warnings.length > 0 ||
    plan.summary.invalidWatchedEpisodes > 0 ||
    plan.summary.unmatchedShows > 0;

  return (
    <div className="mt-5 rounded-xl border border-border bg-app-bg/60 p-4">
      <h3 className="font-medium text-primary">Import Preview</h3>

      {fileName && (
        <p className="mt-1 min-w-0 break-words text-sm text-muted">{fileName}</p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-border bg-surface p-3"
          >
            <div className="text-xs text-muted">{card.label}</div>

            <div className="mt-1 text-xl font-semibold text-primary">
              {card.value}
            </div>
          </div>
        ))}
      </div>

      <details
        className="mt-4 rounded-lg border border-border bg-surface/60 p-3"
        open={plan.summary.unmatchedShows > 0}
      >
        <summary className="cursor-pointer text-sm font-medium text-primary">
          Planned shows ({plan.shows.length})
        </summary>

        <ul className="mt-3 space-y-2">
          {plan.shows.map((show) => {
            const matchedYear = getMatchedYear(show);

            const showWatchedEpisodes =
              watchedByTitle.get(show.candidate.title) ?? [];

            const decision = resolutions?.[show.candidate.tvTimeShowId];

            const isUnderReview = Boolean(show.review) && !show.resolution;

            const isSkippedByResolution = show.resolution?.decision === "skip";

            const selectedTmdbId =
              decision?.decision === "use" ? decision.tmdbId : undefined;

            const reviewCandidates = show.review
              ? show.review.candidates.slice(0, MAX_VISIBLE_CANDIDATES)
              : [];

            const hiddenCandidateCount = show.review
              ? show.review.candidates.length - reviewCandidates.length
              : 0;

            // A review entry without a resolution renders its radio group
            // with the planner's top-ranked candidate pre-selected; Import
            // stays disabled until the user records an explicit decision.
            const badge = isUnderReview
              ? {
                  label: "Needs review",
                  className: kindBadgeClasses.unmatched,
                }
              : isSkippedByResolution
                ? {
                    label: "Skipped",
                    className: kindBadgeClasses.existing,
                  }
                : {
                    label: kindLabels[show.kind],
                    className: kindBadgeClasses[show.kind],
                  };

            return (
              <li key={show.candidate.tvTimeShowId}>
                <details
                  className="rounded-lg border border-border bg-surface p-3"
                  open={isUnderReview || show.kind === "unmatched"}
                >
                  <summary className="flex cursor-pointer flex-wrap items-start justify-between gap-2">
                    <span className="min-w-0 break-words text-sm font-medium text-primary">
                      {show.candidate.title}
                    </span>

                    <span
                      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </summary>

                  <div className="mt-2 space-y-2 border-l border-border pl-3">
                    {isUnderReview && (
                      <fieldset className="space-y-2">
                        <legend className="text-xs font-medium text-warning">
                          Possible matches
                        </legend>

                        {reviewCandidates.map((candidate, index) => (
                          <label
                            key={candidate.tmdbShow.id}
                            className="flex min-w-0 cursor-pointer items-start gap-2"
                          >
                            <input
                              type="radio"
                              name={`tvtime-match-${show.candidate.tvTimeShowId}`}
                              className="mt-0.5 h-4 w-4 shrink-0"
                              checked={
                                selectedTmdbId === candidate.tmdbShow.id ||
                                (!decision && index === 0)
                              }
                              onChange={() =>
                                onResolve?.(show.candidate.tvTimeShowId, {
                                  decision: "use",
                                  tmdbId: candidate.tmdbShow.id,
                                })
                              }
                            />

                            <span className="min-w-0 break-words">
                              {candidate.tmdbShow.name}
                              {candidate.tmdbShow.first_air_date
                                ? ` (${candidate.tmdbShow.first_air_date.slice(0, 4)})`
                                : ""}{" "}
                              <span className="text-xs text-muted">
                                TMDB · match {index + 1}
                              </span>
                            </span>
                          </label>
                        ))}

                        <label className="flex min-w-0 cursor-pointer items-start gap-2">
                          <input
                            type="radio"
                            name={`tvtime-match-${show.candidate.tvTimeShowId}`}
                            className="mt-0.5 h-4 w-4 shrink-0"
                            checked={decision?.decision === "skip"}
                            onChange={() =>
                              onResolve?.(show.candidate.tvTimeShowId, {
                                decision: "skip",
                              })
                            }
                          />

                          <span className="min-w-0 break-words">
                            Skip this show
                          </span>
                        </label>

                        {hiddenCandidateCount > 0 && (
                          <p className="text-xs text-muted">
                            +{hiddenCandidateCount} lower-ranked matches not
                            shown.
                          </p>
                        )}
                      </fieldset>
                    )}

                    {!isUnderReview && show.kind !== "unmatched" && (
                      <p className="break-words text-xs text-muted">
                        Matched on TMDB: {show.tmdbShow.name}
                        {matchedYear ? ` (${matchedYear})` : ""}
                      </p>
                    )}

                    {isSkippedByResolution && (
                      <p className="break-words text-xs text-muted">
                        You chose to skip this show.
                      </p>
                    )}

                    {showWatchedEpisodes.map((episode, index) => (
                      <p
                        key={`${episode.seasonNumber}-${episode.episodeNumber}-${index}`}
                        className="text-xs text-muted"
                      >
                        {formatSeasonEpisode(
                          episode.seasonNumber,
                          episode.episodeNumber,
                        )}{" "}
                        — {watchedDateFormatter.format(episode.watchedAt)}
                      </p>
                    ))}
                  </div>

                  {show.kind === "unmatched" &&
                    !isSkippedByResolution &&
                    onResolve &&
                    (manualMatchShowId === show.candidate.tvTimeShowId ? (
                      <ManualMatchSearch
                        showTitle={show.candidate.title}
                        tvTimeShowId={show.candidate.tvTimeShowId}
                        onResolve={onResolve}
                        onCancel={() => setManualMatchShowId(null)}
                      />
                    ) : (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() =>
                            setManualMatchShowId(show.candidate.tvTimeShowId)
                          }
                          className="inline-flex items-center gap-2 rounded-lg bg-accent/15 px-3 py-1.5 text-xs font-medium text-accent-text transition hover:bg-accent/25"
                        >
                          <Search className="h-3 w-3" />
                          Find match
                        </button>
                      </div>
                    ))}
                </details>
              </li>
            );
          })}
        </ul>
      </details>

      {unlinkedWatchedGroups.length > 0 && (
        <details className="mt-3 rounded-lg border border-border bg-surface/60 p-3">
          <summary className="cursor-pointer text-sm font-medium text-warning">
            Unlinked watched episodes ({unlinkedWatchedEpisodeCount})
          </summary>

          <ul className="mt-3 space-y-2">
            {unlinkedWatchedGroups.map(([title, episodes]) => (
              <li key={title} className="min-w-0 break-words text-warning">
                <span className="text-xs font-medium">{title}</span>

                <ul className="mt-1 space-y-0.5">
                  {episodes.map((episode, index) => (
                    <li
                      key={`${episode.seasonNumber}-${episode.episodeNumber}-${index}`}
                      className="text-xs text-muted"
                    >
                      {formatSeasonEpisode(
                        episode.seasonNumber,
                        episode.episodeNumber,
                      )}{" "}
                      — {watchedDateFormatter.format(episode.watchedAt)}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </details>
      )}

      {hasWarnings && (
        <div className="mt-4 rounded-lg border border-warning/40 bg-warning/10 p-3">
          <h4 className="flex items-center gap-2 text-sm font-medium text-warning">
            <AlertTriangle aria-hidden="true" className="h-4 w-4" />
            Needs attention
          </h4>

          <ul className="mt-2 space-y-1">
            {plan.summary.unmatchedShows > 0 && (
              <li className="break-words text-xs text-warning">
                {pluralizeCount(plan.summary.unmatchedShows, "show")} could not
                be confidently matched and will be skipped.
              </li>
            )}

            {plan.warnings.map((warning, index) => (
              <li key={index} className="break-words text-xs text-warning">
                {warning}
              </li>
            ))}

            {plan.summary.invalidWatchedEpisodes > 0 && (
              <li className="break-words text-xs text-warning">
                {pluralizeCount(
                  plan.summary.invalidWatchedEpisodes,
                  "watched entry",
                )}{" "}
                skipped because the watch date could not be read.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}