import { describe, expect, it } from "vitest";

import type { WatchActivityEvent } from "./types";
import { bucketEventsByTimeOfDay } from "./timeOfDay";

function eventAt(hour: number): WatchActivityEvent {
  return {
    episodeId: null,
    mediaId: 1,
    mediaType: "movie",
    source: "manual",
    watchedAt: new Date(2026, 5, 15, hour, 30, 0),
  };
}

describe("bucketEventsByTimeOfDay", () => {
  it("returns zero buckets with isAvailable false for empty input", () => {
    const result = bucketEventsByTimeOfDay([]);

    expect(result.isAvailable).toBe(false);
    expect(result.totalEvents).toBe(0);
    expect(result.buckets).toHaveLength(4);
    expect(result.buckets.every((b) => b.eventCount === 0)).toBe(true);
    expect(result.buckets.every((b) => b.percentage === 0)).toBe(true);
  });

  it("orders buckets deterministically Morning, Afternoon, Evening, Night", () => {
    const result = bucketEventsByTimeOfDay([eventAt(20)]);

    expect(result.buckets.map((b) => b.bucket)).toEqual([
      "Morning",
      "Afternoon",
      "Evening",
      "Night",
    ]);
  });

  it("classifies 04:59 as Night", () => {
    const result = bucketEventsByTimeOfDay([
      { ...eventAt(4), watchedAt: new Date(2026, 5, 15, 4, 59, 0) },
    ]);

    const night = result.buckets.find((b) => b.bucket === "Night")!;
    expect(night.eventCount).toBe(1);
  });

  it("classifies 00:00 as Night", () => {
    const result = bucketEventsByTimeOfDay([
      { ...eventAt(0), watchedAt: new Date(2026, 5, 15, 0, 0, 0) },
    ]);

    const night = result.buckets.find((b) => b.bucket === "Night")!;
    expect(night.eventCount).toBe(1);
  });

  it("classifies 05:00 as Morning", () => {
    const result = bucketEventsByTimeOfDay([
      { ...eventAt(5), watchedAt: new Date(2026, 5, 15, 5, 0, 0) },
    ]);

    const morning = result.buckets.find((b) => b.bucket === "Morning")!;
    expect(morning.eventCount).toBe(1);
  });

  it("classifies 11:59 as Morning", () => {
    const result = bucketEventsByTimeOfDay([
      { ...eventAt(11), watchedAt: new Date(2026, 5, 15, 11, 59, 0) },
    ]);

    const morning = result.buckets.find((b) => b.bucket === "Morning")!;
    expect(morning.eventCount).toBe(1);
  });

  it("classifies 12:00 as Afternoon", () => {
    const result = bucketEventsByTimeOfDay([
      { ...eventAt(12), watchedAt: new Date(2026, 5, 15, 12, 0, 0) },
    ]);

    const afternoon = result.buckets.find((b) => b.bucket === "Afternoon")!;
    expect(afternoon.eventCount).toBe(1);
  });

  it("classifies 16:59 as Afternoon", () => {
    const result = bucketEventsByTimeOfDay([
      { ...eventAt(16), watchedAt: new Date(2026, 5, 15, 16, 59, 0) },
    ]);

    const afternoon = result.buckets.find((b) => b.bucket === "Afternoon")!;
    expect(afternoon.eventCount).toBe(1);
  });

  it("classifies 17:00 as Evening", () => {
    const result = bucketEventsByTimeOfDay([
      { ...eventAt(17), watchedAt: new Date(2026, 5, 15, 17, 0, 0) },
    ]);

    const evening = result.buckets.find((b) => b.bucket === "Evening")!;
    expect(evening.eventCount).toBe(1);
  });

  it("classifies 20:59 as Evening", () => {
    const result = bucketEventsByTimeOfDay([
      { ...eventAt(20), watchedAt: new Date(2026, 5, 15, 20, 59, 0) },
    ]);

    const evening = result.buckets.find((b) => b.bucket === "Evening")!;
    expect(evening.eventCount).toBe(1);
  });

  it("classifies 21:00 as Night", () => {
    const result = bucketEventsByTimeOfDay([
      { ...eventAt(21), watchedAt: new Date(2026, 5, 15, 21, 0, 0) },
    ]);

    const night = result.buckets.find((b) => b.bucket === "Night")!;
    expect(night.eventCount).toBe(1);
  });

  it("classifies 23:59 as Night", () => {
    const result = bucketEventsByTimeOfDay([
      { ...eventAt(23), watchedAt: new Date(2026, 5, 15, 23, 59, 0) },
    ]);

    const night = result.buckets.find((b) => b.bucket === "Night")!;
    expect(night.eventCount).toBe(1);
  });

  it("rounds percentages to the nearest whole percent", () => {
    const result = bucketEventsByTimeOfDay([
      eventAt(10), // Morning
      eventAt(10), // Morning
      eventAt(14), // Afternoon
    ]);

    const morning = result.buckets.find((b) => b.bucket === "Morning")!;
    const afternoon = result.buckets.find((b) => b.bucket === "Afternoon")!;
    expect(morning.percentage).toBe(67);
    expect(afternoon.percentage).toBe(33);
  });

  it("every event belongs to exactly one bucket", () => {
    const hours = [0, 5, 12, 17, 21];
    const result = bucketEventsByTimeOfDay(hours.map((h) => eventAt(h)));

    const total = result.buckets.reduce((sum, b) => sum + b.eventCount, 0);
    expect(total).toBe(hours.length);
  });
});