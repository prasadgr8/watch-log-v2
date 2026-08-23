const TIMESTAMP_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;

const MAX_OFFSET_ITERATIONS = 4;

const timeZoneFormatters = new Map<string, Intl.DateTimeFormat>();

function getTimeZoneFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = timeZoneFormatters.get(timeZone);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });

    timeZoneFormatters.set(timeZone, formatter);
  }

  return formatter;
}

export function resolveTvTimeZone(value: string): string {
  const timeZone = value.trim();

  if (!timeZone) {
    throw new Error(
      "TV Time export is missing its timezone from the user.csv file.",
    );
  }

  try {
    getTimeZoneFormatter(timeZone);
  } catch {
    throw new Error(`Invalid TV Time export timezone: ${timeZone}`);
  }

  return timeZone;
}

function getTimeZoneOffsetMs(instant: number, timeZone: string): number {
  const parts = getTimeZoneFormatter(timeZone).formatToParts(
    new Date(instant),
  );

  const partValues = new Map(parts.map((part) => [part.type, part.value]));

  const year = Number(partValues.get("year"));
  const month = Number(partValues.get("month"));
  const day = Number(partValues.get("day"));
  const hour = Number(partValues.get("hour"));
  const minute = Number(partValues.get("minute"));
  const second = Number(partValues.get("second"));

  // The offset is the difference between the wall-clock representation of
  // `instant` in `timeZone` and the instant itself (local - UTC).
  return (
    Date.UTC(year, month - 1, day, hour, minute, second) - instant
  );
}

function isRealCalendarDateTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
): boolean {
  const date = new Date(
    Date.UTC(year, month - 1, day, hour, minute, second),
  );

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getUTCHours() === hour &&
    date.getUTCMinutes() === minute &&
    date.getUTCSeconds() === second
  );
}

export function parseTvTimeDate(value: string, timeZone: string): Date {
  const match = TIMESTAMP_PATTERN.exec(value.trim());

  if (!match) {
    throw new Error(`Invalid TV Time timestamp: ${value}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);

  if (!isRealCalendarDateTime(year, month, day, hour, minute, second)) {
    throw new Error(`Invalid TV Time timestamp: ${value}`);
  }

  const wallClockAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);

  let instant = wallClockAsUtc;

  for (let attempt = 0; attempt < MAX_OFFSET_ITERATIONS; attempt++) {
    const offsetMs = getTimeZoneOffsetMs(instant, timeZone);
    const nextInstant = wallClockAsUtc - offsetMs;

    if (nextInstant === instant) {
      break;
    }

    instant = nextInstant;
  }

  return new Date(instant);
}
