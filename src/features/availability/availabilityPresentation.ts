import type {
  AvailabilityResult,
  AvailabilityType,
  ProviderErrorKind,
} from "../../domain/availability/types";
import type { Media } from "../../types/media";
import {
  getRegionName,
  type AvailabilityRegionCode,
  type AvailabilityRegionStatus,
} from "../settings/region/availabilityRegion";

/**
 * Builds the deterministic identity of one availability request (A26.6-S1).
 *
 * Two calls return the same key if and only if the request would be identical:
 * the media identity (id, mediaType, tmdbId), the region, the region
 * readiness status, the connectivity state, and the manual-retry generation.
 * The availability section uses this key to tag in-flight/committed request
 * state so an obsolete request (previous region, previous title, previous
 * connectivity, previous attempt, or a request from before a re-render) can
 * never be displayed for a newer identity. Pure and side-effect free.
 */
export function createAvailabilityRequestKey(
  media: Pick<Media, "id" | "mediaType" | "tmdbId">,
  region: AvailabilityRegionCode,
  status: AvailabilityRegionStatus,
  isOnline: boolean,
  attempt: number,
): string {
  return [
    media.id === undefined ? "unsaved" : String(media.id),
    media.mediaType,
    media.tmdbId === undefined ? "no-tmdb" : String(media.tmdbId),
    region,
    status,
    isOnline ? "online" : "offline",
    String(attempt),
  ].join("|");
}

/**
 * Presentation-only mirror of the domain's private `AVAILABILITY_TYPE_ORDER`
 * (src/domain/availability/types.ts). A26.2 is frozen and intentionally does
 * not export the order, so the presentation layer redeclares it here. It MUST
 * stay in sync with the domain constant.
 */
const UI_AVAILABILITY_TYPE_ORDER: readonly AvailabilityType[] = [
  "flatrate",
  "free",
  "ads",
  "rent",
  "buy",
];

/** Fixed English display labels for the approved access-type groups (D1). */
const ACCESS_GROUP_LABELS: Record<AvailabilityType, string> = {
  flatrate: "Subscription",
  free: "Free",
  ads: "With ads",
  rent: "Rent",
  buy: "Buy",
};

/** Deterministic, user-facing error copy per provider error kind (A26.5). */
const ERROR_COPY: Record<ProviderErrorKind, string> = {
  rateLimited: "Too many requests. Try again later.",
  serviceUnavailable: "The availability service is temporarily unavailable.",
  timeout: "The availability check timed out.",
  network: "Network error while checking availability.",
  unknown: "Could not check availability right now.",
  other: "Could not check availability right now.",
};

/**
 * Fixed priority used to pick the dominant error kind when a resolution
 * aggregates several provider errors. Deterministic regardless of provider
 * result order.
 */
const ERROR_KIND_PRIORITY: readonly ProviderErrorKind[] = [
  "rateLimited",
  "serviceUnavailable",
  "timeout",
  "network",
  "unknown",
  "other",
];

/** UI state of an availability section render (A26.5 §7 matrix). */
export type AvailabilityViewState =
  | "available"
  | "unavailable"
  | "partial"
  | "error"
  | "offline";

/** One access-group badge in the presentation model. */
export interface AvailabilityGroupView {
  readonly type: AvailabilityType;
  readonly label: string;
}

/**
 * Pure presentation model for the "Where to watch" section. The component
 * renders strictly from this model — no domain access inside views.
 */
export interface AvailabilityViewModel {
  readonly state: AvailabilityViewState;
  /** e.g. "Where to watch (India)" */
  readonly heading: string;
  /** Verbatim from `result.region`. */
  readonly region: AvailabilityRegionCode;
  readonly groups: readonly AvailabilityGroupView[];
  /** Verbatim from `result.link` when present; omitted when absent. */
  readonly link?: string;
  readonly statusMessage?: string;
  /** True ONLY for state "error" (manual retry; never automatic). */
  readonly isRetryable: boolean;
}

/**
 * Maps a frozen domain `AvailabilityResult` to the availability view model.
 *
 * Pure and synchronous: no fetches, no React, and no mutation of the input.
 * `resolution` is the primary state signal; `verdict` is consulted only to
 * distinguish resolved no-group cases. Deterministic: groups follow the
 * canonical access-type order and error copy is kind-based with a fixed
 * priority.
 */
export function toAvailabilityViewModel(
  result: AvailabilityResult,
): AvailabilityViewModel {
  const regionName = getRegionName(result.region);
  const heading = `Where to watch (${regionName})`;

  // Defensive: out-of-catalogue group types are dropped, never rendered.
  const groups = result.groups
    .filter((group) =>
      (UI_AVAILABILITY_TYPE_ORDER as readonly string[]).includes(group.type),
    )
    .map((group) => ({
      type: group.type as AvailabilityType,
      label: ACCESS_GROUP_LABELS[group.type as AvailabilityType],
    }))
    .sort(
      (a, b) =>
        UI_AVAILABILITY_TYPE_ORDER.indexOf(a.type) -
        UI_AVAILABILITY_TYPE_ORDER.indexOf(b.type),
    );

  const { verdict, resolution } = result;
  let state: AvailabilityViewState;
  let statusMessage: string | undefined;
  let isRetryable = false;

  switch (resolution) {
    case "offline":
      state = "offline";
      statusMessage =
        "You are offline. Availability cannot be checked right now.";
      break;
    case "error":
      state = "error";
      isRetryable = true;
      statusMessage = dominantErrorCopy(result);
      break;
    case "partial":
      state = "partial";
      statusMessage = "Some availability information couldn't be checked.";
      break;
    case "resolved":
      if (verdict === "available") {
        state = "available"; // degenerate 0-groups case renders heading/link only
      } else if (verdict === "unavailable") {
        state = "unavailable";
        statusMessage = `Not available in ${regionName}.`;
      } else {
        state = "unavailable"; // verdict "unknown"
        statusMessage =
          `No availability information is available for this title in ${regionName}.`;
      }
      break;
  }

  return {
    state,
    heading,
    region: result.region,
    groups,
    ...(result.link === undefined ? {} : { link: result.link }),
    statusMessage,
    isRetryable,
  };
}

/**
 * Picks the deterministic error copy for an error resolution from the kinds
 * of the aggregated provider errors. Error detail is supplementary — the
 * caller has already classified the state from `resolution`.
 */
function dominantErrorCopy(result: AvailabilityResult): string {
  const kinds = new Set(
    result.providerResults
      .map((providerResult) => providerResult.error?.kind)
      .filter((kind): kind is ProviderErrorKind => kind !== undefined),
  );

  for (const kind of ERROR_KIND_PRIORITY) {
    if (kinds.has(kind)) {
      return ERROR_COPY[kind];
    }
  }

  return ERROR_COPY.unknown;
}
