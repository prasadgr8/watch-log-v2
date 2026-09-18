import { createAvailabilityService } from "../../domain/availability/AvailabilityService";
import type {
  AvailabilityRegionCode,
  AvailabilityResult,
  MediaIdentity,
} from "../../domain/availability/types";
import { tmdbAvailabilityAdapter } from "../tmdb";

import type { Media } from "../../types/media";

export interface GetAvailabilityForMediaOptions {
  isOnline?: () => boolean;
  queryTimeoutMs?: number;
}

/**
 * Application availability service (A26.4).
 *
 * Thin wiring between stored WatchLog media and the provider-neutral
 * availability domain. It builds a `MediaIdentity` from the given media,
 * composes the existing domain service with the verified TMDB provider
 * adapter, and returns the domain `AvailabilityResult` unchanged.
 *
 * The region is an explicit caller-supplied `AvailabilityRegionCode` and is
 * forwarded unchanged. Optional `isOnline` and `queryTimeoutMs` are forwarded
 * unchanged when supplied; otherwise the existing domain defaults apply.
 */
export function getAvailabilityForMedia(
  media: Media,
  region: AvailabilityRegionCode,
  options?: GetAvailabilityForMediaOptions,
): Promise<AvailabilityResult> {
  const identity: MediaIdentity = {
    watchlogId: media.id,
    mediaType: media.mediaType,
    externalIds:
      media.tmdbId !== undefined
        ? [{ type: "tmdb", id: media.tmdbId }]
        : [],
  };

  const service = createAvailabilityService([tmdbAvailabilityAdapter], {
    isOnline: options?.isOnline,
    queryTimeoutMs: options?.queryTimeoutMs,
  });

  return service.getAvailability(identity, region);
}
