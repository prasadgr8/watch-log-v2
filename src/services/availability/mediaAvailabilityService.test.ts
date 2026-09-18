import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createAccessOffering,
  type AccessOffering,
  type AvailabilityRegionCode,
  type MediaIdentity,
  type ProviderResult,
} from "../../domain/availability/types";
import { tmdbAvailabilityAdapter } from "../tmdb";
import { db } from "../../database/db";

import type { Media } from "../../types/media";

import { getAvailabilityForMedia } from "./mediaAvailabilityService";

function createMovie(
  overrides: Partial<Extract<Media, { mediaType: "movie" }>> = {},
): Extract<Media, { mediaType: "movie" }> {
  const now = new Date("2026-01-01T00:00:00.000Z");

  return {
    mediaType: "movie",
    title: "Test Movie",
    userStatus: "planned",
    createdAt: now,
    updatedAt: now,
    id: 1,
    tmdbId: 603,
    ...overrides,
  };
}

function createShow(
  overrides: Partial<Extract<Media, { mediaType: "tv" }>> = {},
): Extract<Media, { mediaType: "tv" }> {
  const now = new Date("2026-01-01T00:00:00.000Z");

  return {
    mediaType: "tv",
    title: "Test Show",
    userStatus: "watching",
    createdAt: now,
    updatedAt: now,
    id: 2,
    tmdbId: 1399,
    ...overrides,
  };
}

function makeOffering(
  params: Partial<AccessOffering> & {
    providerKey: string;
    providerLabelKey: string;
    region: AvailabilityRegionCode;
  } = {
    providerKey: "tmdb:8",
    providerLabelKey: "provider.tmdb.8",
    region: "IN",
  },
): AccessOffering {
  return createAccessOffering({
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

afterEach(() => {
  vi.restoreAllMocks();
});
describe("mediaAvailabilityService - movie identity construction", () => {
  it("passes the movie identity and explicit region to the TMDB adapter", async () => {
    const movie = createMovie({ id: 11, tmdbId: 603 });
    const queryAvailability = vi
      .spyOn(tmdbAvailabilityAdapter, "queryAvailability")
      .mockResolvedValue(resolved("tmdb"));

    await getAvailabilityForMedia(movie, "IN");

    expect(queryAvailability).toHaveBeenCalledTimes(1);
    expect(queryAvailability).toHaveBeenCalledWith(
      {
        watchlogId: 11,
        mediaType: "movie",
        externalIds: [{ type: "tmdb", id: 603 }],
      } satisfies MediaIdentity,
      "IN",
    );
  });
});

describe("mediaAvailabilityService - TV identity construction", () => {
  it("passes the TV identity and explicit region to the TMDB adapter", async () => {
    const show = createShow({ id: 22, tmdbId: 1399 });
    const queryAvailability = vi
      .spyOn(tmdbAvailabilityAdapter, "queryAvailability")
      .mockResolvedValue(resolved("tmdb"));

    await getAvailabilityForMedia(show, "IN");

    expect(queryAvailability).toHaveBeenCalledTimes(1);
    expect(queryAvailability).toHaveBeenCalledWith(
      {
        watchlogId: 22,
        mediaType: "tv",
        externalIds: [{ type: "tmdb", id: 1399 }],
      } satisfies MediaIdentity,
      "IN",
    );
  });
});

describe("mediaAvailabilityService - watchlogId propagation", () => {
  it("propagates an undefined WatchLog id without inventing one", async () => {
    const movie = createMovie({ id: undefined, tmdbId: 603 });
    const queryAvailability = vi
      .spyOn(tmdbAvailabilityAdapter, "queryAvailability")
      .mockResolvedValue(resolved("tmdb"));

    await getAvailabilityForMedia(movie, "IN");

    expect(queryAvailability).toHaveBeenCalledTimes(1);
    const [identity] = queryAvailability.mock.calls[0] ?? [];
    expect(identity?.watchlogId).toBeUndefined();
    expect(identity?.externalIds).toEqual([{ type: "tmdb", id: 603 }]);
  });
});

describe("mediaAvailabilityService - TMDB external ID propagation", () => {
  it("invokes the adapter with empty externalIds when tmdbId is missing", async () => {
    const movie = createMovie({ id: 11, tmdbId: undefined });
    const queryAvailability = vi
      .spyOn(tmdbAvailabilityAdapter, "queryAvailability")
      .mockResolvedValue({
        providerKey: "tmdb",
        offerings: [],
        resolution: "error",
        error: { providerKey: "tmdb", kind: "other" },
      });

    const result = await getAvailabilityForMedia(movie, "IN");

    expect(queryAvailability).toHaveBeenCalledTimes(1);
    expect(queryAvailability).toHaveBeenCalledWith(
      {
        watchlogId: 11,
        mediaType: "movie",
        externalIds: [],
      } satisfies MediaIdentity,
      "IN",
    );
    expect(result.verdict).toBe("unknown");
    expect(result.resolution).toBe("error");
  });
});

describe("mediaAvailabilityService - explicit region pass-through", () => {
  it("forwards the caller-supplied region unchanged", async () => {
    const movie = createMovie();
    const queryAvailability = vi
      .spyOn(tmdbAvailabilityAdapter, "queryAvailability")
      .mockResolvedValue(resolved("tmdb"));

    await getAvailabilityForMedia(movie, "US");

    expect(queryAvailability).toHaveBeenCalledTimes(1);
    expect(queryAvailability.mock.calls[0]?.[1]).toBe("US");
  });
});

describe("mediaAvailabilityService - offline short-circuit", () => {
  it("does not query the adapter and returns unknown/offline", async () => {
    const movie = createMovie();
    const queryAvailability = vi
      .spyOn(tmdbAvailabilityAdapter, "queryAvailability")
      .mockResolvedValue(resolved("tmdb"));

    const result = await getAvailabilityForMedia(movie, "IN", {
      isOnline: () => false,
    });

    expect(queryAvailability).not.toHaveBeenCalled();
    expect(result.verdict).toBe("unknown");
    expect(result.resolution).toBe("offline");
    expect(result.offerings).toEqual([]);
    expect(result.providerResults).toEqual([]);
  });
});

describe("mediaAvailabilityService - successful result preservation", () => {
  it("returns the domain aggregation with offerings, groups and link", async () => {
    const movie = createMovie();
    const offering = makeOffering({
      providerKey: "tmdb:8",
      providerLabelKey: "provider.tmdb.8",
      region: "IN",
    });
    vi.spyOn(tmdbAvailabilityAdapter, "queryAvailability").mockResolvedValue(
      resolved("tmdb", [offering], "https://watch.example.test/tmdb"),
    );

    const result = await getAvailabilityForMedia(movie, "IN");

    expect(result.verdict).toBe("available");
    expect(result.resolution).toBe("resolved");
    expect(result.offerings).toEqual([offering]);
    expect(result.groups.map((group) => group.type)).toEqual(["flatrate"]);
    expect(result.link).toBe("https://watch.example.test/tmdb");
    expect(result.providerResults).toHaveLength(1);
    expect(result.providerResults[0]).toEqual(
      resolved("tmdb", [offering], "https://watch.example.test/tmdb"),
    );
    expect(result.identity).toEqual({
      watchlogId: movie.id,
      mediaType: "movie",
      externalIds: [{ type: "tmdb", id: movie.tmdbId }],
    });
    expect(result.region).toBe("IN");
  });
});

describe("mediaAvailabilityService - resolved empty availability", () => {
  it("returns unavailable/resolved without translating the result", async () => {
    const movie = createMovie();
    vi.spyOn(tmdbAvailabilityAdapter, "queryAvailability").mockResolvedValue(
      resolved("tmdb"),
    );

    const result = await getAvailabilityForMedia(movie, "IN");

    expect(result.verdict).toBe("unavailable");
    expect(result.resolution).toBe("resolved");
    expect(result.offerings).toEqual([]);
    expect(result.groups).toEqual([]);
  });
});

describe("mediaAvailabilityService - invalid region", () => {
  it("preserves the existing domain region validation", async () => {
    const movie = createMovie();
    const queryAvailability = vi
      .spyOn(tmdbAvailabilityAdapter, "queryAvailability")
      .mockResolvedValue(resolved("tmdb"));

    await expect(
      getAvailabilityForMedia(movie, "XX" as AvailabilityRegionCode),
    ).rejects.toThrow(/not a valid AvailabilityRegionCode/);
    expect(queryAvailability).not.toHaveBeenCalled();
  });
});

describe("mediaAvailabilityService - timeout propagation", () => {
  it("surfaces the domain timeout semantics for a never-settling adapter", async () => {
    const movie = createMovie();
    vi.spyOn(tmdbAvailabilityAdapter, "queryAvailability").mockImplementation(
      () => new Promise<ProviderResult>(() => {}),
    );

    const result = await getAvailabilityForMedia(movie, "IN", {
      isOnline: () => true,
      queryTimeoutMs: 5,
    });

    expect(result.verdict).toBe("unknown");
    expect(result.resolution).toBe("error");
    expect(result.providerResults).toHaveLength(1);
    expect(result.providerResults[0]?.resolution).toBe("error");
    expect(result.providerResults[0]?.error?.kind).toBe("timeout");
  });
});

describe("mediaAvailabilityService - error-kind preservation", () => {
  it("preserves a rateLimited provider error without translation", async () => {
    const movie = createMovie();
    vi.spyOn(tmdbAvailabilityAdapter, "queryAvailability").mockResolvedValue({
      providerKey: "tmdb",
      offerings: [],
      resolution: "error",
      error: { providerKey: "tmdb", kind: "rateLimited" },
    });

    const result = await getAvailabilityForMedia(movie, "IN");

    expect(result.verdict).toBe("unknown");
    expect(result.resolution).toBe("error");
    expect(result.offerings).toEqual([]);
    expect(result.providerResults[0]?.error?.kind).toBe("rateLimited");
  });
});

describe("mediaAvailabilityService - adapter rejection", () => {
  it("normalizes a rejected adapter query without failing the lookup", async () => {
    const movie = createMovie();
    vi.spyOn(tmdbAvailabilityAdapter, "queryAvailability").mockRejectedValue(
      new Error("provider exploded"),
    );

    const result = await getAvailabilityForMedia(movie, "IN");

    expect(result.verdict).toBe("unknown");
    expect(result.resolution).toBe("error");
    expect(result.providerResults[0]).toEqual({
      providerKey: "tmdb",
      offerings: [],
      resolution: "error",
      error: {
        providerKey: "tmdb",
        kind: "other",
        message: "provider exploded",
      },
    });
  });
});

describe("mediaAvailabilityService - no persistence", () => {
  it("leaves IndexedDB unchanged", async () => {
    const movie = createMovie();
    vi.spyOn(tmdbAvailabilityAdapter, "queryAvailability").mockResolvedValue(
      resolved("tmdb"),
    );

    await getAvailabilityForMedia(movie, "IN");

    expect(await db.media.count()).toBe(0);
    expect(await db.settings.count()).toBe(0);
  });
});

describe("mediaAvailabilityService - no caching and single invocation", () => {
  it("queries the adapter once per call without caching results", async () => {
    const movie = createMovie();
    const queryAvailability = vi
      .spyOn(tmdbAvailabilityAdapter, "queryAvailability")
      .mockResolvedValue(resolved("tmdb"));

    await getAvailabilityForMedia(movie, "IN");
    await getAvailabilityForMedia(movie, "IN");

    expect(queryAvailability).toHaveBeenCalledTimes(2);
  });
});