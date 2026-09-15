import { createContext, useContext } from "react";

import type {
  AvailabilityRegionCode,
  AvailabilityRegionStatus,
} from "./availabilityRegion";

export interface RegionContextValue {
  region: AvailabilityRegionCode;
  status: AvailabilityRegionStatus;
  selectRegion: (code: AvailabilityRegionCode) => void;
  openRegionSelection: () => void;
}

export const RegionContext = createContext<RegionContextValue | null>(null);

export function useRegion(): RegionContextValue {
  const context = useContext(RegionContext);

  if (!context) {
    throw new Error("useRegion must be used within a RegionProvider.");
  }

  return context;
}