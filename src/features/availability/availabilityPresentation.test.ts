import { describe, expect, it } from "vitest";

import { resolveAvailability } from "../../domain/availability/AvailabilityService";
import {
  createAccessOffering,
  type AccessOffering,
  type AvailabilityGroup,
  type AvailabilityRegionCode,
  type AvailabilityResult,
  type AvailabilityType,
  type AvailabilityVerdict,
  type MediaIdentity,
  type ProviderErrorKind,
  type ProviderResult,
  type ResolutionState,
} from "../../domain/availability/types";

import {
  createAvailabilityRequestKey,
  toAvailabilityViewModel,
} from "./availabilityPresentation";

/*
 * Mapper unit tests for the availability presentation layer (A26.5 S1).
 *
 * Fixtures are built with the real domain aggregate (`resolveAvailability`)
 * and domain builders, mirroring
 * `src/domain/availability/availabilityDomain.test.ts`. A few defensive cases
 * assemble results by hand (still type-valid domain shapes) because the
 * domain itself cannot produce them — shuffled group order and
 * out-of-catalogue group types. No network access and no fetch mocking: the
 * mapper is pure, so results are constructed directly.
 */

const movieIdentity: MediaIdentity = {
  watchlogId: 1,
  mediaType: "movie",
  externalIds: [{ type: "tmdb", id: 603 }],
};

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
  link?: string,
): ProviderResult {
  return {
    providerKey,
    offerings: [...offerings],
    resolution: "resolved",
    ...(link === undefined ? {} : { link }),
  };
}

function partial(
  providerKey: string,
  offerings: ReadonlyArray<AccessOffering> = [],
): ProviderResult {
  return { providerKey, offerings: [...offerings], resolution: "partial" };
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

/**
 * Hand-assembles a type-valid `AvailabilityResult` for defensive cases the
 * domain aggregate cannot produce on its own.
 */
function makeResult(params: {
  verdict: AvailabilityVerdict;
  resolution: ResolutionState;
  groups: ReadonlyArray<AvailabilityGroup>;
  region?: AvailabilityRegionCode;
  providerResults?: ReadonlyArray<ProviderResult>;
  link?: string;
}): AvailabilityResult {
  const base: AvailabilityResult = {
    identity: movieIdentity,
    region: params.region ?? "IN",
    verdict: params.verdict,
    resolution: params.resolution,
    groups: params.groups,
    providerResults: params.providerResults ?? [],
    offerings: [],
  };

  return params.link === undefined ? base : { ...base, link: params.link };
}

/** Domain-aggregated result carrying all five access-type groups. */
function availableInAllFiveGroups(): AvailabilityResult {
  return resolveAvailability(movieIdentity, "IN", [
    resolved("alpha", [
      makeOffering({ isSubscription: true }),
      makeOffering({ isSubscription: false, isFree: true }),
      makeOffering({ isSubscription: false, isFree: true, isAdSupported: true }),
      makeOffering({ isSubscription: false, isRent: true }),
      makeOffering({ isSubscription: false, isBuy: true }),
    ]),
  ]);
}

describe("toAvailabilityViewModel - access group labels", () => {
  it("labels flatrate groups Subscription", () => {
    const viewModel = toAvailabilityViewModel(
      resolveAvailability(movieIdentity, "IN", [
        resolved("alpha", [makeOffering({ isSubscription: true })]),
      ]),
    );

    expect(viewModel.state).toBe("available");
    expect(viewModel.groups).toEqual([
      { type: "flatrate", label: "Subscription" },
    ]);
  });

  it("labels free groups Free", () => {
    const viewModel = toAvailabilityViewModel(
      resolveAvailability(movieIdentity, "IN", [
        resolved("alpha", [makeOffering({ isSubscription: false, isFree: true })]),
      ]),
    );

    expect(viewModel.state).toBe("available");
    expect(viewModel.groups).toEqual([{ type: "free", label: "Free" }]);
  });

  it("labels ad-supported groups With ads", () => {
    const viewModel = toAvailabilityViewModel(
      resolveAvailability(movieIdentity, "IN", [
        resolved("alpha", [
          makeOffering({ isSubscription: false, isFree: true, isAdSupported: true }),
        ]),
      ]),
    );

    expect(viewModel.state).toBe("available");
    expect(viewModel.groups).toEqual([
      { type: "free", label: "Free" },
      { type: "ads", label: "With ads" },
    ]);
  });

  it("labels rent groups Rent", () => {
    const viewModel = toAvailabilityViewModel(
      resolveAvailability(movieIdentity, "IN", [
        resolved("alpha", [makeOffering({ isSubscription: false, isRent: true })]),
      ]),
    );

    expect(viewModel.state).toBe("available");
    expect(viewModel.groups).toEqual([{ type: "rent", label: "Rent" }]);
  });

  it("labels buy groups Buy", () => {
    const viewModel = toAvailabilityViewModel(
      resolveAvailability(movieIdentity, "IN", [
        resolved("alpha", [makeOffering({ isSubscription: false, isBuy: true })]),
      ]),
    );

    expect(viewModel.state).toBe("available");
    expect(viewModel.groups).toEqual([{ type: "buy", label: "Buy" }]);
  });

  it("maps multiple groups with the exact fixed labels", () => {
    const viewModel = toAvailabilityViewModel(availableInAllFiveGroups());

    expect(viewModel.groups).toEqual([
      { type: "flatrate", label: "Subscription" },
      { type: "free", label: "Free" },
      { type: "ads", label: "With ads" },
      { type: "rent", label: "Rent" },
      { type: "buy", label: "Buy" },
    ]);
  });
});

describe("toAvailabilityViewModel - deterministic ordering", () => {
  it("orders domain-built groups in the canonical access-type order", () => {
    const viewModel = toAvailabilityViewModel(availableInAllFiveGroups());

    expect(viewModel.groups.map((group) => group.type)).toEqual([
      "flatrate",
      "free",
      "ads",
      "rent",
      "buy",
    ]);
  });

  it("re-sorts out-of-order groups without mutating the domain result", () => {
    const shuffledGroups: AvailabilityGroup[] = [
      { type: "buy", providers: [] },
      { type: "ads", providers: [] },
      { type: "flatrate", providers: [] },
      { type: "free", providers: [] },
      { type: "rent", providers: [] },
    ];
    const result = makeResult({
      verdict: "available",
      resolution: "resolved",
      groups: shuffledGroups,
    });

    const viewModel = toAvailabilityViewModel(result);

    expect(viewModel.groups.map((group) => group.type)).toEqual([
      "flatrate",
      "free",
      "ads",
      "rent",
      "buy",
    ]);
    // Purity: the input domain result must be untouched.
    expect(result.groups.map((group) => group.type)).toEqual([
      "buy",
      "ads",
      "flatrate",
      "free",
      "rent",
    ]);
  });
});

describe("toAvailabilityViewModel - resolved states", () => {
  it("maps resolved/unavailable to the regional not-available message", () => {
    const viewModel = toAvailabilityViewModel(
      resolveAvailability(movieIdentity, "IN", [resolved("alpha")]),
    );

    expect(viewModel.state).toBe("unavailable");
    expect(viewModel.statusMessage).toBe("Not available in India.");
    expect(viewModel.groups).toEqual([]);
    expect(viewModel.isRetryable).toBe(false);
  });

  it("maps resolved/unknown with no groups to the no-information message", () => {
    const viewModel = toAvailabilityViewModel(
      resolveAvailability(movieIdentity, "IN", []),
    );

    expect(viewModel.state).toBe("unavailable");
    expect(viewModel.statusMessage).toBe(
      "No availability information is available for this title in India.",
    );
    expect(viewModel.groups).toEqual([]);
    expect(viewModel.isRetryable).toBe(false);
  });

  it("maps resolved/available with zero groups to a quiet available state", () => {
    const viewModel = toAvailabilityViewModel(
      makeResult({
        verdict: "available",
        resolution: "resolved",
        groups: [],
      }),
    );

    expect(viewModel.state).toBe("available");
    expect(viewModel.statusMessage).toBeUndefined();
    expect(viewModel.groups).toEqual([]);
    expect(viewModel.isRetryable).toBe(false);
  });
});

describe("toAvailabilityViewModel - offline state", () => {
  it("maps offline resolutions to the offline copy without retry", () => {
    const viewModel = toAvailabilityViewModel(
      resolveAvailability(movieIdentity, "IN", [offlineResult("alpha")]),
    );

    expect(viewModel.state).toBe("offline");
    expect(viewModel.statusMessage).toBe(
      "You are offline. Availability cannot be checked right now.",
    );
    expect(viewModel.isRetryable).toBe(false);
    expect(viewModel.groups).toEqual([]);
  });
});

describe("toAvailabilityViewModel - error states", () => {
  it.each([
    ["rateLimited", "Too many requests. Try again later."],
    [
      "serviceUnavailable",
      "The availability service is temporarily unavailable.",
    ],
    ["timeout", "The availability check timed out."],
    ["network", "Network error while checking availability."],
    ["unknown", "Could not check availability right now."],
    ["other", "Could not check availability right now."],
  ] as ReadonlyArray<[ProviderErrorKind, string]>)(
    "maps error kind %s to its deterministic copy",
    (kind, expectedCopy) => {
      const viewModel = toAvailabilityViewModel(
        resolveAvailability(movieIdentity, "IN", [failed("alpha", kind)]),
      );

      expect(viewModel.state).toBe("error");
      expect(viewModel.statusMessage).toBe(expectedCopy);
      expect(viewModel.isRetryable).toBe(true);
      expect(viewModel.groups).toEqual([]);
    },
  );

  it("picks the dominant error kind by fixed priority, not provider order", () => {
    const viewModel = toAvailabilityViewModel(
      resolveAvailability(movieIdentity, "IN", [
        failed("alpha", "network"),
        failed("beta", "rateLimited"),
      ]),
    );

    expect(viewModel.state).toBe("error");
    expect(viewModel.statusMessage).toBe("Too many requests. Try again later.");
    expect(viewModel.isRetryable).toBe(true);
  });
});

describe("toAvailabilityViewModel - partial states", () => {
  it("maps partial with groups to a partial state that keeps the groups", () => {
    const viewModel = toAvailabilityViewModel(
      resolveAvailability(movieIdentity, "IN", [
        resolved("alpha", [makeOffering({ isSubscription: true })]),
        failed("beta", "timeout"),
      ]),
    );

    expect(viewModel.state).toBe("partial");
    expect(viewModel.statusMessage).toBe(
      "Some availability information couldn't be checked.",
    );
    expect(viewModel.groups).toEqual([
      { type: "flatrate", label: "Subscription" },
    ]);
    expect(viewModel.isRetryable).toBe(false);
  });

  it("maps partial without groups to a partial state with no retry", () => {
    const viewModel = toAvailabilityViewModel(
      resolveAvailability(movieIdentity, "IN", [partial("alpha")]),
    );

    expect(viewModel.state).toBe("partial");
    expect(viewModel.statusMessage).toBe(
      "Some availability information couldn't be checked.",
    );
    expect(viewModel.groups).toEqual([]);
    expect(viewModel.isRetryable).toBe(false);
  });
});

describe("toAvailabilityViewModel - regional link", () => {
  it("preserves a present link verbatim", () => {
    const link = "https://www.example.com/watch/in/603";
    const viewModel = toAvailabilityViewModel(
      resolveAvailability(movieIdentity, "IN", [
        resolved("alpha", [makeOffering({ isSubscription: true })], link),
      ]),
    );

    expect(viewModel.link).toBe(link);
    expect("link" in viewModel).toBe(true);
  });

  it("omits the link property when the result has none", () => {
    const viewModel = toAvailabilityViewModel(
      resolveAvailability(movieIdentity, "IN", [
        resolved("alpha", [makeOffering({ isSubscription: true })]),
      ]),
    );

    expect("link" in viewModel).toBe(false);
    expect(viewModel.link).toBeUndefined();
  });

  it("keeps the link on partial results too", () => {
    const link = "https://www.example.com/watch/in/603";
    const viewModel = toAvailabilityViewModel(
      resolveAvailability(movieIdentity, "IN", [
        resolved("alpha", [makeOffering({ isSubscription: true })], link),
        failed("beta", "network"),
      ]),
    );

    expect(viewModel.state).toBe("partial");
    expect(viewModel.link).toBe(link);
  });
});

describe("toAvailabilityViewModel - region reflection", () => {
  it("reflects the region name in the heading", () => {
    const viewModel = toAvailabilityViewModel(
      resolveAvailability(movieIdentity, "IN", [resolved("alpha")]),
    );

    expect(viewModel.region).toBe("IN");
    expect(viewModel.heading).toBe("Where to watch (India)");
  });

  it("reflects another catalogue region in the heading", () => {
    const viewModel = toAvailabilityViewModel(
      resolveAvailability(movieIdentity, "US", [resolved("alpha")]),
    );

    expect(viewModel.region).toBe("US");
    expect(viewModel.heading).toBe("Where to watch (United States)");
  });
});

describe("toAvailabilityViewModel - retry contract", () => {
  it("marks isRetryable true only for error states", () => {
    const nonErrorStates = [
      toAvailabilityViewModel(availableInAllFiveGroups()),
      toAvailabilityViewModel(
        resolveAvailability(movieIdentity, "IN", [resolved("alpha")]),
      ),
      toAvailabilityViewModel(resolveAvailability(movieIdentity, "IN", [])),
      toAvailabilityViewModel(
        resolveAvailability(movieIdentity, "IN", [offlineResult("alpha")]),
      ),
      toAvailabilityViewModel(
        resolveAvailability(movieIdentity, "IN", [partial("alpha")]),
      ),
    ];

    expect(nonErrorStates.map((viewModel) => viewModel.state)).toEqual([
      "available",
      "unavailable",
      "unavailable",
      "offline",
      "partial",
    ]);
    expect(
      nonErrorStates.every((viewModel) => !viewModel.isRetryable),
    ).toBe(true);

    const errorState = toAvailabilityViewModel(
      resolveAvailability(movieIdentity, "IN", [failed("alpha")]),
    );
    expect(errorState.state).toBe("error");
    expect(errorState.isRetryable).toBe(true);
  });
});

describe("createAvailabilityRequestKey - request identity (A26.6-S1)", () => {
  const mediaBase = { mediaType: "movie" as const };

  it("produces identical keys for identical request identities", () => {
    const keyA = createAvailabilityRequestKey(
      { id: 1, tmdbId: 603, ...mediaBase },
      "IN",
      "ready",
      true,
      0,
    );
    const keyB = createAvailabilityRequestKey(
      { id: 1, tmdbId: 603, ...mediaBase },
      "IN",
      "ready",
      true,
      0,
    );

    expect(keyA).toBe(keyB);
    expect(keyA).toBe("1|movie|603|IN|ready|online|0");
  });

  it("changes when the media id changes (media transition)", () => {
    const keyA = createAvailabilityRequestKey(
      { id: 1, tmdbId: 603, ...mediaBase },
      "IN",
      "ready",
      true,
      0,
    );
    const keyB = createAvailabilityRequestKey(
      { id: 2, tmdbId: 603, ...mediaBase },
      "IN",
      "ready",
      true,
      0,
    );

    expect(keyA).not.toBe(keyB);
  });

  it("changes when the media type changes (media transition)", () => {
    const keyA = createAvailabilityRequestKey(
      { id: 1, tmdbId: 603, ...mediaBase },
      "IN",
      "ready",
      true,
      0,
    );
    const keyB = createAvailabilityRequestKey(
      { id: 1, tmdbId: 603, mediaType: "tv" },
      "IN",
      "ready",
      true,
      0,
    );

    expect(keyA).not.toBe(keyB);
  });

  it("changes when tmdbId changes (media transition)", () => {
    const keyA = createAvailabilityRequestKey(
      { id: 1, tmdbId: 603, ...mediaBase },
      "IN",
      "ready",
      true,
      0,
    );
    const keyB = createAvailabilityRequestKey(
      { id: 1, tmdbId: 1399, ...mediaBase },
      "IN",
      "ready",
      true,
      0,
    );

    expect(keyA).not.toBe(keyB);
  });

  it("changes when the region changes (region transition)", () => {
    const keyA = createAvailabilityRequestKey(
      { id: 1, tmdbId: 603, ...mediaBase },
      "IN",
      "ready",
      true,
      0,
    );
    const keyB = createAvailabilityRequestKey(
      { id: 1, tmdbId: 603, ...mediaBase },
      "US",
      "ready",
      true,
      0,
    );

    expect(keyA).not.toBe(keyB);
  });

  it("changes when the readiness status changes (unset-region transition)", () => {
    const keyA = createAvailabilityRequestKey(
      { id: 1, tmdbId: 603, ...mediaBase },
      "IN",
      "ready",
      true,
      0,
    );
    const keyB = createAvailabilityRequestKey(
      { id: 1, tmdbId: 603, ...mediaBase },
      "IN",
      "choose",
      true,
      0,
    );

    expect(keyA).not.toBe(keyB);
  });

  it("changes when connectivity changes (connectivity transition)", () => {
    const keyA = createAvailabilityRequestKey(
      { id: 1, tmdbId: 603, ...mediaBase },
      "IN",
      "ready",
      true,
      0,
    );
    const keyB = createAvailabilityRequestKey(
      { id: 1, tmdbId: 603, ...mediaBase },
      "IN",
      "ready",
      false,
      0,
    );

    expect(keyA).not.toBe(keyB);
  });

  it("changes when the retry generation changes (manual retry)", () => {
    const keyA = createAvailabilityRequestKey(
      { id: 1, tmdbId: 603, ...mediaBase },
      "IN",
      "ready",
      true,
      0,
    );
    const keyB = createAvailabilityRequestKey(
      { id: 1, tmdbId: 603, ...mediaBase },
      "IN",
      "ready",
      true,
      1,
    );

    expect(keyA).not.toBe(keyB);
  });

  it("handles unsaved media and missing tmdbId without ambiguity", () => {
    const unsaved = createAvailabilityRequestKey(
      { mediaType: "movie" },
      "IN",
      "ready",
      true,
      0,
    );
    const noTmdb = createAvailabilityRequestKey(
      { id: 1, mediaType: "movie" },
      "IN",
      "ready",
      true,
      0,
    );

    expect(unsaved).toBe("unsaved|movie|no-tmdb|IN|ready|online|0");
    expect(noTmdb).toBe("1|movie|no-tmdb|IN|ready|online|0");
    expect(unsaved).not.toBe(noTmdb);
  });
});

describe("toAvailabilityViewModel - defensive group handling", () => {
  it("drops out-of-catalogue group types and keeps valid ones", () => {
    const viewModel = toAvailabilityViewModel(
      makeResult({
        verdict: "available",
        resolution: "resolved",
        groups: [
          { type: "cinema" as AvailabilityType, providers: [] },
          { type: "flatrate", providers: [] },
        ],
      }),
    );

    expect(viewModel.groups).toEqual([
      { type: "flatrate", label: "Subscription" },
    ]);
  });
});
