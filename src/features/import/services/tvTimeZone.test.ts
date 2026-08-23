import { describe, expect, it } from "vitest";

import { parseTvTimeDate, resolveTvTimeZone } from "./tvTimeZone";

describe("resolveTvTimeZone", () => {
  it("returns a valid IANA timezone unchanged", () => {
    expect(resolveTvTimeZone(" Asia/Kolkata ")).toBe("Asia/Kolkata");
  });

  it("throws for an unknown IANA timezone", () => {
    expect(() => resolveTvTimeZone("Not/AZone")).toThrow(
      "Invalid TV Time export timezone: Not/AZone",
    );
  });

  it("throws for a missing timezone", () => {
    expect(() => resolveTvTimeZone("")).toThrow(
      "TV Time export is missing its timezone from the user.csv file.",
    );
    expect(() => resolveTvTimeZone("   ")).toThrow(
      "TV Time export is missing its timezone from the user.csv file.",
    );
  });
});

describe("parseTvTimeDate", () => {
  it("converts a Kolkata wall-clock timestamp to the correct instant", () => {
    expect(
      parseTvTimeDate("2018-10-18 12:56:10", "Asia/Kolkata").toISOString(),
    ).toBe("2018-10-18T07:26:10.000Z");
  });

  it("converts a Kolkata midnight timestamp to the previous UTC day", () => {
    expect(
      parseTvTimeDate("2020-01-01 00:00:00", "Asia/Kolkata").toISOString(),
    ).toBe("2019-12-31T18:30:00.000Z");
  });

  it("applies the EST offset for New York winter timestamps", () => {
    expect(
      parseTvTimeDate("2021-01-14 10:00:00", "America/New_York").toISOString(),
    ).toBe("2021-01-14T15:00:00.000Z");
  });

  it("applies the EDT offset for New York summer timestamps", () => {
    expect(
      parseTvTimeDate("2021-03-14 10:00:00", "America/New_York").toISOString(),
    ).toBe("2021-03-14T14:00:00.000Z");
  });

  it("maps an ambiguous fall-back timestamp to the earlier offset", () => {
    expect(
      parseTvTimeDate("2021-11-07 01:30:00", "America/New_York").toISOString(),
    ).toBe("2021-11-07T05:30:00.000Z");
  });

  it("maps a nonexistent spring-forward timestamp after the transition", () => {
    expect(
      parseTvTimeDate("2021-03-14 02:30:00", "America/New_York").toISOString(),
    ).toBe("2021-03-14T06:30:00.000Z");
  });

  it("trims surrounding whitespace from the timestamp", () => {
    expect(
      parseTvTimeDate("  2018-10-18 12:56:10  ", "Asia/Kolkata").toISOString(),
    ).toBe("2018-10-18T07:26:10.000Z");
  });

  it("throws for an invalid timestamp format", () => {
    expect(() => parseTvTimeDate("2018-10-18", "Asia/Kolkata")).toThrow(
      "Invalid TV Time timestamp: 2018-10-18",
    );
    expect(() => parseTvTimeDate("not a timestamp", "Asia/Kolkata")).toThrow(
      "Invalid TV Time timestamp: not a timestamp",
    );
  });

  it("throws for out-of-range timestamp components", () => {
    expect(() =>
      parseTvTimeDate("2018-13-01 10:00:00", "Asia/Kolkata"),
    ).toThrow("Invalid TV Time timestamp: 2018-13-01 10:00:00");
    expect(() =>
      parseTvTimeDate("2018-01-32 10:00:00", "Asia/Kolkata"),
    ).toThrow("Invalid TV Time timestamp: 2018-01-32 10:00:00");
    expect(() =>
      parseTvTimeDate("2018-02-29 10:00:00", "Asia/Kolkata"),
    ).toThrow("Invalid TV Time timestamp: 2018-02-29 10:00:00");
    expect(() =>
      parseTvTimeDate("2018-01-01 24:00:00", "Asia/Kolkata"),
    ).toThrow("Invalid TV Time timestamp: 2018-01-01 24:00:00");
    expect(() =>
      parseTvTimeDate("2018-01-01 10:60:00", "Asia/Kolkata"),
    ).toThrow("Invalid TV Time timestamp: 2018-01-01 10:60:00");
  });
});
