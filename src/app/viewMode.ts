import { useEffect, useState } from "react";

import { settingsRepository } from "../database/repositories";

import type { ViewMode } from "../types";

export const LIBRARY_VIEW_MODE_SETTING_KEY = "library-view-mode";

export const SEARCH_VIEW_MODE_SETTING_KEY = "search-view-mode";

export const DEFAULT_VIEW_MODE: ViewMode = "grid";

export const VIEW_MODES: readonly ViewMode[] = ["grid", "list"];

export function isViewMode(value: unknown): value is ViewMode {
  return (
    typeof value === "string" && VIEW_MODES.includes(value as ViewMode)
  );
}

export async function loadViewMode(key: string): Promise<ViewMode> {
  const storedMode = await settingsRepository.get<string>(key);

  return isViewMode(storedMode) ? storedMode : DEFAULT_VIEW_MODE;
}

export async function saveViewMode(
  key: string,
  viewMode: ViewMode,
): Promise<void> {
  await settingsRepository.set(key, viewMode);
}

interface ViewModeState {
  viewMode: ViewMode;
  setViewMode: (viewMode: ViewMode) => void;
}

/*
 * Page-local view-mode preference backed by the settings store. The stored
 * value is only updated on an explicit user toggle; loading never writes and
 * falls back to the default when nothing valid is stored.
 */
export function useViewMode(key: string): ViewModeState {
  const [viewMode, setViewModeState] = useState<ViewMode>(DEFAULT_VIEW_MODE);

  useEffect(() => {
    let isActive = true;

    loadViewMode(key)
      .then((storedMode) => {
        if (isActive) {
          setViewModeState(storedMode);
        }
      })
      .catch((error: unknown) => {
        console.error("Failed to load view mode preference:", error);
      });

    return () => {
      isActive = false;
    };
  }, [key]);

  function updateViewMode(nextViewMode: ViewMode): void {
    setViewModeState(nextViewMode);

    saveViewMode(key, nextViewMode).catch((error: unknown) => {
      console.error("Failed to persist view mode preference:", error);
    });
  }

  return { viewMode, setViewMode: updateViewMode };
}
