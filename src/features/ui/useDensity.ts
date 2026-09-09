import { useEffect, useState } from "react";

import { settingsRepository } from "../../database/repositories";

import {
  DEFAULT_DENSITY,
  isCardDensity,
  type CardDensity,
} from "./density";

interface DensityState {
  density: CardDensity;
  setDensity: (density: CardDensity) => void;
}

/**
 * Page-local card-density preference backed by the settings store. The stored
 * value is only updated on an explicit user selection; loading never writes
 * and falls back to the default when nothing valid is stored.
 *
 * Follows the established useViewMode persistence pattern.
 */
export function useDensity(key: string): DensityState {
  const [density, setDensityState] = useState<CardDensity>(DEFAULT_DENSITY);

  useEffect(() => {
    let isActive = true;

    loadDensity(key)
      .then((storedDensity) => {
        if (isActive) {
          setDensityState(storedDensity);
        }
      })
      .catch((error: unknown) => {
        console.error("Failed to load card density preference:", error);
      });

    return () => {
      isActive = false;
    };
  }, [key]);

  function updateDensity(nextDensity: CardDensity): void {
    setDensityState(nextDensity);

    saveDensity(key, nextDensity).catch((error: unknown) => {
      console.error("Failed to persist card density preference:", error);
    });
  }

  return { density, setDensity: updateDensity };
}

async function loadDensity(key: string): Promise<CardDensity> {
  const storedDensity = await settingsRepository.get<CardDensity>(key);

  return isCardDensity(storedDensity) ? storedDensity : DEFAULT_DENSITY;
}

async function saveDensity(
  key: string,
  density: CardDensity,
): Promise<void> {
  await settingsRepository.set(key, density);
}
