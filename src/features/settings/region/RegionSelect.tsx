import { ChevronDown, Globe } from "lucide-react";

import {
  AVAILABILITY_REGIONS,
  getRegionFlag,
  getRegionName,
  type AvailabilityRegionCode,
} from "./availabilityRegion";

interface RegionSelectProps {
  value: AvailabilityRegionCode;
  onChange: (code: AvailabilityRegionCode) => void;
  variant?: "compact" | "field";
  id?: string;
  className?: string;
}

/*
 * Shared native select for the streaming availability region. Header and
 * Settings use the same catalogue through the same RegionProvider state, so a
 * choice made in either surface persists identically.
 *
 * - "compact" (header): a decorative chip (globe, flag, name on sm+,
 *   chevron) with the transparent native select stretched over it, so the
 *   control stays a native element (keyboard, screen reader, and mobile
 *   native picker all work) while remaining compact on small screens. The
 *   focus ring is drawn on the wrapper via has-[:focus-visible].
 * - "field" (settings / first-run dialog): the app's standard select styling.
 */
export default function RegionSelect({
  value,
  onChange,
  variant = "field",
  id,
  className = "",
}: RegionSelectProps) {
  const regionName = getRegionName(value);
  const regionFlag = getRegionFlag(value);
  const accessibleName = `Streaming availability region: ${regionName}`;

  const options = AVAILABILITY_REGIONS.map((region) => (
    <option key={region.code} value={region.code}>
      {region.flag} {region.name}
    </option>
  ));

  if (variant === "compact") {
    return (
      <span
        className={`relative inline-flex rounded-md has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent-hover/40 ${className}`}
      >
        <span
          aria-hidden="true"
          className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-primary transition hover:bg-surface-hover"
        >
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">
            {regionFlag} {regionName}
          </span>
          <span className="sm:hidden">{regionFlag}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted" />
        </span>

        <select
          aria-label={accessibleName}
          title={accessibleName}
          value={value}
          onChange={(event) =>
            onChange(event.target.value as AvailabilityRegionCode)
          }
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0 focus:outline-none focus:ring-0"
        >
          {options}
        </select>
      </span>
    );
  }

  return (
    <div className={className}>
      <select
        id={id}
        aria-label={id === undefined ? accessibleName : undefined}
        value={value}
        onChange={(event) =>
          onChange(event.target.value as AvailabilityRegionCode)
        }
        className="w-full rounded-lg border border-border bg-input-bg px-3 py-2 text-primary outline-none transition focus:border-accent-hover focus:ring-2 focus:ring-accent-hover/20"
      >
        {options}
      </select>
    </div>
  );
}