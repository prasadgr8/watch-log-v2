import { useEffect, useState } from "react";
import { ExternalLink, LoaderCircle } from "lucide-react";

// Same Media type the A26.4 service accepts (exact module path pinned at S1).
import type { Media } from "../../types/media";
import type { AvailabilityResult } from "../../domain/availability/types";

import { getAvailabilityForMedia } from "../../services/availability/mediaAvailabilityService";
import { useOnlineStatus } from "../../app/useOnlineStatus";
import { useRegion } from "../settings/region/regionContext";
import { getRegionName } from "../settings/region/availabilityRegion";

import {
  toAvailabilityViewModel,
  type AvailabilityViewModel,
} from "./availabilityPresentation";

const CTA_CLASS =
  "mt-3 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-inverted transition hover:bg-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40";

export interface MediaAvailabilitySectionProps {
  media: Media;
}

/**
 * "Where to watch" availability section (A26.5).
 *
 * Thin fetch-and-render component: it owns only the fetch lifecycle (region
 * readiness, connectivity, media identity, manual retry) and delegates all
 * result presentation to the pure `toAvailabilityViewModel` mapper. No
 * polling, no caching, no persistence, no automatic retry.
 */
export default function MediaAvailabilitySection({
  media,
}: MediaAvailabilitySectionProps) {
  const { region, status, openRegionSelection } = useRegion();
  const isOnline = useOnlineStatus();

  const [result, setResult] = useState<AvailabilityResult | null>(null);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);

  /* eslint-disable react-hooks/set-state-in-effect -- A26.5 §9 intentionally resets the section to its loading state when the fetch identity changes; the synchronous setState is the documented fetch-lifecycle contract (a stale result must never survive a media/region/connectivity/attempt change) */
  useEffect(() => {
    // D2: region must be confirmed before any availability request — no
    // fetch, no fallback region, no hard-coded IN.
    if (status !== "ready") {
      setResult(null);
      setLoadError(null);
      return;
    }

    let cancelled = false;
    setResult(null);
    setLoadError(null);

    void getAvailabilityForMedia(media, region, { isOnline: () => isOnline })
      .then((next) => {
        if (!cancelled) {
          setResult(next);
          setLoadError(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          // Invalid-region rejection is unreachable; defensive only (D2).
          setLoadError(
            error instanceof Error
              ? error
              : new Error("Unable to check availability."),
          );
          setResult(null);
        }
      });

    return () => {
      cancelled = true; // stale in-flight results never overwrite newer state
    };
    // The availability identity is (media.id, media.mediaType, media.tmdbId).
    // Listing the whole `media` object would refetch on unrelated re-renders
    // that recreate it (A26.5 §13), so only the identity keys are tracked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media.id, media.mediaType, media.tmdbId, region, status, isOnline, attempt]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (status !== "ready") {
    return (
      <section aria-label="Where to watch">
        <h2 className="text-2xl font-semibold text-primary">Where to watch</h2>
        <p className="mt-3 text-sm text-muted">
          Set your region to check where you can watch this title.
        </p>
        <button
          type="button"
          onClick={openRegionSelection}
          className={CTA_CLASS}
        >
          Choose region
        </button>
      </section>
    );
  }

  if (loadError !== null) {
    return (
      <section aria-label="Where to watch">
        <h2 className="text-2xl font-semibold text-primary">
          Where to watch ({getRegionName(region)})
        </h2>
        <p
          role="status"
          className="mt-3 rounded-lg border border-danger/60 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          Could not check availability right now.
        </p>
        <button
          type="button"
          onClick={() => setAttempt((current) => current + 1)}
          className={CTA_CLASS}
        >
          Try again
        </button>
      </section>
    );
  }

  if (result === null) {
    return (
      <section
        aria-label="Where to watch"
        aria-busy="true"
        className="mt-8 rounded-xl border border-border bg-surface p-6"
      >
        <h2 className="text-2xl font-semibold text-primary">Where to watch</h2>
        <div className="mt-3 flex items-center gap-2 text-sm text-muted">
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>Checking availability…</span>
        </div>
      </section>
    );
  }

  const viewModel = toAvailabilityViewModel(result);

  return (
    <AvailabilitySectionView
      viewModel={viewModel}
      onRetry={() => setAttempt((current) => current + 1)}
    />
  );
}

interface AvailabilitySectionViewProps {
  viewModel: AvailabilityViewModel;
  onRetry: () => void;
}

/**
 * Presentation-only view. Renders strictly from `AvailabilityViewModel` —
 * no domain access. Text labels carry the meaning (never color-only), and
 * the regional link is rendered only when the result supplies one.
 */
function AvailabilitySectionView({
  viewModel,
  onRetry,
}: AvailabilitySectionViewProps) {
  const statusClass =
    viewModel.state === "error"
      ? "rounded-lg border border-danger/60 bg-danger/10 px-4 py-3 text-sm text-danger"
      : viewModel.state === "offline"
        ? "rounded-lg border border-warning/60 bg-warning/10 px-4 py-3 text-sm text-warning"
        : "rounded-lg border border-border bg-surface-elevated px-4 py-3 text-sm text-muted";

  return (
    <section
      aria-label="Where to watch"
      className="mt-8 rounded-xl border border-border bg-surface p-6"
    >
      <h2 className="text-2xl font-semibold text-primary">{viewModel.heading}</h2>

      {viewModel.groups.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {viewModel.groups.map((group) => (
            <span
              key={group.type}
              className="inline-flex items-center rounded-full bg-surface-elevated px-3 py-1 text-xs font-medium text-muted"
            >
              {group.label}
            </span>
          ))}
        </div>
      )}

      {viewModel.link !== undefined && (
        <a
          href={viewModel.link}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`View watch options in ${getRegionName(viewModel.region)}`}
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
        >
          View watch options
          <ExternalLink size={14} aria-hidden="true" />
        </a>
      )}

      {viewModel.statusMessage !== undefined && (
        <p role="status" className={`mt-4 ${statusClass}`}>
          {viewModel.statusMessage}
        </p>
      )}

      {viewModel.isRetryable && (
        <button type="button" onClick={onRetry} className={CTA_CLASS}>
          Try again
        </button>
      )}
    </section>
  );
}
