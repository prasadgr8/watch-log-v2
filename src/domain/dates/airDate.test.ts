import { describe, expect, it } from "vitest";

import {
  compareAirDates,
  getAirDateRelation,
  getLocalDateString,
  getRelativeAirDateLabel,
  isValidAirDate,
} from "./airDate";

describe("isValidAirDate", () => {
  it("accepts a valid standard date", () => {
    expect(isValidAirDate("2026-01-03")).toBe(true);
    expect(isValidAirDate("2026-02-28")).toBe(true);
  });

  it("accepts a leap day in a leap year", () => {
    expect(isValidAirDate("2028-02-29")).toBe(true);
  });

  it("accepts a century leap day divisible by 400", () => {
    expect(isValidAirDate("2000-02-29")).toBe(true);
  });

  it("rejects Feb 29 in a non-leap year", () => {
    expect(isValidAirDate("2026-02-29")).toBe(false);
  });

  it("rejects Feb 29 in a century year divisible only by 100", () => {
    expect(isValidAirDate("1900-02-29")).toBe(false);
  });

  it("rejects month 00 and month 13", () => {
    expect(isValidAirDate("2026-00-10")).toBe(false);
    expect(isValidAirDate("2026-13-01")).toBe(false);
  });

  it("rejects day 00 and days beyond the month length", () => {
    expect(isValidAirDate("2026-01-00")).toBe(false);
    expect(isValidAirDate("2026-04-31")).toBe(false);
    expect(isValidAirDate("2026-02-30")).toBe(false);
  });

  it("rejects single-digit month or day", () => {
    expect(isValidAirDate("2026-1-03")).toBe(false);
    expect(isValidAirDate("2026-01-3")).toBe(false);
  });

  it("rejects arbitrary strings", () => {
    expect(isValidAirDate("abc")).toBe(false);
    expect(isValidAirDate("2026/01/03")).toBe(false);
    expect(isValidAirDate("2026-01-03T00:00:00Z")).toBe(false);
  });

  it("rejects empty string and undefined", () => {
    expect(isValidAirDate("")).toBe(false);
    expect(isValidAirDate(undefined)).toBe(false);
  });
});

describe("getLocalDateString", () => {
  // new Date(y, m, d, ...) builds a local-calendar Date and the function reads
  // it back with local getters, so these round-trips are timezone-independent
  // and never depend on the machine's timezone.
  it("formats the local calendar date with zero padding", () => {
    expect(getLocalDateString(new Date(2026, 6, 15, 23, 59))).toBe(
      "2026-07-15",
    );
    expect(getLocalDateString(new Date(2026, 2, 5))).toBe("2026-03-05");
    expect(getLocalDateString(new Date(2026, 0, 9))).toBe("2026-01-09");
  });

  it("stays on the local date across the January to February boundary", () => {
    expect(getLocalDateString(new Date(2026, 0, 31, 23, 59))).toBe(
      "2026-01-31",
    );
    expect(getLocalDateString(new Date(2026, 1, 1, 0, 0))).toBe("2026-02-01");
  });

  it("stays on the local date across the December to January boundary", () => {
    expect(getLocalDateString(new Date(2026, 11, 31, 23, 59))).toBe(
      "2026-12-31",
    );
    expect(getLocalDateString(new Date(2027, 0, 1, 0, 0))).toBe("2027-01-01");
  });
});

describe("compareAirDates", () => {
  it("orders earlier, same, and later dates", () => {
    expect(compareAirDates("2026-01-03", "2026-06-15")).toBe(-1);
    expect(compareAirDates("2026-06-15", "2026-06-15")).toBe(0);
    expect(compareAirDates("2026-06-15", "2026-01-03")).toBe(1);
  });

  it("crosses the year boundary correctly", () => {
    expect(compareAirDates("2026-12-31", "2027-01-01")).toBe(-1);
    expect(compareAirDates("2027-01-01", "2026-12-31")).toBe(1);
  });

  it("sorts several valid dates chronologically", () => {
    const dates = ["2027-01-01", "2025-05-05", "2026-12-31", "2026-01-01"];

    expect([...dates].sort(compareAirDates)).toEqual([
      "2025-05-05",
      "2026-01-01",
      "2026-12-31",
      "2027-01-01",
    ]);
  });
});

describe("getAirDateRelation", () => {
  const today = "2026-07-15";

  it("classifies past dates", () => {
    expect(getAirDateRelation("2026-07-14", today)).toBe("past");
    expect(getAirDateRelation("2020-01-01", today)).toBe("past");
  });

  it("classifies today", () => {
    expect(getAirDateRelation("2026-07-15", today)).toBe("today");
  });

  it("classifies tomorrow as exactly one calendar day after today", () => {
    expect(getAirDateRelation("2026-07-16", today)).toBe("tomorrow");
  });

  it("classifies further dates as future", () => {
    expect(getAirDateRelation("2026-07-17", today)).toBe("future");
    expect(getAirDateRelation("2027-01-01", today)).toBe("future");
  });

  it("classifies invalid and undefined air dates as unknown", () => {
    expect(getAirDateRelation(undefined, today)).toBe("unknown");
    expect(getAirDateRelation("", today)).toBe("unknown");
    expect(getAirDateRelation("2026-02-29", today)).toBe("unknown");
    expect(getAirDateRelation("2026-1-03", today)).toBe("unknown");
  });

  it("treats an invalid today as unknown rather than guessing", () => {
    expect(getAirDateRelation("2026-07-16", "not-a-date")).toBe("unknown");
  });
});

describe("getRelativeAirDateLabel", () => {
  const today = "2026-07-15";

  it("labels today", () => {
    expect(getRelativeAirDateLabel("2026-07-15", today)).toBe("Airs today");
  });

  it("labels tomorrow", () => {
    expect(getRelativeAirDateLabel("2026-07-16", today)).toBe("Airs tomorrow");
  });

  it("never returns a one-day future label", () => {
    expect(getRelativeAirDateLabel("2026-07-16", today)).not.toBe(
      "Airs in 1 day",
    );
  });

  it("labels two or more days ahead", () => {
    expect(getRelativeAirDateLabel("2026-07-17", today)).toBe("Airs in 2 days");
    expect(getRelativeAirDateLabel("2026-07-23", today)).toBe("Airs in 8 days");
    expect(getRelativeAirDateLabel("2027-01-01", today)).toBe(
      "Airs in 170 days",
    );
  });

  it("returns null for past dates", () => {
    expect(getRelativeAirDateLabel("2026-07-14", today)).toBeNull();
  });

  it("returns null for invalid and undefined air dates", () => {
    expect(getRelativeAirDateLabel(undefined, today)).toBeNull();
    expect(getRelativeAirDateLabel("", today)).toBeNull();
    expect(getRelativeAirDateLabel("2026-04-31", today)).toBeNull();
  });
});

describe("air date calendar boundaries", () => {
  it("treats 2027-01-01 as one day after 2026-12-31", () => {
    expect(getAirDateRelation("2027-01-01", "2026-12-31")).toBe("tomorrow");
    expect(getRelativeAirDateLabel("2027-01-01", "2026-12-31")).toBe(
      "Airs tomorrow",
    );
  });

  it("treats leap day 2028-02-29 as one day after 2028-02-28", () => {
    expect(getAirDateRelation("2028-02-29", "2028-02-28")).toBe("tomorrow");
  });

  it("treats 2028-03-01 as one day after leap day 2028-02-29", () => {
    expect(getAirDateRelation("2028-03-01", "2028-02-29")).toBe("tomorrow");
    expect(getRelativeAirDateLabel("2028-03-01", "2028-02-29")).toBe(
      "Airs tomorrow",
    );
  });

  it("treats 2026-03-01 as one day after 2026-02-28 in a non-leap year", () => {
    expect(getAirDateRelation("2026-03-01", "2026-02-28")).toBe("tomorrow");
  });

  it("counts exact calendar days across the leap day", () => {
    expect(getRelativeAirDateLabel("2028-03-01", "2028-02-27")).toBe(
      "Airs in 3 days",
    );
  });
});