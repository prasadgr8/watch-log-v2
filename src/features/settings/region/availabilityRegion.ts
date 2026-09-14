import { settingsRepository } from "../../../database/repositories";

/*
 * Streaming availability region preference (Alpha 26.1).
 *
 * A single per-user country code used as the availability region. The setting
 * is an ISO 3166-1 alpha-2 code persisted through the existing generic
 * settings repository ("availability-region" setting key, default "IN").
 *
 * The optional first-run hint is derived exclusively from the browser's
 * language/region settings (Accept-Language). It is a *suggestion* for the
 * user to confirm — not physical location detection. It never requests
 * geolocation permission, never reads coordinates or IP addresses, never
 * consults the timezone, and never contacts TMDB.
 */

export const AVAILABILITY_REGION_SETTING_KEY = "availability-region";

export const DEFAULT_AVAILABILITY_REGION = "IN" as const;

export interface AvailabilityRegionEntry {
  code: string;
  name: string;
  flag: string;
}

/*
 * Static catalogue of supported regions. Codes are persisted; names and flag
 * emoji are display-only. At minimum IN/US/GB/CA/AU are supported.
 */
export const AVAILABILITY_REGIONS: readonly AvailabilityRegionEntry[] = [
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
] as const;

export type AvailabilityRegionCode =
  (typeof AVAILABILITY_REGIONS)[number]["code"];

/**
 * Catalogue membership guard. Rejects anything outside AVAILABILITY_REGIONS,
 * including valid ISO codes the catalogue does not yet support.
 */
export function isAvailabilityRegion(
  value: unknown,
): value is AvailabilityRegionCode {
  return (
    typeof value === "string" &&
    AVAILABILITY_REGIONS.some((region) => region.code === value)
  );
}

export function getRegionName(code: AvailabilityRegionCode): string {
  return (
    AVAILABILITY_REGIONS.find((region) => region.code === code)?.name ?? code
  );
}

export function getRegionFlag(code: AvailabilityRegionCode): string {
  return (
    AVAILABILITY_REGIONS.find((region) => region.code === code)?.flag ?? ""
  );
}

export function getRegionLabel(code: AvailabilityRegionCode): string {
  return `${getRegionFlag(code)} ${getRegionName(code)}`;
}

/*
 * ---- Persistence ----
 * Load reads only and never writes; the only write path is
 * saveAvailabilityRegion, which is reached exclusively through an explicit
 * user confirmation or selection.
 */

export async function loadAvailabilityRegion(): Promise<
  AvailabilityRegionCode | undefined
> {
  const stored = await settingsRepository.get<string>(AVAILABILITY_REGION_SETTING_KEY);

  return isAvailabilityRegion(stored) ? stored : undefined;
}

export async function saveAvailabilityRegion(
  code: AvailabilityRegionCode,
): Promise<void> {
  await settingsRepository.set(AVAILABILITY_REGION_SETTING_KEY, code);
}
/*
 * ---- Browser-settings hint (NOT physical location detection) ----
 */

/**
 * Reads the browser's preferred language/region tag without requesting any
 * permission. Falls back to navigator.language and fails safely (undefined)
 * when the navigator API is unavailable or throws.
 */
export function getBrowserLocale(): string | undefined {
  if (typeof navigator === "undefined") {
    return undefined;
  }

  try {
    const languages = navigator.languages;

    const primary =
      Array.isArray(languages) && languages.length > 0
        ? languages[0]
        : undefined;

    return primary ?? navigator.language ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Extracts the 2-letter region subtag of a BCP-47/Posix locale tag
 * ("en-US" -> "US", "en_US" -> "US", "zh-Hans-CN" -> "CN"). Language-only tags
 * ("en"), numeric UN M49 regions ("es-419"), and malformed input return
 * undefined.
 */
export function parseRegionFromLocale(
  locale: string | undefined,
): string | undefined {
  if (typeof locale !== "string" || locale.trim().length === 0) {
    return undefined;
  }

  const parts = locale.split(/[-_]/);

  // The first token is the language subtag. The region is the first later
  // token shaped like an ISO 3166-1 alpha-2 code.
  for (let index = 1; index < parts.length; index += 1) {
    const part = parts[index];

    if (part !== undefined && /^[A-Za-z]{2}$/.test(part)) {
      return part.toUpperCase();
    }
  }

  return undefined;
}

/**
 * Returns a supported availability region suggested by the browser's
 * language/region settings, or undefined when the locale carries no usable
 * region or the region is not in the supported catalogue. The result is a
 * hint only, never persisted here and never a physical location claim.
 */
export function detectAvailabilityRegionFromLocale(
  locale: string | undefined = getBrowserLocale(),
): AvailabilityRegionCode | undefined {
  const region = parseRegionFromLocale(locale);

  if (region === undefined || !isAvailabilityRegion(region)) {
    return undefined;
  }

  return region;
}

/*
 * ---- First-run decision ----
 */

export type AvailabilityRegionStatus = "ready" | "suggest" | "choose";

export interface ResolvedAvailabilityRegionState {
  region: AvailabilityRegionCode;
  status: AvailabilityRegionStatus;
  suggestedRegion: AvailabilityRegionCode | null;
}

/**
 * Pure first-run decision:
 * - A previously saved valid region always wins: the locale hint is not
 *   consulted, so a saved region is never silently changed and never
 *   re-confirmed.
 * - Without a saved region, a supported locale hint produces a suggestion
 *   (status "suggest"); a missing/unsupported hint produces a manual selector
 *   (status "choose") presenting DEFAULT_AVAILABILITY_REGION as the default.
 */
export function resolveAvailabilityRegionState(
  stored: AvailabilityRegionCode | undefined,
  suggested: AvailabilityRegionCode | undefined,
): ResolvedAvailabilityRegionState {
  if (stored !== undefined) {
    return { region: stored, status: "ready", suggestedRegion: null };
  }

  if (suggested !== undefined) {
    return {
      region: suggested,
      status: "suggest",
      suggestedRegion: suggested,
    };
  }

  return {
    region: DEFAULT_AVAILABILITY_REGION,
    status: "choose",
    suggestedRegion: null,
  };
}