import { describe, expect, it, vi } from "vitest";

import {
  createAvailabilityService,
  resolveAvailability,
} from "./AvailabilityService";
import {
  buildAvailabilityGroups,
  createAccessOffering,
  isEligible,
  isOfferingAdSupported,
  isOfferingBuy,
  isOfferingFree,
  isOfferingRent,
  isOfferingSubscription,
  toProvider,
  type AccessOffering,
  type AvailabilityRegionCode,
  type MediaIdentity,
  type ProviderAdapter,
  type ProviderCapability,
  type ProviderErrorKind,
  type ProviderResult,
} from "./types";

/*
 * Deterministic tests for the provider-neutral availability domain.
 *
 * No network access, no provider implementations, and no persistence: every
 * adapter below is an in-test fake, and the link fixtures are inert strings.
 * Real timers are used only for the short timeout contract test; the timeout
 * hygiene test runs on fake timers.
 */

const ALL_REGIONS: ReadonlyArray<AvailabilityRegionCode> = [
  "IN",
  "US",
  "GB",
  "CA",
  "AU",
];

function makeOffering(
  params: {
    providerKey?: string;
    providerLabelKey?: string;
    region?: AvailabilityRegionCode;
    isSubscription?: boolean;
    isFree?: boolean;
    isAdSupported?: boolean;
    isRent?: boolean;
    isBuy?: boolean;
  } = {},
): AccessOffering {
  return createAccessOffering({
    providerKey: "alpha",
    providerLabelKey: "alpha.name",
    region: "IN",
    isSubscription: true,
    ...params,
  });
}

function resolved(
  providerKey: string,
  offerings: ReadonlyArray<AccessOffering> = [],
): ProviderResult {
  return { providerKey, offerings, resolution: "resolved" };
}

function partial(
  providerKey: string,
  offerings: ReadonlyArray<AccessOffering> = [],
): ProviderResult {
  return { providerKey, offerings, resolution: "partial" };
}

function failed(
  providerKey: string,
  kind: ProviderErrorKind = "other",
): ProviderResult {
  return {
    providerKey,
    offerings: [],
    resolution: "error",
    error: { providerKey, kind },
  };
}

function offlineResult(providerKey: string): ProviderResult {
  return { providerKey, offerings: [], resolution: "offline" };
}

function capability(
  overrides: Partial<ProviderCapability> = {},
): ProviderCapability {
  return {
    providerKey: "alpha",
    providerLabelKey: "alpha.name",
    providerName: "Alpha Streaming",
    supportedMediaKinds: ["movie", "tv"],
    supportedRegions: ALL_REGIONS,
    requiresNetwork: true,
    isBestEffort: false,
    ...overrides,
  };
}

function adapter(
  capabilityValue: ProviderCapability,
  query: (
    identity: MediaIdentity,
    region: AvailabilityRegionCode,
  ) => Promise<ProviderResult>,
): ProviderAdapter {
  return { capability: capabilityValue, queryAvailability: query };
}

const movieIdentity: MediaIdentity = {
  watchlogId: 1,
  mediaType: "movie",
  externalIds: [{ type: "tmdb", id: 603 }],
};

const tvIdentity: MediaIdentity = {
  watchlogId: 2,
  mediaType: "tv",
  externalIds: [{ type: "tmdb", id: 1399 }],
};

describe("access offering normalization", () => {
  it("represents subscription streaming", () => {
    const value = makeOffering({ isSubscription: true });

    expect(value.isSubscription).toBe(true);
    expect(value.isFree).toBe(false);
    expect(value.isAdSupported).toBe(false);
    expect(value.isRent).toBe(false);
    expect(value.isBuy).toBe(false);
  });

  it("represents free streaming without ads", () => {
    const value = makeOffering({ isSubscription: false, isFree: true });

    expect(value.isFree).toBe(true);
    expect(value.isAdSupported).toBe(false);
    expect(isOfferingFree(value)).toBe(true);
    expect(isOfferingAdSupported(value)).toBe(false);
  });

  it("allows free and ad-supported to coexist (free ad-supported streaming)", () => {
    const value = makeOffering({
      isSubscription: false,
      isFree: true,
      isAdSupported: true,
    });

    expect(value.isFree).toBe(true);
    expect(value.isAdSupported).toBe(true);
    expect(isOfferingFree(value)).toBe(false);
    expect(isOfferingAdSupported(value)).toBe(true);
  });

  it("allows ad-supported to qualify a rental", () => {
    const value = makeOffering({
      isSubscription: false,
      isRent: true,
      isAdSupported: true,
    });

    expect(value.isRent).toBe(true);
    expect(value.isAdSupported).toBe(true);
    expect(isOfferingRent(value)).toBe(true);
  });

  it("represents rental and purchase", () => {
    const rent = makeOffering({ isSubscription: false, isRent: true });
    const buy = makeOffering({ isSubscription: false, isBuy: true });

    expect(isOfferingRent(rent)).toBe(true);
    expect(isOfferingBuy(rent)).toBe(false);
    expect(isOfferingBuy(buy)).toBe(true);
    expect(isOfferingRent(buy)).toBe(false);
    expect(isOfferingSubscription(buy)).toBe(false);
  });

  it("rejects an offering with no cost model", () => {
    expect(() => makeOffering({ isSubscription: false })).toThrow(
      /exactly one cost model/,
    );
  });

  it("rejects an offering with more than one cost model", () => {
    expect(() => makeOffering({ isSubscription: true, isRent: true })).toThrow(
      /exactly one cost model/,
    );
  });

  it("requires non-empty provider attribution", () => {
    expect(() => makeOffering({ providerKey: "" })).toThrow(/providerKey/);
    expect(() => makeOffering({ providerLabelKey: "" })).toThrow(
      /providerLabelKey/,
    );
  });

  it("rejects a region outside the supported catalogue", () => {
    expect(() =>
      makeOffering({ region: "XX" as AvailabilityRegionCode }),
    ).toThrow(/not a valid AvailabilityRegionCode/);
  });

  it("keeps provider attribution as opaque keys", () => {
    const value = makeOffering({
      providerKey: "some-provider",
      providerLabelKey: "some.provider.name",
    });

    expect(value.providerKey).toBe("some-provider");
    expect(value.providerLabelKey).toBe("some.provider.name");
  });
});

describe("provider domain model", () => {
  it("maps a capability onto the approved provider shape", () => {
    const value = toProvider(capability({ providerName: "Alpha Streaming" }));

    expect(value.providerId).toBe("alpha");
    expect(value.providerName).toBe("Alpha Streaming");
    expect("logoPath" in value).toBe(false);
    expect("displayPriority" in value).toBe(false);
  });

  it("carries optional logoPath and displayPriority when declared", () => {
    const value = toProvider(
      capability({
        providerName: "Alpha Streaming",
        logoPath: "/logos/alpha.svg",
        displayPriority: 3,
      }),
    );

    expect(value.logoPath).toBe("/logos/alpha.svg");
    expect(value.displayPriority).toBe(3);
  });
});

describe("provider capability model", () => {
  it("is eligible when media kind and region are both supported", () => {
    expect(isEligible(capability(), "movie", "IN")).toBe(true);
    expect(isEligible(capability(), "tv", "AU")).toBe(true);
  });

  it("is not eligible for an unsupported media kind", () => {
    const moviesOnly = capability({ supportedMediaKinds: ["movie"] });

    expect(isEligible(moviesOnly, "movie", "IN")).toBe(true);
    expect(isEligible(moviesOnly, "tv", "IN")).toBe(false);
  });

  it("is not eligible for an unsupported region", () => {
    const indiaOnly = capability({ supportedRegions: ["IN"] });

    expect(isEligible(indiaOnly, "movie", "IN")).toBe(true);
    expect(isEligible(indiaOnly, "movie", "US")).toBe(false);
  });

  it("exposes declared network and best-effort constraints", () => {
    const value = capability({ requiresNetwork: false, isBestEffort: true });

    expect(value.requiresNetwork).toBe(false);
    expect(value.isBestEffort).toBe(true);
  });
});

describe("availability group representation", () => {
  it("maps each cost model to its approved group type", () => {
    const subscription = makeOffering();
    const free = makeOffering({ isSubscription: false, isFree: true });
    const rent = makeOffering({ isSubscription: false, isRent: true });
    const buy = makeOffering({ isSubscription: false, isBuy: true });

    expect(buildAvailabilityGroups([subscription]).map((g) => g.type)).toEqual([
      "flatrate",
    ]);
    expect(buildAvailabilityGroups([free]).map((g) => g.type)).toEqual([
      "free",
    ]);
    expect(buildAvailabilityGroups([rent]).map((g) => g.type)).toEqual([
      "rent",
    ]);
    expect(buildAvailabilityGroups([buy]).map((g) => g.type)).toEqual(["buy"]);
  });

  it("represents a free ad-supported offering in both the free and ads groups", () => {
    const groups = buildAvailabilityGroups([
      makeOffering({
        isSubscription: false,
        isFree: true,
        isAdSupported: true,
      }),
    ]);

    expect(groups.map((g) => g.type)).toEqual(["free", "ads"]);
    for (const group of groups) {
      expect(group.providers.map((p) => p.providerId)).toEqual(["alpha"]);
    }
  });

  it("represents an ad-supported rental in the ads and rent groups", () => {
    const groups = buildAvailabilityGroups([
      makeOffering({
        isSubscription: false,
        isRent: true,
        isAdSupported: true,
      }),
    ]);

    expect(groups.map((g) => g.type)).toEqual(["ads", "rent"]);
  });

  it("orders groups in the canonical type order regardless of input order", () => {
    const groups = buildAvailabilityGroups([
      makeOffering({
        providerKey: "gamma",
        providerLabelKey: "gamma.name",
        isSubscription: false,
        isBuy: true,
      }),
      makeOffering({
        providerKey: "beta",
        providerLabelKey: "beta.name",
        isSubscription: false,
        isRent: true,
      }),
      makeOffering({ providerKey: "alpha" }),
    ]);

    expect(groups.map((g) => g.type)).toEqual(["flatrate", "rent", "buy"]);
  });

  it("collects multiple providers in one group, deduplicated and ordered", () => {
    const alpha = toProvider(
      capability({ providerKey: "alpha", displayPriority: 10 }),
    );
    const beta = toProvider(capability({ providerKey: "beta" }));
    const gamma = toProvider(
      capability({ providerKey: "gamma", displayPriority: 2 }),
    );

    const groups = buildAvailabilityGroups(
      [
        makeOffering({ providerKey: "alpha" }),
        makeOffering({
          providerKey: "alpha",
          isSubscription: false,
          isBuy: true,
        }),
        makeOffering({ providerKey: "beta" }),
        makeOffering({ providerKey: "gamma" }),
      ],
      [alpha, beta, gamma],
    );

    const flatrate = groups.find((g) => g.type === "flatrate");
    expect(flatrate?.providers.map((p) => p.providerId)).toEqual([
      "gamma",
      "alpha",
      "beta",
    ]);

    const buy = groups.find((g) => g.type === "buy");
    expect(buy?.providers.map((p) => p.providerId)).toEqual(["alpha"]);
  });

  it("falls back to a neutral provider identity when metadata is missing", () => {
    const groups = buildAvailabilityGroups([
      makeOffering({ providerKey: "mystery" }),
    ]);

    expect(groups[0]?.providers[0]).toEqual({
      providerId: "mystery",
      providerName: "mystery",
    });
  });

  it("produces no groups without offerings", () => {
    expect(buildAvailabilityGroups([])).toEqual([]);

    const result = resolveAvailability(movieIdentity, "IN", [
      resolved("alpha"),
    ]);
    expect(result.groups).toEqual([]);
  });

  it("derives groups in the aggregate result with declared provider metadata", () => {
    const result = resolveAvailability(
      movieIdentity,
      "IN",
      [
        resolved("alpha", [makeOffering({ providerKey: "alpha" })]),
        resolved("beta", [
          makeOffering({
            providerKey: "beta",
            providerLabelKey: "beta.name",
            isSubscription: false,
            isRent: true,
          }),
        ]),
      ],
      [
        toProvider(capability({ providerKey: "alpha", providerName: "Alpha" })),
        toProvider(capability({ providerKey: "beta", providerName: "Beta" })),
      ],
    );

    expect(result.groups.map((g) => g.type)).toEqual(["flatrate", "rent"]);
    expect(result.groups[0]?.providers[0]?.providerName).toBe("Alpha");
    expect(result.groups[1]?.providers[0]?.providerName).toBe("Beta");
  });

  it("excludes providers whose offerings are outside the requested region", () => {
    const result = resolveAvailability(
      movieIdentity,
      "GB",
      [resolved("alpha", [makeOffering({ region: "IN" })])],
      [toProvider(capability({ providerKey: "alpha" }))],
    );

    expect(result.offerings).toEqual([]);
    expect(result.groups).toEqual([]);
  });

  it("builds groups deterministically for identical inputs", () => {
    const offerings = [
      makeOffering({ providerKey: "alpha" }),
      makeOffering({
        providerKey: "beta",
        providerLabelKey: "beta.name",
        isSubscription: false,
        isRent: true,
      }),
    ];
    const providers = [
      toProvider(capability({ providerKey: "alpha" })),
      toProvider(capability({ providerKey: "beta" })),
    ];

    const first = buildAvailabilityGroups(offerings, providers);
    const second = buildAvailabilityGroups(offerings, providers);

    expect(second).toEqual(first);
  });
});

describe("availability verdict and resolution semantics", () => {
  it("reports available/resolved when a provider confirms offerings", () => {
    const result = resolveAvailability(movieIdentity, "IN", [
      resolved("alpha", [makeOffering({ isSubscription: true })]),
    ]);

    expect(result.verdict).toBe("available");
    expect(result.resolution).toBe("resolved");
    expect(result.offerings).toHaveLength(1);
  });

  it("reports unavailable/resolved when every answering provider reports nothing", () => {
    const result = resolveAvailability(movieIdentity, "IN", [
      resolved("alpha"),
      resolved("beta"),
    ]);

    expect(result.verdict).toBe("unavailable");
    expect(result.resolution).toBe("resolved");
    expect(result.offerings).toHaveLength(0);
  });

  it("reports unknown/resolved when no providers were consulted", () => {
    const result = resolveAvailability(movieIdentity, "IN", []);

    expect(result.verdict).toBe("unknown");
    expect(result.resolution).toBe("resolved");
  });

  it("reports unknown/partial when one provider says unavailable and another fails", () => {
    // Approved correction #1: a provider failure must not turn into
    // "unavailable", and the aggregate must remain distinguishable as partial.
    const result = resolveAvailability(movieIdentity, "IN", [
      resolved("alpha"),
      failed("beta", "timeout"),
    ]);

    expect(result.verdict).toBe("unknown");
    expect(result.verdict).not.toBe("unavailable");
    expect(result.resolution).toBe("partial");
  });

  it("reports unknown/partial when an answering provider is best-effort", () => {
    const result = resolveAvailability(movieIdentity, "IN", [
      resolved("alpha"),
      partial("beta"),
    ]);

    expect(result.verdict).toBe("unknown");
    expect(result.resolution).toBe("partial");
  });

  it("reports available/partial when offerings exist alongside a failure", () => {
    const result = resolveAvailability(movieIdentity, "IN", [
      resolved("alpha", [makeOffering()]),
      failed("beta", "network"),
    ]);

    expect(result.verdict).toBe("available");
    expect(result.resolution).toBe("partial");
    expect(result.offerings).toHaveLength(1);
  });

  it("reports unknown/error when every provider failed", () => {
    const result = resolveAvailability(movieIdentity, "IN", [
      failed("alpha", "network"),
      failed("beta", "serviceUnavailable"),
    ]);

    expect(result.verdict).toBe("unknown");
    expect(result.resolution).toBe("error");
  });

  it("reports unknown/offline when every provider was offline", () => {
    const result = resolveAvailability(movieIdentity, "IN", [
      offlineResult("alpha"),
      offlineResult("beta"),
    ]);

    expect(result.verdict).toBe("unknown");
    expect(result.resolution).toBe("offline");
  });

  it("keeps 'not available' distinguishable from 'could not determine'", () => {
    const notAvailable = resolveAvailability(movieIdentity, "IN", [
      resolved("alpha"),
    ]);
    const couldNotDetermine = resolveAvailability(movieIdentity, "IN", [
      failed("alpha", "timeout"),
    ]);

    expect(notAvailable.verdict).toBe("unavailable");
    expect(notAvailable.resolution).toBe("resolved");
    expect(couldNotDetermine.verdict).toBe("unknown");
    expect(couldNotDetermine.resolution).toBe("error");
    expect(notAvailable.verdict).not.toBe(couldNotDetermine.verdict);
  });
});

describe("provider result aggregation", () => {
  it("merges offerings from multiple providers in provider order", () => {
    const alpha = makeOffering({
      providerKey: "alpha",
      providerLabelKey: "alpha.name",
      isSubscription: true,
    });
    const beta = makeOffering({
      providerKey: "beta",
      providerLabelKey: "beta.name",
      isSubscription: false,
      isRent: true,
    });

    const result = resolveAvailability(movieIdentity, "IN", [
      resolved("alpha", [alpha]),
      resolved("beta", [beta]),
    ]);

    expect(result.offerings).toEqual([alpha, beta]);
    expect(result.offerings.map((o) => o.providerKey)).toEqual([
      "alpha",
      "beta",
    ]);
  });

  it("filters offerings to the requested region", () => {
    const inIndia = makeOffering({ region: "IN" });
    const inUs = makeOffering({ region: "US" });

    const result = resolveAvailability(tvIdentity, "IN", [
      resolved("alpha", [inIndia, inUs]),
    ]);

    expect(result.offerings).toEqual([inIndia]);
    expect(result.verdict).toBe("available");
  });

  it("treats out-of-region offerings as no offerings", () => {
    const result = resolveAvailability(movieIdentity, "GB", [
      resolved("alpha", [makeOffering({ region: "IN" })]),
    ]);

    expect(result.offerings).toHaveLength(0);
    expect(result.verdict).toBe("unavailable");
  });

  it("preserves every per-provider result, including failures", () => {
    const results = [resolved("alpha"), failed("beta", "rateLimited")];

    const merged = resolveAvailability(movieIdentity, "IN", results);

    expect(merged.providerResults).toEqual(results);
    expect(merged.providerResults).toHaveLength(2);
  });

  it("carries the queried identity and region through unchanged", () => {
    const merged = resolveAvailability(tvIdentity, "CA", []);

    expect(merged.identity).toBe(tvIdentity);
    expect(merged.region).toBe("CA");
  });

  it("does not mutate the provider result array it was given", () => {
    const results = [resolved("alpha")];

    resolveAvailability(movieIdentity, "IN", results);

    expect(results).toHaveLength(1);
    expect(results[0]?.providerKey).toBe("alpha");
  });

  it("exposes the required availability result contract fields", () => {
    const result = resolveAvailability(
      movieIdentity,
      "IN",
      [resolved("alpha", [makeOffering()])],
      [toProvider(capability())],
    );

    expect(Object.keys(result)).toEqual(
      expect.arrayContaining([
        "identity",
        "region",
        "verdict",
        "resolution",
        "groups",
        "providerResults",
        "offerings",
      ]),
    );
  });

  it("exposes the required offering contract fields", () => {
    const offering = makeOffering();

    expect(Object.keys(offering)).toEqual(
      expect.arrayContaining([
        "providerKey",
        "providerLabelKey",
        "region",
        "isSubscription",
        "isFree",
        "isAdSupported",
        "isRent",
        "isBuy",
      ]),
    );
  });
});

describe("provider-neutral availability service", () => {
  it("queries only adapters eligible for the media kind and region", async () => {
    const queried: Array<string> = [];
    const movieProvider = adapter(capability({ providerKey: "alpha" }), () => {
      queried.push("alpha");
      return Promise.resolve(
        resolved("alpha", [makeOffering({ providerKey: "alpha" })]),
      );
    });
    const tvOnlyProvider = adapter(
      capability({ providerKey: "beta", supportedMediaKinds: ["tv"] }),
      () => {
        queried.push("beta");
        return Promise.resolve(resolved("beta"));
      },
    );
    const usOnlyProvider = adapter(
      capability({ providerKey: "gamma", supportedRegions: ["US"] }),
      () => {
        queried.push("gamma");
        return Promise.resolve(resolved("gamma"));
      },
    );

    const service = createAvailabilityService([
      movieProvider,
      tvOnlyProvider,
      usOnlyProvider,
    ]);
    const result = await service.getAvailability(movieIdentity, "IN");

    expect(queried).toEqual(["alpha"]);
    expect(result.verdict).toBe("available");
    expect(result.offerings.map((o) => o.providerKey)).toEqual(["alpha"]);
  });

  it("passes the identity and region through to adapters unchanged", async () => {
    const seen: Array<{
      identity: MediaIdentity;
      region: AvailabilityRegionCode;
    }> = [];
    const service = createAvailabilityService([
      adapter(capability(), (identity, region) => {
        seen.push({ identity, region });
        return Promise.resolve(resolved("alpha"));
      }),
    ]);

    await service.getAvailability(tvIdentity, "AU");

    expect(seen).toEqual([{ identity: tvIdentity, region: "AU" }]);
  });

  it("reports offline without querying any provider", async () => {
    let calls = 0;
    const service = createAvailabilityService(
      [
        adapter(capability(), () => {
          calls += 1;
          return Promise.resolve(resolved("alpha", [makeOffering()]));
        }),
      ],
      { isOnline: () => false },
    );

    const result = await service.getAvailability(movieIdentity, "IN");

    expect(calls).toBe(0);
    expect(result.verdict).toBe("unknown");
    expect(result.resolution).toBe("offline");
    expect(result.groups).toEqual([]);
    expect(result.providerResults).toEqual([]);
  });

  it("rejects an invalid region instead of guessing one", async () => {
    const service = createAvailabilityService([]);

    await expect(
      service.getAvailability(movieIdentity, "XX" as AvailabilityRegionCode),
    ).rejects.toThrow(/not a valid AvailabilityRegionCode/);
  });

  it("reports unknown/resolved when no adapter is eligible", async () => {
    const service = createAvailabilityService([
      adapter(capability({ supportedMediaKinds: ["tv"] }), () =>
        Promise.resolve(resolved("alpha")),
      ),
    ]);

    const result = await service.getAvailability(movieIdentity, "IN");

    expect(result.verdict).toBe("unknown");
    expect(result.resolution).toBe("resolved");
    expect(result.providerResults).toEqual([]);
  });

  it("maps a rejected query to a normalized partial failure", async () => {
    const service = createAvailabilityService([
      adapter(capability({ providerKey: "alpha" }), () =>
        Promise.resolve(
          resolved("alpha", [makeOffering({ providerKey: "alpha" })]),
        ),
      ),
      adapter(capability({ providerKey: "beta" }), () =>
        Promise.reject(new Error("provider exploded")),
      ),
    ]);

    const result = await service.getAvailability(movieIdentity, "IN");

    expect(result.verdict).toBe("available");
    expect(result.resolution).toBe("partial");
    expect(result.offerings).toHaveLength(1);
    expect(result.providerResults[1]).toEqual({
      providerKey: "beta",
      offerings: [],
      resolution: "error",
      error: {
        providerKey: "beta",
        kind: "other",
        message: "provider exploded",
      },
    });
  });

  it("maps a provider timeout without failing the whole lookup", async () => {
    const service = createAvailabilityService(
      [
        adapter(capability({ providerKey: "alpha" }), () =>
          Promise.resolve(
            resolved("alpha", [makeOffering({ providerKey: "alpha" })]),
          ),
        ),
        adapter(
          capability({ providerKey: "beta" }),
          () =>
            new Promise<ProviderResult>(() => {
              // Intentionally never settles: exercises the timeout path.
            }),
        ),
      ],
      { queryTimeoutMs: 5 },
    );

    const result = await service.getAvailability(movieIdentity, "IN");

    expect(result.verdict).toBe("available");
    expect(result.resolution).toBe("partial");
    expect(result.providerResults[1]?.resolution).toBe("error");
    expect(result.providerResults[1]?.error?.kind).toBe("timeout");
  });

  it("clears the pending timeout when the provider answers before it fires", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      const service = createAvailabilityService(
        [
          adapter(capability(), () =>
            Promise.resolve(resolved("alpha", [makeOffering()])),
          ),
        ],
        { queryTimeoutMs: 5000 },
      );

      const result = await service.getAvailability(movieIdentity, "IN");

      expect(result.verdict).toBe("available");
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("supports movie and TV through one contract", async () => {
    const service = createAvailabilityService([
      adapter(capability(), (identity) =>
        Promise.resolve(
          resolved("alpha", [
            makeOffering({ providerKey: `${identity.mediaType}-alpha` }),
          ]),
        ),
      ),
    ]);

    const movieResult = await service.getAvailability(movieIdentity, "IN");
    const tvResult = await service.getAvailability(tvIdentity, "IN");

    expect(movieResult.identity.mediaType).toBe("movie");
    expect(movieResult.offerings[0]?.providerKey).toBe("movie-alpha");
    expect(tvResult.identity.mediaType).toBe("tv");
    expect(tvResult.offerings[0]?.providerKey).toBe("tv-alpha");
  });

  it("carries external identities without a provider-specific model", async () => {
    const seen: Array<MediaIdentity["externalIds"]> = [];
    const service = createAvailabilityService([
      adapter(capability(), (identity) => {
        seen.push(identity.externalIds);
        return Promise.resolve(resolved("alpha"));
      }),
    ]);

    await service.getAvailability(movieIdentity, "IN");

    expect(seen).toEqual([[{ type: "tmdb", id: 603 }]]);
    expect(seen[0]?.[0]?.type).toBe("tmdb");
  });

  it("exposes the optional link when a provider supplies one", async () => {
    const service = createAvailabilityService([
      adapter(capability(), () =>
        Promise.resolve({
          ...resolved("alpha", [makeOffering()]),
          link: "https://watch.example.test/alpha",
        }),
      ),
    ]);

    const result = await service.getAvailability(movieIdentity, "IN");

    expect(result.link).toBe("https://watch.example.test/alpha");
    expect(result.verdict).toBe("available");
  });

  it("omits the link when no provider supplies one", async () => {
    const service = createAvailabilityService([
      adapter(capability(), () => Promise.resolve(resolved("alpha"))),
    ]);

    const result = await service.getAvailability(movieIdentity, "IN");

    expect(result.link).toBeUndefined();
    expect("link" in result).toBe(false);
  });

  it("takes the first provider-supplied link deterministically", async () => {
    const service = createAvailabilityService([
      adapter(capability({ providerKey: "alpha" }), () =>
        Promise.resolve({
          ...resolved("alpha"),
          link: "https://watch.example.test/first",
        }),
      ),
      adapter(capability({ providerKey: "beta" }), () =>
        Promise.resolve({
          ...resolved("beta"),
          link: "https://watch.example.test/second",
        }),
      ),
    ]);

    const result = await service.getAvailability(movieIdentity, "IN");

    expect(result.link).toBe("https://watch.example.test/first");
  });

  it("exposes the normalized result shape to callers", async () => {
    const service = createAvailabilityService([
      adapter(capability(), () =>
        Promise.resolve(resolved("alpha", [makeOffering()])),
      ),
    ]);

    const result = await service.getAvailability(movieIdentity, "IN");

    expect(Object.keys(result)).toEqual(
      expect.arrayContaining([
        "identity",
        "region",
        "verdict",
        "resolution",
        "groups",
        "providerResults",
        "offerings",
      ]),
    );
  });
});
