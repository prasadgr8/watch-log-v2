/**
 * Pure date-only domain semantics for episode air dates.
 *
 * Air dates arrive from TMDB as date-only `YYYY-MM-DD` strings (or are absent)
 * and are persisted verbatim: they carry no time-of-day and no timezone
 * information. This module therefore treats an air date as an opaque calendar
 * date — it never constructs or parses a JavaScript `Date` from one, never
 * converts one through UTC, and never invents time-of-day semantics.
 *
 * All functions are pure, O(1), and free of database, network, and UI
 * dependencies. The current clock never enters this module directly; callers
 * pass the relevant `Date` (or its derived local `YYYY-MM-DD` string) so
 * behavior stays deterministic and testable.
 */

/** Shape contract for a date-only air date string. */
const AIR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Calendar classification of an air date relative to a local "today". */
export type AirDateRelation =
  | "past"
  | "today"
  | "tomorrow"
  | "future"
  | "unknown";

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function getDaysInMonth(year: number, month: number): number {
  if (month === 2 && isLeapYear(year)) {
    return 29;
  }

  return DAYS_IN_MONTH[month - 1];
}

/**
 * Converts a validated `YYYY-MM-DD` string to a proleptic-Gregorian day
 * number (days from civil; the Unix-epoch offset makes day 0 = 1970-01-01).
 *
 * Integer-only calendar arithmetic: no `Date` objects, no timezone
 * conversion, and no DST-sensitive local-midnight arithmetic, so day
 * differences are exact calendar days.
 *
 * Precondition: `dateString` passed `isValidAirDate`.
 */
function toAirDateDayNumber(dateString: string): number {
  const year = Number(dateString.slice(0, 4));
  const month = Number(dateString.slice(5, 7));
  const day = Number(dateString.slice(8, 10));

  // Shift the year so the year starts in March (leap day falls at the end),
  // then count days with 400/100/4-year era arithmetic.
  const shiftedYear = month <= 2 ? year - 1 : year;
  const era = Math.floor(shiftedYear / 400);
  const yearOfEra = shiftedYear - era * 400;
  const dayOfYear =
    Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1;
  const dayOfEra =
    yearOfEra * 365 +
    Math.floor(yearOfEra / 4) -
    Math.floor(yearOfEra / 100) +
    dayOfYear;

  return era * 146097 + dayOfEra - 719468;
}

/**
 * Validates a raw air date value.
 *
 * Valid means exactly `YYYY-MM-DD` (four-digit year, two-digit month and day)
 * AND a real calendar date, so `2026-1-03`, `2026-01-3`, `2026-13-01`,
 * `2026-00-10`, `2026-04-31`, and non-leap `2026-02-29` are all rejected.
 * Calendar validity is checked with integer arithmetic, never by parsing the
 * string into a `Date`.
 *
 * `undefined` and `""` (and any other non-matching input) are invalid.
 */
export function isValidAirDate(value: string | undefined): boolean {
  if (value === undefined || !AIR_DATE_PATTERN.test(value)) {
    return false;
  }

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));

  if (month < 1 || month > 12) {
    return false;
  }

  return day >= 1 && day <= getDaysInMonth(year, month);
}

/**
 * Formats `now`'s LOCAL calendar date as `YYYY-MM-DD`.
 *
 * Uses the local-calendar getters exclusively (`getFullYear`, `getMonth`,
 * `getDate`) with zero padding, so the result is the user's local date and
 * never drifts through UTC (unlike `toISOString()`).
 *
 * The `Date` parameter exists only to make the current-clock dependency
 * deterministic and injectable in tests.
 */
export function getLocalDateString(now: Date): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Chronological comparator for two ALREADY-VALIDATED `YYYY-MM-DD` strings.
 *
 * Precondition: both inputs passed `isValidAirDate`. ISO date strings sort
 * chronologically, so the comparison is lexicographic and crosses month and
 * year boundaries correctly (e.g. `2026-12-31` < `2027-01-01`) without any
 * calendar math. Never parses either string into a `Date`.
 */
export function compareAirDates(a: string, b: string): -1 | 0 | 1 {
  if (a < b) {
    return -1;
  }

  if (a > b) {
    return 1;
  }

  return 0;
}

/**
 * Classifies an air date against the local `today` string (`YYYY-MM-DD`).
 *
 * - invalid / undefined air date → "unknown"
 * - air date before today → "past"
 * - equal to today → "today"
 * - exactly one calendar day after today → "tomorrow"
 * - more than one calendar day after today → "future"
 *
 * Calendar-day distance is computed with pure integer arithmetic
 * (`toAirDateDayNumber`), so DST and timezone transitions cannot distort the
 * "one day after" check. "Today" itself is expected to be a valid local
 * `YYYY-MM-DD` (as produced by `getLocalDateString`); an invalid `today`
 * yields "unknown" rather than guessing.
 */
export function getAirDateRelation(
  airDate: string | undefined,
  today: string,
): AirDateRelation {
  if (airDate === undefined || !isValidAirDate(airDate)) {
    return "unknown";
  }

  if (!isValidAirDate(today)) {
    return "unknown";
  }

  if (airDate < today) {
    return "past";
  }

  if (airDate === today) {
    return "today";
  }

  return toAirDateDayNumber(airDate) === toAirDateDayNumber(today) + 1
    ? "tomorrow"
    : "future";
}

/**
 * Relative label for an air date against the local `today` string.
 *
 * - today → "Airs today"
 * - tomorrow → "Airs tomorrow" (tomorrow owns the one-day case, so
 *   "Airs in 1 day" is never produced)
 * - two or more calendar days ahead → "Airs in N days" (N >= 2)
 * - past, unknown, or undefined → null (past is not an Upcoming label)
 *
 * Uses exact calendar-day arithmetic; no approximate durations and no
 * time-of-day wording.
 */
export function getRelativeAirDateLabel(
  airDate: string | undefined,
  today: string,
): string | null {
  if (airDate === undefined || !isValidAirDate(airDate)) {
    return null;
  }

  const relation = getAirDateRelation(airDate, today);

  if (relation === "today") {
    return "Airs today";
  }

  if (relation === "tomorrow") {
    return "Airs tomorrow";
  }

  if (relation === "future") {
    const daysAhead = toAirDateDayNumber(airDate) - toAirDateDayNumber(today);

    return `Airs in ${daysAhead} days`;
  }

  return null;
}