/**
 * Provider-neutral streaming-availability domain types.
 *
 * This module defines the shape of availability information independent of
 * any specific provider. Provider adapters (introduced in a later milestone)
 * translate provider-specific responses into the normalized shapes defined
 * here, so the availability service and any future UI never see
 * provider-specific response objects.
 *
 * Region handling is intentionally explicit: callers pass an
 * `AvailabilityRegionCode` (from the A26.1 region preference) and the domain
 * never infers, detects, or defaults the region on its own. The region code
 * type and its validator are reused from A26.1 so there is a single source of
 * truth for which regions WatchLog supports.
 */

import type { AvailabilityRegionCode } from "../../features/settings/region/availabilityRegion";
import { isAvailabilityRegion } from "../../features/settings/region/availabilityRegion";
import type { MediaType } from "../../types/media";

/**
 * Re-exported so consumers of the availability domain can take the region
 * code type from this module alongside the rest of the availability contract.
 * The definition itself stays owned by A26.1 (single source of truth).
 */
export type { AvailabilityRegionCode };

/** Business outcome of an availability lookup for a title in a region. */
export type AvailabilityVerdict = "available" | "unavailable" | "unknown";

/**
 * Lookup/execution state of an availability lookup.
 *
 * This is deliberately separate from `AvailabilityVerdict`: the verdict says
 * *what* the lookup concluded about availability, while the resolution says
 * *how completely* the lookup was able to answer. That keeps "not available"
 * distinguishable from "could not determine".
 */
export type ResolutionState = "resolved" | "partial" | "offline" | "error";

/** Same scale as `ResolutionState`, used for a single provider result. */
export type ProviderResolution = ResolutionState;

/**
 * The approved monetization/access types of the public availability
 * contract: flatrate (subscription streaming), free, ads (ad-supported
 * access), rent, and buy.
 */
export type AvailabilityType = "flatrate" | "free" | "ads" | "rent" | "buy";

/** Opaque provider key; meaning is chosen by each provider, compared only for equality. */
export type ProviderKey = string;

/** Key used by UI to look up a localized provider label; no provider metadata here. */
export type ProviderLabelKey = string;

/**
 * Public provider representation of the availability domain.
 *
 * `providerId` is the stable provider identifier (the same opaque key used by
 * offerings and capabilities). `providerName` is the display name of the
 * provider as plain domain data. `logoPath` and `displayPriority` are
 * optional: an adapter may supply a relative logo path for later UI use and
 * a hint for ordering providers inside an availability group.
 *
 * This shape stays provider-neutral on purpose: no TMDB/JustWatch response
 * models, no UI components, and no network behavior live here.
 */
export interface Provider {
  readonly providerId: ProviderKey;
  readonly providerName: string;
  readonly logoPath?: string;
  readonly displayPriority?: number;
}

/**
 * One monetization/access grouping of the public availability result.
 *
 * `type` is one of the approved `AvailabilityType` values and `providers`
 * lists every provider contributing an offering of that type for the
 * requested region, in the approved public provider shape.
 */
export interface AvailabilityGroup {
  readonly type: AvailabilityType;
  readonly providers: ReadonlyArray<Provider>;
}

/**
 * A single normalized way a provider makes a title available in a region.
 *
 * Access dimensions are independent booleans so that, for example, "free" and
 * "ad-supported" can coexist on the same offering (free ad-supported
 * streaming) without forcing mutually-exclusive enum values.
 *
 * Validation rule: exactly one of `isSubscription`, `isFree`, `isRent`,
 * `isBuy` must be true (the offering's cost/licensing model). `isAdSupported`
 * is an independent dimension that may be true on any offering.
 */
export interface AccessOffering {
  readonly providerKey: string;
  readonly providerLabelKey: string;
  readonly region: AvailabilityRegionCode;
  readonly isSubscription: boolean;
  readonly isFree: boolean;
  readonly isAdSupported: boolean;
  readonly isRent: boolean;
  readonly isBuy: boolean;
}

/**
 * A normalized external identifier a provider may use to identify a title.
 *
 * The domain does not depend on TMDB response types or TMDB service code; it
 * only knows that some titles are identified by an external id of a given
 * type (for example a TMDB id that `PersistedMedia` already stores). Future
 * providers pick the identifier types they understand.
 */
export type ExternalIdType = "tmdb";

export interface ExternalId {
  readonly type: ExternalIdType;
  readonly id: number | string;
}

/**
 * Provider-neutral identity for a title being queried for availability.
 *
 * Carries the WatchLog media type and any external identifiers the title is
 * known by, so a future provider adapter can pick the identifiers it
 * understands without the domain depending on TMDB response types or TMDB
 * service code.
 */
export interface MediaIdentity {
  readonly watchlogId?: number;
  readonly mediaType: MediaType;
  readonly externalIds: ReadonlyArray<ExternalId>;
}
/**
 * What a provider adapter is capable of. The availability service uses this
 * to decide whether to query a provider for a given title and region.
 *
 * Alongside the media-kind/region constraints it also declares the public
 * provider identity (`providerName`, optional `logoPath` and
 * `displayPriority`) that the aggregate availability result exposes through
 * `AvailabilityGroup.providers`.
 */
export interface ProviderCapability {
  readonly providerKey: ProviderKey;
  readonly providerLabelKey: ProviderLabelKey;
  readonly providerName: string;
  readonly logoPath?: string;
  readonly displayPriority?: number;
  readonly supportedMediaKinds: ReadonlyArray<MediaType>;
  readonly supportedRegions: ReadonlyArray<AvailabilityRegionCode>;
  readonly requiresNetwork: boolean;
  readonly isBestEffort: boolean;
}

/**
 * Normalized error info from a single provider.
 *
 * `resolution: "error"` is usually accompanied by an `error`, but the error
 * detail is supplementary - the `resolution` field is the primary signal.
 */
export type ProviderErrorKind =
  | "network"
  | "timeout"
  | "serviceUnavailable"
  | "rateLimited"
  | "unknown"
  | "other";

export interface ProviderErrorInfo {
  readonly providerKey: ProviderKey;
  readonly kind: ProviderErrorKind;
  readonly message?: string;
}

/**
 * Normalized result from a single provider adapter.
 *
 * Providers return already-normalized results; the availability service
 * merges several `ProviderResult`s into an aggregate `AvailabilityResult`.
 * `link` is an optional availability link the provider supplies for the
 * queried title/region; it stays optional and is never generated here.
 */
export interface ProviderResult {
  readonly providerKey: ProviderKey;
  readonly offerings: ReadonlyArray<AccessOffering>;
  readonly resolution: ProviderResolution;
  readonly error?: ProviderErrorInfo;
  readonly link?: string;
}

/**
 * Provider adapter boundary.
 *
 * The only place provider-specific response models are allowed to exist. An
 * adapter receives a provider-neutral `MediaIdentity` and an explicit region,
 * and returns an already-normalized `ProviderResult`, so neither the
 * availability service nor any future UI ever sees a provider response
 * object.
 *
 * Implementations arrive in a later milestone (A26.3). This milestone defines
 * the contract only; there are no provider network calls here.
 */
export interface ProviderAdapter {
  readonly capability: ProviderCapability;
  queryAvailability(
    identity: MediaIdentity,
    region: AvailabilityRegionCode,
  ): Promise<ProviderResult>;
}

/**
 * Provider-neutral availability query result for a title in a region.
 *
 * `groups` is the approved availability group representation of the
 * region-filtered offerings; `link` is the optional availability link taken
 * from the first provider that supplies one (absent when none does).
 */
export interface AvailabilityResult {
  readonly identity: MediaIdentity;
  readonly region: AvailabilityRegionCode;
  readonly verdict: AvailabilityVerdict;
  readonly resolution: ResolutionState;
  readonly groups: ReadonlyArray<AvailabilityGroup>;
  readonly providerResults: ReadonlyArray<ProviderResult>;
  readonly offerings: ReadonlyArray<AccessOffering>;
  readonly link?: string;
}

/**
 * Creates a validated `AccessOffering`.
 *
 * Throws when the flags do not describe exactly one cost model, when required
 * attribution fields are empty, or when the region code is invalid.
 */
export function createAccessOffering(params: {
  providerKey: string;
  providerLabelKey: string;
  region: AvailabilityRegionCode;
  isSubscription?: boolean;
  isFree?: boolean;
  isAdSupported?: boolean;
  isRent?: boolean;
  isBuy?: boolean;
}): AccessOffering {
  const isSubscription = params.isSubscription ?? false;
  const isFree = params.isFree ?? false;
  const isAdSupported = params.isAdSupported ?? false;
  const isRent = params.isRent ?? false;
  const isBuy = params.isBuy ?? false;

  const costModelCount =
    (isSubscription ? 1 : 0) +
    (isFree ? 1 : 0) +
    (isRent ? 1 : 0) +
    (isBuy ? 1 : 0);

  if (costModelCount !== 1) {
    throw new Error(
      `AccessOffering must have exactly one cost model among subscription, free, rent, buy; got ${costModelCount} true.`,
    );
  }

  if (!params.providerKey) {
    throw new Error("AccessOffering providerKey must be non-empty.");
  }
  if (!params.providerLabelKey) {
    throw new Error("AccessOffering providerLabelKey must be non-empty.");
  }
  if (!isAvailabilityRegion(params.region)) {
    throw new Error(
      `AccessOffering region is not a valid AvailabilityRegionCode: ${params.region}.`,
    );
  }

  return {
    providerKey: params.providerKey,
    providerLabelKey: params.providerLabelKey,
    region: params.region,
    isSubscription,
    isFree,
    isAdSupported,
    isRent,
    isBuy,
  };
}

/** Derived access-model checks for an offering. */
export const isOfferingSubscription = (o: AccessOffering): boolean =>
  o.isSubscription;
export const isOfferingFree = (o: AccessOffering): boolean =>
  o.isFree && !o.isAdSupported;
export const isOfferingAdSupported = (o: AccessOffering): boolean =>
  o.isFree && o.isAdSupported;
export const isOfferingRent = (o: AccessOffering): boolean => o.isRent;
export const isOfferingBuy = (o: AccessOffering): boolean => o.isBuy;

/** Canonical, deterministic order of the approved availability group types. */
const AVAILABILITY_TYPE_ORDER: ReadonlyArray<AvailabilityType> = [
  "flatrate",
  "free",
  "ads",
  "rent",
  "buy",
];

/**
 * Maps an offering onto the approved availability group types.
 *
 * The cost model maps directly (subscription -> "flatrate", free -> "free",
 * rent -> "rent", buy -> "buy") and `isAdSupported` additionally contributes
 * the "ads" type, so a free ad-supported offering is represented in both the
 * "free" and the "ads" group without losing either semantic.
 */
export function offeringAvailabilityTypes(
  offering: AccessOffering,
): ReadonlyArray<AvailabilityType> {
  const types: AvailabilityType[] = [];
  if (offering.isSubscription) {
    types.push("flatrate");
  }
  if (offering.isFree) {
    types.push("free");
  }
  if (offering.isAdSupported) {
    types.push("ads");
  }
  if (offering.isRent) {
    types.push("rent");
  }
  if (offering.isBuy) {
    types.push("buy");
  }
  return types;
}

function compareProviders(a: Provider, b: Provider): number {
  const priorityA = a.displayPriority ?? Number.MAX_SAFE_INTEGER;
  const priorityB = b.displayPriority ?? Number.MAX_SAFE_INTEGER;
  if (priorityA !== priorityB) {
    return priorityA - priorityB;
  }
  if (a.providerId === b.providerId) {
    return 0;
  }
  return a.providerId < b.providerId ? -1 : 1;
}

/**
 * Builds the approved `groups[]` representation from region-filtered
 * offerings and the declared provider metadata.
 *
 * Deterministic: groups appear in the canonical type order above, and the
 * providers of a group are deduplicated by `providerId` and ordered by
 * ascending `displayPriority` (missing priority sorts last) with
 * `providerId` as the tie-breaker. A contributing provider without declared
 * metadata falls back to a neutral minimal provider whose name is its id.
 */
export function buildAvailabilityGroups(
  offerings: ReadonlyArray<AccessOffering>,
  providers: ReadonlyArray<Provider> = [],
): ReadonlyArray<AvailabilityGroup> {
  const metadataById = new Map<ProviderKey, Provider>(
    providers.map((provider): [ProviderKey, Provider] => [
      provider.providerId,
      provider,
    ]),
  );
  const contributors = new Map<AvailabilityType, Map<ProviderKey, Provider>>();

  for (const offering of offerings) {
    const declared = metadataById.get(offering.providerKey);
    const provider: Provider = declared ?? {
      providerId: offering.providerKey,
      providerName: offering.providerKey,
    };

    for (const type of offeringAvailabilityTypes(offering)) {
      let bucket = contributors.get(type);
      if (bucket === undefined) {
        bucket = new Map<ProviderKey, Provider>();
        contributors.set(type, bucket);
      }
      if (!bucket.has(provider.providerId)) {
        bucket.set(provider.providerId, provider);
      }
    }
  }

  const groups: AvailabilityGroup[] = [];
  for (const type of AVAILABILITY_TYPE_ORDER) {
    const bucket = contributors.get(type);
    if (bucket === undefined) {
      continue;
    }
    groups.push({
      type,
      providers: [...bucket.values()].sort(compareProviders),
    });
  }
  return groups;
}

/**
 * Projects a capability's declared provider identity onto the approved public
 * `Provider` shape. The optional fields are present only when declared.
 */
export function toProvider(capability: ProviderCapability): Provider {
  return {
    providerId: capability.providerKey,
    providerName: capability.providerName,
    ...(capability.logoPath === undefined
      ? {}
      : { logoPath: capability.logoPath }),
    ...(capability.displayPriority === undefined
      ? {}
      : { displayPriority: capability.displayPriority }),
  };
}

/**
 * Returns `true` when a provider is eligible to be queried for a given
 * title's media kind in the given region.
 */
export function isEligible(
  capability: ProviderCapability,
  mediaKind: MediaType,
  region: AvailabilityRegionCode,
): boolean {
  return (
    capability.supportedMediaKinds.includes(mediaKind) &&
    capability.supportedRegions.includes(region)
  );
}
