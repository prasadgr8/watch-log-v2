import { afterEach, describe, expect, it, vi } from "vitest";

import { createAvailabilityService } from "../../domain/availability/AvailabilityService";

import { tmdbAvailabilityAdapter } from "./tmdbAvailabilityAdapter";
import { tmdbAvailabilityService } from "./tmdbAvailabilityService";
import { TmdbRequestError } from "./tmdbClient";

import type { MediaIdentity } from "../../domain/availability/types";
import type {
  TmdbWatchProvider,
  TmdbWatchProviderRegionResult,
  TmdbWatchProvidersResponse,
} from "./tmdbAvailabilityTypes";

/*
 * Deterministic tests for the A26.3 TMDB availability adapter.
 *
 * No network access: the verified TMDB availability service seam is stubbed with
 * `vi.spyOn`, matching the repository convention (the codebase has no
 * fetch-stubbing convention). Fixtures are inert strings and plain objects shaped
 * like the S1 TMDB contracts, so nothing here reaches TMDB.
 */

const MOVIE_ID = 603;
const TV_ID = 1399;
const REGION_LINK = "https://www.themoviedb.org/movie/603/watch?locale=IN";

function createProvider(
  overrides: Partial<TmdbWatchProvider> = {},
): TmdbWatchProvider {
  return {
    logo_path: "/provider-logo.png",
    provider_id: 8,
    provider_name: "Netflix",
    display_priority: 1,
    ...overrides,
  };
}

function createRegionResult(
  overrides: Partial<TmdbWatchProviderRegionResult> = {},
): TmdbWatchProviderRegionResult {
  return { link: REGION_LINK, ...overrides };
}

function createResponse(
  results: Record<string, TmdbWatchProviderRegionResult>,
  id: number = MOVIE_ID,
): TmdbWatchProvidersResponse {
  return { id, results };
}

function createIdentity(overrides: Partial<MediaIdentity> = {}): MediaIdentity {
  return {
    watchlogId: 1,
    mediaType: "movie",
    externalIds: [{ type: "tmdb", id: MOVIE_ID }],
    ...overrides,
  };
}

function mockMovieProviders(response: TmdbWatchProvidersResponse) {
  return vi
    .spyOn(tmdbAvailabilityService, "getMovieWatchProviders")
    .mockResolvedValue(response);
}

function mockMovieProvidersFailure(error: unknown) {
  return vi
    .spyOn(tmdbAvailabilityService, "getMovieWatchProviders")
    .mockRejectedValue(error);
}

function mockTvProviders(response: TmdbWatchProvidersResponse) {
  return vi
    .spyOn(tmdbAvailabilityService, "getTvWatchProviders")
    .mockResolvedValue(response);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("tmdbAvailabilityAdapter - capability metadata", () => {
  it("declares the tmdb provider identity", () => {
    expect(tmdbAvailabilityAdapter.capability.providerKey).toBe("tmdb");
    expect(tmdbAvailabilityAdapter.capability.providerLabelKey).toBe(
      "provider.tmdb",
    );
    expect(tmdbAvailabilityAdapter.capability.providerName).toBe("TMDB");
  });

  it("supports exactly the movie and TV media kinds", () => {
    expect(tmdbAvailabilityAdapter.capability.supportedMediaKinds).toEqual([
      "movie",
      "tv",
    ]);
  });

  it("supports exactly the A26.1 region catalogue", () => {
    expect(tmdbAvailabilityAdapter.capability.supportedRegions).toEqual([
      "IN",
      "US",
      "GB",
      "CA",
      "AU",
    ]);
  });

  it("declares the approved network and best-effort flags", () => {
    expect(tmdbAvailabilityAdapter.capability.requiresNetwork).toBe(true);
    expect(tmdbAvailabilityAdapter.capability.isBestEffort).toBe(true);
  });

  it("carries no per-provider display metadata (deferred under Option A)", () => {
    const capability = tmdbAvailabilityAdapter.capability;

    expect("logoPath" in capability).toBe(false);
    expect("displayPriority" in capability).toBe(false);
  });
});

describe("tmdbAvailabilityAdapter - TMDB id extraction", () => {
  it("uses the ExternalIdType.tmdb identity value", async () => {
    const getMovieWatchProviders = mockMovieProviders(
      createResponse({ IN: createRegionResult() }),
    );

    await tmdbAvailabilityAdapter.queryAvailability(createIdentity(), "IN");

    expect(getMovieWatchProviders).toHaveBeenCalledWith(MOVIE_ID);
  });

  it("accepts a numeric TMDB id stored as a string", async () => {
    const getMovieWatchProviders = mockMovieProviders(
      createResponse({ IN: createRegionResult() }),
    );

    await tmdbAvailabilityAdapter.queryAvailability(
      createIdentity({ externalIds: [{ type: "tmdb", id: String(MOVIE_ID) }] }),
      "IN",
    );

    expect(getMovieWatchProviders).toHaveBeenCalledWith(MOVIE_ID);
  });

  const invalidIdentityCases: ReadonlyArray<{
    label: string;
    externalIds: MediaIdentity["externalIds"];
  }> = [
    { label: "no external ids", externalIds: [] },
    { label: "a zero id", externalIds: [{ type: "tmdb", id: 0 }] },
    { label: "a negative id", externalIds: [{ type: "tmdb", id: -12 }] },
    { label: "a non-integer id", externalIds: [{ type: "tmdb", id: 6.5 }] },
    {
      label: "a non-numeric id",
      externalIds: [{ type: "tmdb", id: "unknown" }],
    },
  ];

  for (const { label, externalIds } of invalidIdentityCases) {
    it(`reports a provider-level error for ${label} instead of throwing`, async () => {
      const getMovieWatchProviders = mockMovieProviders(
        createResponse({ IN: createRegionResult() }),
      );

      const result = await tmdbAvailabilityAdapter.queryAvailability(
        createIdentity({ externalIds }),
        "IN",
      );

      expect(result.resolution).toBe("error");
      expect(result.providerKey).toBe("tmdb");
      expect(result.offerings).toEqual([]);
      expect(result.error).toEqual({
        providerKey: "tmdb",
        kind: "other",
        message: expect.any(String),
      });
      expect(getMovieWatchProviders).not.toHaveBeenCalled();
    });
  }
});

describe("tmdbAvailabilityAdapter - movie/TV branching", () => {
  it("queries the movie watch-provider method for a movie identity", async () => {
    const getMovieWatchProviders = mockMovieProviders(
      createResponse({ IN: createRegionResult() }),
    );
    const getTvWatchProviders = mockTvProviders(
      createResponse({ IN: createRegionResult() }, TV_ID),
    );

    await tmdbAvailabilityAdapter.queryAvailability(
      createIdentity({ mediaType: "movie" }),
      "IN",
    );

    expect(getMovieWatchProviders).toHaveBeenCalledTimes(1);
    expect(getMovieWatchProviders).toHaveBeenCalledWith(MOVIE_ID);
    expect(getTvWatchProviders).not.toHaveBeenCalled();
  });

  it("queries the TV watch-provider method for a TV identity", async () => {
    const getMovieWatchProviders = mockMovieProviders(
      createResponse({ IN: createRegionResult() }),
    );
    const getTvWatchProviders = mockTvProviders(
      createResponse({ IN: createRegionResult() }, TV_ID),
    );

    await tmdbAvailabilityAdapter.queryAvailability(
      createIdentity({
        mediaType: "tv",
        externalIds: [{ type: "tmdb", id: TV_ID }],
      }),
      "IN",
    );

    expect(getTvWatchProviders).toHaveBeenCalledTimes(1);
    expect(getTvWatchProviders).toHaveBeenCalledWith(TV_ID);
    expect(getMovieWatchProviders).not.toHaveBeenCalled();
  });
});

describe("tmdbAvailabilityAdapter - region selection", () => {
  it("selects results[requestedRegion] and ignores other regions", async () => {
    mockMovieProviders(
      createResponse({
        IN: createRegionResult({
          flatrate: [createProvider({ provider_id: 8 })],
        }),
        US: createRegionResult({
          flatrate: [createProvider({ provider_id: 9 })],
        }),
      }),
    );

    const result = await tmdbAvailabilityAdapter.queryAvailability(
      createIdentity(),
      "US",
    );

    expect(result.offerings.map((offering) => offering.providerKey)).toEqual([
      "tmdb:9",
    ]);
    expect(result.offerings[0]?.region).toBe("US");
  });

  it("passes only the TMDB id to the service (no region query parameter)", async () => {
    const getMovieWatchProviders = mockMovieProviders(
      createResponse({ IN: createRegionResult() }),
    );

    await tmdbAvailabilityAdapter.queryAvailability(createIdentity(), "IN");

    expect(getMovieWatchProviders.mock.calls[0]).toEqual([MOVIE_ID]);
  });

  it("resolves empty availability when TMDB omits the requested region", async () => {
    mockMovieProviders(
      createResponse({
        US: createRegionResult({
          flatrate: [createProvider({ provider_id: 9 })],
        }),
      }),
    );

    const result = await tmdbAvailabilityAdapter.queryAvailability(
      createIdentity(),
      "IN",
    );

    expect(result.resolution).toBe("resolved");
    expect(result.offerings).toEqual([]);
    expect(result.error).toBeUndefined();
    expect("link" in result).toBe(false);
  });

  it("resolves empty availability with the regional link when the region has no provider arrays", async () => {
    mockMovieProviders(createResponse({ IN: createRegionResult() }));

    const result = await tmdbAvailabilityAdapter.queryAvailability(
      createIdentity(),
      "IN",
    );

    expect(result.resolution).toBe("resolved");
    expect(result.offerings).toEqual([]);
    expect(result.link).toBe(REGION_LINK);
  });

  it("selects the requested region out of every supported region", async () => {
    const regions = ["IN", "US", "GB", "CA", "AU"] as const;
    const results: Record<string, TmdbWatchProviderRegionResult> = {};

    for (const region of regions) {
      results[region] = createRegionResult({
        flatrate: [createProvider({ provider_id: 8 })],
      });
    }

    mockMovieProviders(createResponse(results));

    for (const region of regions) {
      const result = await tmdbAvailabilityAdapter.queryAvailability(
        createIdentity(),
        region,
      );

      expect(result.offerings.map((offering) => offering.region)).toEqual([
        region,
      ]);
    }
  });
});

describe("tmdbAvailabilityAdapter - monetization mapping", () => {
  it("maps flatrate to a subscription offering", async () => {
    mockMovieProviders(
      createResponse({
        IN: createRegionResult({
          flatrate: [createProvider({ provider_id: 8 })],
        }),
      }),
    );

    const result = await tmdbAvailabilityAdapter.queryAvailability(
      createIdentity(),
      "IN",
    );

    expect(result.offerings).toEqual([
      {
        providerKey: "tmdb:8",
        providerLabelKey: "provider.tmdb.8",
        region: "IN",
        isSubscription: true,
        isFree: false,
        isAdSupported: false,
        isRent: false,
        isBuy: false,
      },
    ]);
  });

  it("maps free to a free offering", async () => {
    mockMovieProviders(
      createResponse({
        IN: createRegionResult({
          free: [createProvider({ provider_id: 15 })],
        }),
      }),
    );

    const result = await tmdbAvailabilityAdapter.queryAvailability(
      createIdentity(),
      "IN",
    );

    expect(result.offerings).toEqual([
      {
        providerKey: "tmdb:15",
        providerLabelKey: "provider.tmdb.15",
        region: "IN",
        isSubscription: false,
        isFree: true,
        isAdSupported: false,
        isRent: false,
        isBuy: false,
      },
    ]);
  });

  it("maps ads to a free ad-supported offering", async () => {
    mockMovieProviders(
      createResponse({
        IN: createRegionResult({
          ads: [createProvider({ provider_id: 68 })],
        }),
      }),
    );

    const result = await tmdbAvailabilityAdapter.queryAvailability(
      createIdentity(),
      "IN",
    );

    expect(result.offerings).toEqual([
      {
        providerKey: "tmdb:68",
        providerLabelKey: "provider.tmdb.68",
        region: "IN",
        isSubscription: false,
        isFree: true,
        isAdSupported: true,
        isRent: false,
        isBuy: false,
      },
    ]);
  });

  it("maps rent to a rental offering", async () => {
    mockMovieProviders(
      createResponse({
        IN: createRegionResult({
          rent: [createProvider({ provider_id: 2 })],
        }),
      }),
    );

    const result = await tmdbAvailabilityAdapter.queryAvailability(
      createIdentity(),
      "IN",
    );

    expect(result.offerings).toEqual([
      {
        providerKey: "tmdb:2",
        providerLabelKey: "provider.tmdb.2",
        region: "IN",
        isSubscription: false,
        isFree: false,
        isAdSupported: false,
        isRent: true,
        isBuy: false,
      },
    ]);
  });

  it("maps buy to a purchase offering", async () => {
    mockMovieProviders(
      createResponse({
        IN: createRegionResult({
          buy: [createProvider({ provider_id: 3 })],
        }),
      }),
    );

    const result = await tmdbAvailabilityAdapter.queryAvailability(
      createIdentity(),
      "IN",
    );

    expect(result.offerings).toEqual([
      {
        providerKey: "tmdb:3",
        providerLabelKey: "provider.tmdb.3",
        region: "IN",
        isSubscription: false,
        isFree: false,
        isAdSupported: false,
        isRent: false,
        isBuy: true,
      },
    ]);
  });

  it("creates one offering per provider in the selected region", async () => {
    mockMovieProviders(
      createResponse({
        IN: createRegionResult({
          flatrate: [
            createProvider({ provider_id: 8 }),
            createProvider({ provider_id: 9, provider_name: "Prime Video" }),
          ],
          rent: [createProvider({ provider_id: 10, provider_name: "Apple TV" })],
        }),
      }),
    );

    const result = await tmdbAvailabilityAdapter.queryAvailability(
      createIdentity(),
      "IN",
    );

    // The implementation guarantees a deterministic order: TMDB access-type
    // order (flatrate, free, ads, rent, buy) with providers in TMDB array order.
    expect(result.offerings.map((offering) => offering.providerKey)).toEqual([
      "tmdb:8",
      "tmdb:9",
      "tmdb:10",
    ]);
  });

  it("preserves the TMDB regional link on the provider result", async () => {
    mockMovieProviders(
      createResponse({
        IN: createRegionResult({
          flatrate: [createProvider({ provider_id: 8 })],
        }),
      }),
    );

    const result = await tmdbAvailabilityAdapter.queryAvailability(
      createIdentity(),
      "IN",
    );

    expect(result.providerKey).toBe("tmdb");
    expect(result.resolution).toBe("resolved");
    expect(result.link).toBe(REGION_LINK);
  });

  it("does not leak deferred provider display metadata into offerings", async () => {
    mockMovieProviders(
      createResponse({
        IN: createRegionResult({
          flatrate: [
            createProvider({
              provider_id: 8,
              provider_name: "Netflix",
              logo_path: "/netflix-logo.png",
              display_priority: 3,
            }),
          ],
        }),
      }),
    );

    const result = await tmdbAvailabilityAdapter.queryAvailability(
      createIdentity(),
      "IN",
    );
    const offering = result.offerings[0];

    expect(offering).toBeDefined();
    expect(offering).not.toHaveProperty("providerName");
    expect(offering).not.toHaveProperty("logoPath");
    expect(offering).not.toHaveProperty("displayPriority");
  });
});

describe("tmdbAvailabilityAdapter - multi-group providers", () => {
  it("keeps every access model of a provider that appears in several groups", async () => {
    mockMovieProviders(
      createResponse({
        IN: createRegionResult({
          flatrate: [createProvider({ provider_id: 8 })],
          rent: [createProvider({ provider_id: 8 })],
        }),
      }),
    );

    const result = await tmdbAvailabilityAdapter.queryAvailability(
      createIdentity(),
      "IN",
    );

    expect(result.offerings.map((offering) => offering.providerKey)).toEqual([
      "tmdb:8",
      "tmdb:8",
    ]);
    expect(result.offerings.map((offering) => offering.isSubscription)).toEqual([
      true,
      false,
    ]);
    expect(result.offerings.map((offering) => offering.isRent)).toEqual([
      false,
      true,
    ]);
  });

  it("emits a provider listed twice within one group only once", async () => {
    mockMovieProviders(
      createResponse({
        IN: createRegionResult({
          flatrate: [
            createProvider({ provider_id: 8 }),
            createProvider({ provider_id: 8, display_priority: 5 }),
          ],
        }),
      }),
    );

    const result = await tmdbAvailabilityAdapter.queryAvailability(
      createIdentity(),
      "IN",
    );

    expect(result.offerings).toHaveLength(1);
    expect(result.offerings[0]?.providerKey).toBe("tmdb:8");
  });

  it("keeps the free and ad-supported models of one provider distinct", async () => {
    mockMovieProviders(
      createResponse({
        IN: createRegionResult({
          free: [createProvider({ provider_id: 8 })],
          ads: [createProvider({ provider_id: 8 })],
        }),
      }),
    );

    const result = await tmdbAvailabilityAdapter.queryAvailability(
      createIdentity(),
      "IN",
    );

    expect(result.offerings).toHaveLength(2);
    expect(
      result.offerings.map((offering) => offering.isAdSupported),
    ).toEqual([false, true]);
    expect(result.offerings.every((offering) => offering.isFree)).toBe(true);
  });

  it("maps every access type of a fully populated region result", async () => {
    mockMovieProviders(
      createResponse({
        IN: createRegionResult({
          flatrate: [createProvider({ provider_id: 8 })],
          free: [createProvider({ provider_id: 15 })],
          ads: [createProvider({ provider_id: 68 })],
          rent: [createProvider({ provider_id: 2 })],
          buy: [createProvider({ provider_id: 3 })],
        }),
      }),
    );

    const result = await tmdbAvailabilityAdapter.queryAvailability(
      createIdentity(),
      "IN",
    );

    expect(result.offerings.map((offering) => offering.providerKey)).toEqual([
      "tmdb:8",
      "tmdb:15",
      "tmdb:68",
      "tmdb:2",
      "tmdb:3",
    ]);
  });
});

describe("tmdbAvailabilityAdapter - optional and empty provider data", () => {
  it("contributes no offerings for absent access-type arrays", async () => {
    mockMovieProviders(createResponse({ IN: createRegionResult() }));

    const result = await tmdbAvailabilityAdapter.queryAvailability(
      createIdentity(),
      "IN",
    );

    expect(result.resolution).toBe("resolved");
    expect(result.offerings).toEqual([]);
    expect(result.error).toBeUndefined();
  });

  it("contributes no offerings for empty access-type arrays", async () => {
    mockMovieProviders(
      createResponse({
        IN: createRegionResult({
          flatrate: [],
          free: [],
          ads: [],
          rent: [],
          buy: [],
        }),
      }),
    );

    const result = await tmdbAvailabilityAdapter.queryAvailability(
      createIdentity(),
      "IN",
    );

    expect(result.resolution).toBe("resolved");
    expect(result.offerings).toEqual([]);
    expect(result.error).toBeUndefined();
  });

  it("maps only the populated arrays of a partially populated region result", async () => {
    mockMovieProviders(
      createResponse({
        IN: createRegionResult({
          flatrate: [],
          rent: [createProvider({ provider_id: 2 })],
        }),
      }),
    );

    const result = await tmdbAvailabilityAdapter.queryAvailability(
      createIdentity(),
      "IN",
    );

    expect(result.offerings.map((offering) => offering.providerKey)).toEqual([
      "tmdb:2",
    ]);
  });
});

describe("tmdbAvailabilityAdapter - error mapping", () => {
  it("resolves a 404 as empty availability instead of a provider error", async () => {
    const getMovieWatchProviders = mockMovieProvidersFailure(
      new TmdbRequestError("TMDB request failed with status 404.", 404),
    );

    const result = await tmdbAvailabilityAdapter.queryAvailability(
      createIdentity(),
      "IN",
    );

    expect(result.providerKey).toBe("tmdb");
    expect(result.resolution).toBe("resolved");
    expect(result.offerings).toEqual([]);
    expect(result.error).toBeUndefined();
    expect("link" in result).toBe(false);
    expect(getMovieWatchProviders).toHaveBeenCalledTimes(1);
  });

  it("maps a 429 to the rateLimited provider error", async () => {
    const failure = new TmdbRequestError(
      "TMDB request failed with status 429.",
      429,
    );
    const getMovieWatchProviders = mockMovieProvidersFailure(failure);

    const result = await tmdbAvailabilityAdapter.queryAvailability(
      createIdentity(),
      "IN",
    );

    expect(result.providerKey).toBe("tmdb");
    expect(result.resolution).toBe("error");
    expect(result.offerings).toEqual([]);
    expect(result.error).toEqual({
      providerKey: "tmdb",
      kind: "rateLimited",
      message: failure.message,
    });
    expect(getMovieWatchProviders).toHaveBeenCalledTimes(1);
  });

  for (const status of [500, 502, 503, 504]) {
    it(`maps a ${status} to the serviceUnavailable provider error`, async () => {
      const failure = new TmdbRequestError(
        `TMDB request failed with status ${status}.`,
        status,
      );
      mockMovieProvidersFailure(failure);

      const result = await tmdbAvailabilityAdapter.queryAvailability(
        createIdentity(),
        "IN",
      );

      expect(result.providerKey).toBe("tmdb");
      expect(result.resolution).toBe("error");
      expect(result.offerings).toEqual([]);
      expect(result.error).toEqual({
        providerKey: "tmdb",
        kind: "serviceUnavailable",
        message: failure.message,
      });
    });
  }

  for (const status of [400, 401, 403, 422]) {
    it(`maps a ${status} to the generic other provider error`, async () => {
      const failure = new TmdbRequestError(
        `TMDB request failed with status ${status}.`,
        status,
      );
      mockMovieProvidersFailure(failure);

      const result = await tmdbAvailabilityAdapter.queryAvailability(
        createIdentity(),
        "IN",
      );

      expect(result.resolution).toBe("error");
      expect(result.offerings).toEqual([]);
      expect(result.error).toEqual({
        providerKey: "tmdb",
        kind: "other",
        message: failure.message,
      });
    });
  }

  it("maps a failed fetch that is not a TmdbRequestError to the network provider error", async () => {
    mockMovieProvidersFailure(new TypeError("Failed to fetch"));

    const result = await tmdbAvailabilityAdapter.queryAvailability(
      createIdentity(),
      "IN",
    );

    expect(result.providerKey).toBe("tmdb");
    expect(result.resolution).toBe("error");
    expect(result.offerings).toEqual([]);
    expect(result.error).toEqual({
      providerKey: "tmdb",
      kind: "network",
      message: "Failed to fetch",
    });
  });

  it("omits the error message when a non-Error value is rejected", async () => {
    mockMovieProvidersFailure("connection reset");

    const result = await tmdbAvailabilityAdapter.queryAvailability(
      createIdentity(),
      "IN",
    );

    expect(result.error).toEqual({ providerKey: "tmdb", kind: "network" });
  });

  it("returns no offerings and no link for a provider error", async () => {
    mockMovieProvidersFailure(
      new TmdbRequestError("TMDB request failed with status 429.", 429),
    );

    const result = await tmdbAvailabilityAdapter.queryAvailability(
      createIdentity(),
      "IN",
    );

    expect(result.offerings).toEqual([]);
    expect("link" in result).toBe(false);
  });
});

describe("tmdbAvailabilityAdapter - retry and timeout boundaries", () => {
  it("performs exactly one TMDB service call and never retries a failed query", async () => {
    const getMovieWatchProviders = mockMovieProvidersFailure(
      new TmdbRequestError("TMDB request failed with status 503.", 503),
    );

    await tmdbAvailabilityAdapter.queryAvailability(createIdentity(), "IN");

    expect(getMovieWatchProviders).toHaveBeenCalledTimes(1);
  });

  it("adds no timers of its own (timeout stays outside the adapter)", async () => {
    vi.useFakeTimers();

    try {
      mockMovieProviders(createResponse({ IN: createRegionResult() }));

      await tmdbAvailabilityAdapter.queryAvailability(createIdentity(), "IN");

      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("tmdbAvailabilityAdapter - malformed and partial payloads (S5 caveat)", () => {
  it("maps the groups present in a partial region result and ignores the rest", async () => {
    mockMovieProviders(
      createResponse({
        IN: {
          link: REGION_LINK,
          flatrate: [createProvider({ provider_id: 8 })],
        },
      }),
    );

    const result = await tmdbAvailabilityAdapter.queryAvailability(
      createIdentity(),
      "IN",
    );

    expect(result.resolution).toBe("resolved");
    expect(result.offerings.map((offering) => offering.providerKey)).toEqual([
      "tmdb:8",
    ]);
    expect(result.link).toBe(REGION_LINK);
  });

  it("rejects a payload without a results object instead of inventing availability", async () => {
    // No runtime response validation exists (S5 caveat): `response.results[region]`
    // is evaluated outside the guarded request block, so a payload without
    // `results` rejects with a TypeError instead of being misreported as a
    // provider network failure. The availability service normalizes rejections
    // (see the integration tests below), so no uncaught exception escapes it and
    // no availability data is fabricated.
    const getMovieWatchProviders = mockMovieProviders(
      { id: MOVIE_ID } as unknown as TmdbWatchProvidersResponse,
    );

    await expect(
      tmdbAvailabilityAdapter.queryAvailability(createIdentity(), "IN"),
    ).rejects.toBeInstanceOf(TypeError);
    expect(getMovieWatchProviders).toHaveBeenCalledTimes(1);
  });

  it("documents that provider entries are not field-validated (flagged for review)", async () => {
    // Observed behavior for an entry without `provider_id`: no field validation
    // exists, so the offering key is derived from the missing id. This is the
    // residual robustness gap recorded in the S5 caveat and is documented here
    // rather than patched, because S6 is test-only and the repository has no
    // runtime validation convention. The adapter still invents no availability:
    // the offering comes from the payload's own access-type group.
    mockMovieProviders(
      createResponse({
        IN: createRegionResult({
          flatrate: [{} as unknown as TmdbWatchProvider],
        }),
      }),
    );

    const result = await tmdbAvailabilityAdapter.queryAvailability(
      createIdentity(),
      "IN",
    );

    expect(result.offerings.map((offering) => offering.providerKey)).toEqual([
      "tmdb:undefined",
    ]);
  });
});

describe("tmdbAvailabilityAdapter - integration with the availability service", () => {
  it("produces an available verdict with the mapped providers for a resolvable title", async () => {
    mockMovieProviders(
      createResponse({
        IN: createRegionResult({
          flatrate: [
            createProvider({ provider_id: 8, provider_name: "Netflix" }),
          ],
        }),
      }),
    );
    const availabilityService = createAvailabilityService(
      [tmdbAvailabilityAdapter],
      { isOnline: () => true },
    );

    const result = await availabilityService.getAvailability(
      createIdentity(),
      "IN",
    );

    expect(result.verdict).toBe("available");
    expect(result.resolution).toBe("resolved");
    expect(result.offerings.map((offering) => offering.providerKey)).toEqual([
      "tmdb:8",
    ]);
    expect(result.groups.map((group) => group.type)).toEqual(["flatrate"]);
    expect(result.link).toBe(REGION_LINK);
    // Option A consequence: per-provider display metadata has no channel, so an
    // undeclared provider is exposed with its offering key as the name.
    expect(result.groups[0]?.providers).toEqual([
      { providerId: "tmdb:8", providerName: "tmdb:8" },
    ]);
  });

  it("reports a definitive unavailable verdict when TMDB lists no providers for the region", async () => {
    mockMovieProviders(
      createResponse({
        US: createRegionResult({
          flatrate: [createProvider({ provider_id: 9 })],
        }),
      }),
    );
    const availabilityService = createAvailabilityService(
      [tmdbAvailabilityAdapter],
      { isOnline: () => true },
    );

    const result = await availabilityService.getAvailability(
      createIdentity(),
      "IN",
    );

    expect(result.verdict).toBe("unavailable");
    expect(result.resolution).toBe("resolved");
    expect(result.offerings).toEqual([]);
    expect(result.groups).toEqual([]);
  });

  it("normalizes a malformed-payload rejection into a provider error result", async () => {
    mockMovieProviders(
      { id: MOVIE_ID } as unknown as TmdbWatchProvidersResponse,
    );
    const availabilityService = createAvailabilityService(
      [tmdbAvailabilityAdapter],
      { isOnline: () => true },
    );

    const result = await availabilityService.getAvailability(
      createIdentity(),
      "IN",
    );

    expect(result.verdict).toBe("unknown");
    expect(result.resolution).toBe("error");
    expect(result.offerings).toEqual([]);
    expect(result.groups).toEqual([]);
    expect(result.providerResults).toEqual([
      {
        providerKey: "tmdb",
        offerings: [],
        resolution: "error",
        error: {
          providerKey: "tmdb",
          kind: "other",
          message: expect.any(String),
        },
      },
    ]);
  });
});
