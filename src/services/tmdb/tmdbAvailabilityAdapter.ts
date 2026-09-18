import type {
  AccessOffering,
  AvailabilityRegionCode,
  MediaIdentity,
  ProviderAdapter,
  ProviderCapability,
  ProviderErrorKind,
  ProviderResult,
} from "../../domain/availability/types";
import { createAccessOffering } from "../../domain/availability/types";
import type {
  TmdbWatchProvidersResponse,
  TmdbWatchProviderRegionResult,
} from "./tmdbAvailabilityTypes";
import { tmdbAvailabilityService } from "./tmdbAvailabilityService";
import { TmdbRequestError } from "./tmdbClient";

/**
 * TMDB streaming-availability provider adapter (A26.3).
 *
 * Connects the provider-neutral availability domain to TMDB's movie/TV
 * watch-provider endpoints. This adapter is the only place TMDB response data
 * is allowed to exist: it receives a provider-neutral `MediaIdentity` and an
 * explicit region, and answers with an already-normalized `ProviderResult`.
 *
 * Implemented so far:
 * - A26.3-S3 (adapter foundation): capability metadata, TMDB id extraction from
 *   the `ExternalIdType.tmdb` identity data, movie/TV endpoint selection
 *   through the verified TMDB availability service, and the explicit
 *   region-selection boundary.
 * - A26.3-S4 (provider/monetization mapping): the selected region result is
 *   mapped into provider-neutral offerings - `flatrate`/`free`/`ads`/`rent`/
 *   `buy` access types, per-provider offering keys (`tmdb:<provider_id>`),
 *   structural provider label keys (`provider.tmdb.<provider_id>`), and the
 *   TMDB regional link.
 * - A26.3-S5 (error & edge cases): a failed TMDB request is translated into the
 *   existing provider-neutral error model - 404 resolves as empty availability,
 *   429 as `rateLimited`, 5xx as `serviceUnavailable`, any other status as the
 *   generic `other`, and a failed fetch as `network`. A missing TMDB identity
 *   reports a provider-level error, missing region data resolves as empty
 *   availability, and absent optional provider arrays contribute no offerings.
 *
 * Not implemented here: per-provider display metadata (`provider_name`,
 * `logo_path`, `display_priority`) has no representation in the A26.2
 * availability contract available to an adapter (`ProviderResult` carries
 * offerings, resolution, error and link only), so it is out of A26.3 scope and
 * belongs to provider-catalogue/localization work.
 */

/** Provider key of the TMDB adapter itself; offerings use `tmdb:<id>` in S4. */
const TMDB_PROVIDER_KEY = "tmdb";

/**
 * Capability metadata only: no runtime behavior is attached to these flags and
 * no availability is fetched from an adapter declaration.
 *
 * The supported regions mirror the A26.1 region catalogue. The adapter stays
 * stateless with respect to region and never reads settings or storage, so the
 * list is a compile-time-checked literal (typed against the A26.1 region code
 * union) rather than a settings lookup.
 */
const TMDB_PROVIDER_CAPABILITY: ProviderCapability = {
  providerKey: TMDB_PROVIDER_KEY,
  // Capability-level label key; per-offering keys (`provider.tmdb.<id>`) are S4.
  providerLabelKey: "provider.tmdb",
  providerName: "TMDB",
  supportedMediaKinds: ["movie", "tv"],
  supportedRegions: ["IN", "US", "GB", "CA", "AU"],
  requiresNetwork: true,
  isBestEffort: true,
};

/**
 * Extracts the TMDB id from the identity's `ExternalIdType.tmdb` entry.
 *
 * TMDB ids are never inferred from titles, and no search or discovery endpoint
 * is consulted. `undefined` is returned when the identity carries no TMDB id or
 * when the value is not a positive integer; detailed missing-id semantics
 * belong to A26.3-S5.
 */
function findTmdbId(identity: MediaIdentity): number | undefined {
  const externalId = identity.externalIds.find(
    (candidate) => candidate.type === "tmdb",
  );

  if (externalId === undefined) {
    return undefined;
  }

  const parsedId =
    typeof externalId.id === "number" ? externalId.id : Number(externalId.id);

  return Number.isInteger(parsedId) && parsedId > 0 ? parsedId : undefined;
}

/**
 * TMDB access-type groups of a region result, in TMDB's documented order. The
 * array also fixes the deterministic order of the mapped offerings.
 */
const TMDB_ACCESS_TYPES = [
  "flatrate",
  "free",
  "ads",
  "rent",
  "buy",
] as const;

type TmdbAccessType = (typeof TMDB_ACCESS_TYPES)[number];

/**
 * Approved monetization mapping: each TMDB access type maps onto exactly one
 * `AccessOffering` cost model, with `ads` additionally setting the independent
 * ad-supported flag. The domain's own group derivation then places a
 * subscription in "flatrate", free in "free", ad-supported in "free" and
 * "ads", rental in "rent", and purchase in "buy".
 */
const ACCESS_FLAGS_BY_TMDB_ACCESS_TYPE: Record<
  TmdbAccessType,
  {
    isSubscription?: true;
    isFree?: true;
    isAdSupported?: true;
    isRent?: true;
    isBuy?: true;
  }
> = {
  flatrate: { isSubscription: true },
  free: { isFree: true },
  ads: { isFree: true, isAdSupported: true },
  rent: { isRent: true },
  buy: { isBuy: true },
};

/** Structural provider label-key prefix; localization stays outside A26.3. */
const TMDB_PROVIDER_LABEL_KEY_PREFIX = "provider.tmdb.";

/**
 * Maps the selected TMDB region result into provider-neutral offerings.
 *
 * Pure, synchronous and local to the already-fetched response. One offering is
 * produced per (provider, TMDB access type) in TMDB order, so a provider that
 * offers several access types keeps every access model - `createAccessOffering`
 * permits exactly one cost model per offering, and the domain's group
 * derivation deduplicates providers inside each group. A provider repeated
 * within the same access type is emitted once, so the result never contains
 * duplicate or contradictory provider records, and no monetization information
 * is discarded.
 *
 * Absent access-type arrays contribute no offerings; missing/malformed response
 * semantics belong to A26.3-S5 and are deliberately not implemented here.
 */
function toOfferings(
  regionResult: TmdbWatchProviderRegionResult | undefined,
  region: AvailabilityRegionCode,
): ReadonlyArray<AccessOffering> {
  if (regionResult === undefined) {
    return [];
  }

  const offerings: AccessOffering[] = [];
  const seen = new Set<string>();

  for (const accessType of TMDB_ACCESS_TYPES) {
    const providers = regionResult[accessType];

    if (providers === undefined) {
      continue;
    }

    for (const provider of providers) {
      const providerKey = `${TMDB_PROVIDER_KEY}:${provider.provider_id}`;
      const seenKey = `${providerKey}|${accessType}`;

      if (seen.has(seenKey)) {
        continue;
      }
      seen.add(seenKey);

      offerings.push(
        createAccessOffering({
          providerKey,
          providerLabelKey: `${TMDB_PROVIDER_LABEL_KEY_PREFIX}${provider.provider_id}`,
          region,
          ...ACCESS_FLAGS_BY_TMDB_ACCESS_TYPE[accessType],
        }),
      );
    }
  }

  return offerings;
}

/**
 * Provider-level result for a query that produced no provider data. `link`
 * stays absent unless the provider supplied one.
 */
function resolvedResult(
  offerings: ReadonlyArray<AccessOffering>,
  link?: string,
): ProviderResult {
  return {
    providerKey: TMDB_PROVIDER_KEY,
    offerings,
    resolution: "resolved",
    ...(link === undefined ? {} : { link }),
  };
}

/**
 * Provider-level failure in the existing provider-neutral error model.
 *
 * `providerKey` stays the adapter key (`"tmdb"`); an individual offering key
 * such as `tmdb:<provider_id>` is never used for a provider-level error, and the
 * failure message stays supplementary to the `kind`.
 */
function errorResult(kind: ProviderErrorKind, error: unknown): ProviderResult {
  const message = error instanceof Error ? error.message : undefined;

  return {
    providerKey: TMDB_PROVIDER_KEY,
    offerings: [],
    resolution: "error",
    error: {
      providerKey: TMDB_PROVIDER_KEY,
      kind,
      ...(message === undefined ? {} : { message }),
    },
  };
}

/**
 * Translates a failed TMDB request into the approved provider error semantics
 * using the existing `TmdbRequestError.status`:
 *
 * - 404: resolved empty availability, not an error. The domain cannot
 *   distinguish an unknown TMDB title from a known title with no providers in
 *   the requested region, so both are "no data" (A26.3 architecture decision).
 * - 429: `rateLimited`.
 * - 5xx: `serviceUnavailable`.
 * - any other status: the domain's generic `other` - never reclassified into one
 *   of the approved categories.
 *
 * Anything that is not a `TmdbRequestError` is a failed fetch (DNS, CORS,
 * connection loss) and maps to the existing `network` kind. No retry, backoff or
 * repeat request is performed, and timeout stays owned by
 * `createAvailabilityService`.
 */
function toFailureResult(error: unknown): ProviderResult {
  if (!(error instanceof TmdbRequestError)) {
    return errorResult("network", error);
  }

  if (error.status === 404) {
    return resolvedResult([]);
  }

  if (error.status === 429) {
    return errorResult("rateLimited", error);
  }

  if (error.status >= 500 && error.status < 600) {
    return errorResult("serviceUnavailable", error);
  }

  return errorResult("other", error);
}

export const tmdbAvailabilityAdapter: ProviderAdapter = {
  capability: TMDB_PROVIDER_CAPABILITY,

  async queryAvailability(
    identity: MediaIdentity,
    region: AvailabilityRegionCode,
  ): Promise<ProviderResult> {
    const tmdbId = findTmdbId(identity);

    if (tmdbId === undefined) {
      // No usable TMDB identity: this provider cannot answer for the title at
      // all, so it reports a provider-level failure instead of throwing an
      // implementation error. The A26.2 domain has no identity-specific error
      // kind, so the existing generic `other` is used rather than inventing one.
      // No TMDB search/discovery fallback and no id inference happens here.
      return errorResult(
        "other",
        new Error(
          "TMDB availability requires a positive TMDB id in the media identity.",
        ),
      );
    }

    let response: TmdbWatchProvidersResponse;

    try {
      // Movie/TV branching goes through the verified TMDB availability service;
      // the adapter never calls the TMDB request layer or rebuilds endpoint paths.
      response =
        identity.mediaType === "movie"
          ? await tmdbAvailabilityService.getMovieWatchProviders(tmdbId)
          : await tmdbAvailabilityService.getTvWatchProviders(tmdbId);
    } catch (error) {
      // Only the request is guarded, so a mapping or programming fault further
      // down can never be misreported as a provider network failure.
      return toFailureResult(error);
    }

    // Region-selection boundary: the caller-supplied region is looked up in the
    // complete TMDB response. The region is never sent as a TMDB query
    // parameter, and region is never read from context, settings or storage.
    const regionResult = response.results[region];

    // Local, synchronous mapping of the already-fetched response: still exactly
    // one TMDB request per adapter invocation, with no extra network work.
    const offerings = toOfferings(regionResult, region);

    // The TMDB-provided regional watch link is preserved verbatim through the
    // existing optional `ProviderResult.link` channel: no URL is built,
    // rewritten or cached, and the link stays absent when TMDB reported nothing
    // for the region.
    return resolvedResult(offerings, regionResult?.link);
  },
};