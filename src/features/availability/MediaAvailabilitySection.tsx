import { useEffect, useId, useState } from "react";
import { ExternalLink, LoaderCircle } from "lucide-react";

// Same Media type the A26.4 service accepts (exact module path pinned at S1).
import type { Media } from "../../types/media";
import type { AvailabilityResult } from "../../domain/availability/types";

import { getAvailabilityForMedia } from "../../services/availability/mediaAvailabilityService";
import { useOnlineStatus } from "../../app/useOnlineStatus";
import { useRegion } from "../settings/region/regionContext";
import { getRegionName } from "../settings/region/availabilityRegion";

import {
  createAvailabilityRequestKey,
  toAvailabilityViewModel,
  type AvailabilityViewModel,
} from "./availabilityPresentation";

const CTA_CLASS =
  "mt-3 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-inverted transition hover:bg-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40";

export interface MediaAvailabilitySectionProps {
  media: Media;
}

/**
 * Tagged request state (A26.6-S1).
 *
 * Every committed availability state carries the deterministic request key it
 * was produced for, so render can tell at a glance whether the state belongs
 * to the current request identity (media/region/status/connectivity/attempt)
 * or to an obsolete one.
 */
interface RequestState {
  readonly requestKey: string;
  readonly result: AvailabilityResult | null;
  readonly loadError: Error | null;
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

  // The section heading is the primary accessible name of the availability
  // region landmark (A26.6-S2): one collision-proof id, referenced by every
  // rendered state's <section aria-labelledby>.
  const headingId = useId();

  const [attempt, setAttempt] = useState(0);
  const [request, setRequest] = useState<RequestState | null>(null);

  // The deterministic identity of the availability request this render is for:
  // media identity + region + readiness + connectivity + retry generation.
  const requestKey = createAvailabilityRequestKey(
    media,
    region,
    status,
    isOnline,
    attempt,
  );

  // A26.6-S1 (requirements 2/3/7): adjust stored request state during render
  // when the request identity changes (React's documented adjust-state-when-
  // props-change pattern). React discards this render's output and re-renders
  // immediately, so the FIRST COMMITTED frame for a new media/region/readiness/
  // connectivity/retry identity already shows its own loading state — the
  // previous region's availability or error is never displayed, not even for
  // one frame. (An effect-only reset would commit that stale frame first,
  // because effects run after the browser can have painted.)
  const [renderedRequestKey, setRenderedRequestKey] = useState(requestKey);
  if (renderedRequestKey !== requestKey) {
    setRenderedRequestKey(requestKey);
    setRequest(null);
  }

  // A26.6-S1 (requirement 5): staleness is derived during render from the
  // request key, so a state committed by an obsolete request can never be
  // displayed, independent of the fetch-effect cancellation below.
  const shownRequest =
    request !== null && request.requestKey === requestKey ? request : null;
  const shownResult = shownRequest?.result ?? null;
  const shownError = shownRequest?.loadError ?? null;

  useEffect(() => {
    // D2: fetch only for a confirmed region — no fallback region, no
    // hard-coded IN. Stale display state is already discarded by the
    // render-phase reset above; this early return only prevents the fetch.
    if (status !== "ready") {
      return;
    }

    let cancelled = false;
    const effectRequestKey = createAvailabilityRequestKey(
      media,
      region,
      status,
      isOnline,
      attempt,
    );

    void getAvailabilityForMedia(media, region, { isOnline: () => isOnline })
      .then((next) => {
        if (cancelled) {
          return; // late response: a newer request or unmount already won
        }
        setRequest({
          requestKey: effectRequestKey,
          result: next,
          loadError: null,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return; // late rejection: a newer request or unmount already won
        }
        // Unexpected rejection (e.g. invalid-region) is unreachable by
        // contract; defensive only (D2) — generic retryable component error.
        setRequest({
          requestKey: effectRequestKey,
          result: null,
          loadError:
            error instanceof Error
              ? error
              : new Error("Unable to check availability."),
        });
      });

    return () => {
      cancelled = true; // obsolete in-flight results never commit state
    };
    // `requestKey` fully encodes the request identity (media id/mediaType/
    // tmdbId, region, readiness, connectivity, attempt); every identity
    // component is also listed so the rule sees them. The one deliberate
    // omission is the `media` OBJECT: listing it would refetch whenever an
    // unrelated re-render recreates the object (e.g. an edit-save) even
    // though the identity (media.id/mediaType/tmdbId — inside requestKey)
    // is unchanged, violating the A26.5 §13 no-refetch contract. This
    // suppression was re-evaluated at A26.6-S1 and remains necessary;
    // lifecycle correctness is carried by requestKey + the render-phase
    // reset above, not by the omitted object identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey, region, status, isOnline, attempt]);

  if (status !== "ready") {
    return (
      <section aria-labelledby={headingId}>
        <h2
          id={headingId}
          className="text-2xl font-semibold text-primary"
        >
          Where to watch
        </h2>
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

  if (shownError !== null) {
    return (
      <section aria-labelledby={headingId}>
        <h2
          id={headingId}
          className="text-2xl font-semibold text-primary"
        >
          Where to watch ({getRegionName(region)})
        </h2>
        <p className="mt-3 rounded-lg border border-danger/60 bg-danger/10 px-4 py-3 text-sm text-danger">
          Could not check availability right now.
        </p>
        {/* A26.6-S2: the ONE polite live region of this state — the visible
            box above is purely visual so no two regions ever announce the
            same transition. */}
        <p role="status" className="sr-only">
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

  if (shownResult === null) {
    return (
      <section
        aria-labelledby={headingId}
        aria-busy="true"
        className="mt-8 rounded-xl border border-border bg-surface p-6"
      >
        <h2
          id={headingId}
          className="text-2xl font-semibold text-primary"
        >
          Where to watch
        </h2>
        <div className="mt-3 flex items-center gap-2 text-sm text-muted">
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>Checking availability…</span>
        </div>
        {/* A26.6-S2: the ONE polite live region of this state — the visible
            text above is not itself a live region, so the loading transition
            is announced exactly once and the decorative spinner is never
            announced. */}
        <p role="status" className="sr-only">
          Checking availability…
        </p>
      </section>
    );
  }

  const viewModel = toAvailabilityViewModel(shownResult);

  return (
    <AvailabilitySectionView
      viewModel={viewModel}
      headingId={headingId}
      onRetry={() => setAttempt((current) => current + 1)}
    />
  );
}

interface AvailabilitySectionViewProps {
  viewModel: AvailabilityViewModel;
  /** Accessible name source for the availability landmark (A26.6-S2). */
  headingId: string;
  onRetry: () => void;
}

/**
 * Presentation-only view. Renders strictly from `AvailabilityViewModel` —
 * no domain access. Text labels carry the meaning (never color-only), and
 * the regional link is rendered only when the result supplies one. Exactly
 * one polite live region announces the result state; the visible status box
 * is purely visual (A26.6-S2).
 */
function AvailabilitySectionView({
  viewModel,
  headingId,
  onRetry,
}: AvailabilitySectionViewProps) {
  const statusClass =
    viewModel.state === "error"
      ? "rounded-lg border border-danger/60 bg-danger/10 px-4 py-3 text-sm text-danger"
      : viewModel.state === "offline"
        ? "rounded-lg border border-warning/60 bg-warning/10 px-4 py-3 text-sm text-warning"
        : "rounded-lg border border-border bg-surface-elevated px-4 py-3 text-sm text-muted";

  // The single live-region announcement of this state: the mapper's
  // status message for unavailable/partial/offline/error results, or a
  // concise success announcement for an available result (which has no
  // visible status box to announce).
  const announcement =
    viewModel.statusMessage ??
    (viewModel.state === "available" ? "Availability found." : null);

  return (
    <section
      aria-labelledby={headingId}
      className="mt-8 rounded-xl border border-border bg-surface p-6"
    >
      <h2 id={headingId} className="text-2xl font-semibold text-primary">
        {viewModel.heading}
      </h2>

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
          aria-label={`View watch options in ${getRegionName(viewModel.region)} (opens in a new tab)`}
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
        >
          View watch options
          <ExternalLink size={14} aria-hidden="true" />
        </a>
      )}

      {viewModel.statusMessage !== undefined && (
        <p className={`mt-4 ${statusClass}`}>{viewModel.statusMessage}</p>
      )}

      {announcement !== null && (
        <p role="status" className="sr-only">
          {announcement}
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
