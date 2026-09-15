/**
 * Provider-neutral availability service boundary.
 *
 * The service accepts a title identity and an explicit region (from the A26.1
 * region preference), selects eligible providers using their declared
 * capabilities, queries them in parallel, and merges the normalized results
 * into an aggregate `AvailabilityResult` - including the approved
 * `groups[]` representation and the optional provider-supplied `link`.
 *
 * No network calls are made by this module. Real providers are supplied by
 * `ProviderAdapter` implementations passed into the service (a later
 * milestone). This module only establishes the contract and the deterministic
 * merge behavior.
 */

import type {
  AvailabilityRegionCode,
  AvailabilityResult,
  AvailabilityVerdict,
  MediaIdentity,
  Provider,
  ProviderAdapter,
  ProviderResult,
  ResolutionState,
} from "./types";
import { buildAvailabilityGroups, isEligible, toProvider } from "./types";
import { isAvailabilityRegion } from "../../features/settings/region/availabilityRegion";

/** Default online check using the browser's navigator.onLine. */
function defaultIsOnline(): boolean {
  if (typeof navigator === "undefined") {
    return true; // non-browser environments: assume online
  }
  return navigator.onLine;
}

/**
 * Wraps a provider query with a per-provider timeout.
 *
 * On timeout, the returned promise rejects with a `QueryTimeoutError`, which
 * the service maps to a provider result with `resolution: "error"` and
 * `error.kind: "timeout"`. When the underlying query settles before the
 * timeout, the pending timer is cleared so no timer outlives the query. The
 * externally observable timeout/error contract is unchanged.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((_resolve, reject) => {
    timer = setTimeout(() => reject(new QueryTimeoutError(ms)), ms);
  });
  const guarded = promise.then(
    (value) => {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
      return value;
    },
    (reason) => {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
      throw reason;
    },
  );
  return Promise.race([guarded, timeout]);
}

/** Error used only to signal a per-provider query timeout internally. */
class QueryTimeoutError extends Error {
  constructor(ms: number) {
    super(`Provider query timed out after ${ms}ms.`);
    this.name = "QueryTimeoutError";
  }
}
/**
 * Pure merge of per-provider results into an aggregate availability result.
 *
 * Deterministic and side-effect free. Does not perform any network calls.
 *
 * Verdict semantics:
 * - "available"   - at least one provider confirmed the title is available
 *                    (a resolved or partial result with at least one offering
 *                    for the requested region).
 * - "unavailable" - providers that answered definitively (resolved, no errors,
 *                    no partials) all reported empty offerings for the region.
 * - "unknown"     - the lookup could not determine availability: no eligible
 *                    providers, provider failures, or inconclusive partial
 *                    results.
 *
 * Resolution semantics:
 * - "resolved" - a complete, definitive answer was produced.
 * - "partial"  - the answer may be incomplete (some providers did not fully
 *                 cover the title/region, or some failed while others
 *                 answered).
 * - "offline"  - the service is offline and could not query any provider.
 * - "error"    - a failure prevented a complete answer (provider errors with
 *                 no partial results to fall back on).
 *
 * Group/link semantics:
 * - `groups` - the approved availability group representation, derived from
 *              the region-filtered offerings and the declared provider
 *              metadata (deterministic canonical type order and provider
 *              ordering; see `buildAvailabilityGroups`).
 * - `link`   - the optional availability link, taken as the first
 *              provider-supplied link in provider order. Absent when no
 *              provider supplies one.
 */
export function resolveAvailability(
  identity: MediaIdentity,
  region: AvailabilityRegionCode,
  providerResults: ReadonlyArray<ProviderResult>,
  providers: ReadonlyArray<Provider> = [],
): AvailabilityResult {
  const offerings = providerResults
    .flatMap((r) => r.offerings)
    .filter((o) => o.region === region);
  const groups = buildAvailabilityGroups(offerings, providers);
  const answered = providerResults.filter(
    (r) => r.resolution === "resolved" || r.resolution === "partial",
  );
  const inconclusive = providerResults.filter(
    (r) => r.resolution === "partial",
  );
  const failed = providerResults.filter(
    (r) => r.resolution === "error" || r.resolution === "offline",
  );

  let verdict: AvailabilityVerdict;
  let resolution: ResolutionState;

  if (offerings.length > 0) {
    verdict = "available";
    resolution =
      failed.length > 0 || inconclusive.length > 0 ? "partial" : "resolved";
  } else if (providerResults.length === 0) {
    verdict = "unknown";
    resolution = "resolved";
  } else if (answered.length === 0) {
    verdict = "unknown";
    resolution = failed.every((r) => r.resolution === "offline")
      ? "offline"
      : "error";
  } else if (failed.length > 0 || inconclusive.length > 0) {
    verdict = "unknown";
    resolution = "partial";
  } else {
    verdict = "unavailable";
    resolution = "resolved";
  }

  const link = providerResults
    .map((r) => r.link)
    .find((value) => value !== undefined);
  const result: AvailabilityResult = {
    identity,
    region,
    verdict,
    resolution,
    groups,
    providerResults: providerResults.slice(),
    offerings,
  };

  return link === undefined ? result : { ...result, link };
}

/**
 * Provider-neutral availability service.
 */
export interface AvailabilityService {
  /**
   * Looks up availability for a title in a region.
   *
   * `region` must be a valid `AvailabilityRegionCode` (as produced by the
   * A26.1 region preference). The service does not detect or infer the
   * region.
   */
  getAvailability(
    identity: MediaIdentity,
    region: AvailabilityRegionCode,
  ): Promise<AvailabilityResult>;
}

export interface CreateAvailabilityServiceOptions {
  /**
   * Injected online check. Defaults to `navigator.onLine` in browsers and
   * `true` in non-browser environments.
   */
  isOnline?: () => boolean;
  /**
   * Per-adapter query timeout in milliseconds. When `undefined` or `<= 0`,
   * no timeout is applied (useful for deterministic tests).
   */
  queryTimeoutMs?: number;
}

/**
 * Creates a provider-neutral availability service backed by the given
 * adapters.
 *
 * The service:
 * 1. optionally checks online status (injected or navigator.onLine),
 * 2. selects adapters eligible for the identity's media kind and the given
 *    region,
 * 3. queries eligible adapters in parallel with a per-adapter timeout,
 * 4. maps each outcome to a normalized `ProviderResult`,
 * 5. merges them into an aggregate `AvailabilityResult` via
 *    `resolveAvailability`, passing the eligible adapters' declared provider
 *    identity so the result can expose the approved `groups[]`.
 */
export function createAvailabilityService(
  adapters: ReadonlyArray<ProviderAdapter>,
  options?: CreateAvailabilityServiceOptions,
): AvailabilityService {
  const isOnline = options?.isOnline ?? defaultIsOnline;
  const queryTimeoutMs = options?.queryTimeoutMs;

  return {
    getAvailability: async (identity, region) => {
      if (!isAvailabilityRegion(region)) {
        throw new Error(
          `AvailabilityService.getAvailability: region is not a valid AvailabilityRegionCode: ${region}.`,
        );
      }

      if (!isOnline()) {
        return {
          identity,
          region,
          verdict: "unknown",
          resolution: "offline",
          groups: [],
          providerResults: [],
          offerings: [],
        };
      }

      const eligible = adapters.filter((adapter) =>
        isEligible(adapter.capability, identity.mediaType, region),
      );

      if (eligible.length === 0) {
        return resolveAvailability(identity, region, []);
      }

      const providers = eligible.map((adapter) =>
        toProvider(adapter.capability),
      );

      const queries = eligible.map((adapter) => {
        const base = adapter.queryAvailability(identity, region);
        return queryTimeoutMs && queryTimeoutMs > 0
          ? withTimeout(base, queryTimeoutMs)
          : base;
      });

      const settled = await Promise.allSettled(queries);

      const providerResults: ProviderResult[] = settled.map((result, index) => {
        if (result.status === "fulfilled") {
          return result.value;
        }
        const adapter = eligible[index];
        const capability = adapter.capability;
        const isTimeout = result.reason instanceof QueryTimeoutError;
        return {
          providerKey: capability.providerKey,
          offerings: [],
          resolution: "error",
          error: {
            providerKey: capability.providerKey,
            kind: isTimeout ? "timeout" : "other",
            message: result.reason?.message,
          },
        };
      });

      return resolveAvailability(identity, region, providerResults, providers);
    },
  };
}
