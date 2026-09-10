import { useEffect, useState } from "react";

import { settingsRepository } from "../../database/repositories";

export const SIDEBAR_COLLAPSE_SETTING_KEY = "watchlog_ui_sidebar_collapsed";

export const DEFAULT_SIDEBAR_COLLAPSED = false;

export function isSidebarCollapsed(value: unknown): value is boolean {
  return typeof value === "boolean";
}

export async function loadSidebarCollapsed(): Promise<boolean> {
  const storedCollapsed = await settingsRepository.get<boolean>(
    SIDEBAR_COLLAPSE_SETTING_KEY,
  );

  return isSidebarCollapsed(storedCollapsed)
    ? storedCollapsed
    : DEFAULT_SIDEBAR_COLLAPSED;
}

export async function saveSidebarCollapsed(collapsed: boolean): Promise<void> {
  await settingsRepository.set(SIDEBAR_COLLAPSE_SETTING_KEY, collapsed);
}

interface SidebarCollapseState {
  isCollapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

/**
 * Shell-level desktop sidebar preference backed by the settings store. The
 * stored value is only updated on an explicit user toggle; loading never
 * writes and falls back to expanded (the default) when nothing valid is
 * stored. Follows the established useDensity/useViewMode persistence pattern.
 */
export function useSidebarCollapsed(): SidebarCollapseState {
  const [isCollapsed, setIsCollapsed] = useState(DEFAULT_SIDEBAR_COLLAPSED);

  useEffect(() => {
    let isActive = true;

    loadSidebarCollapsed()
      .then((storedCollapsed) => {
        if (isActive) {
          setIsCollapsed(storedCollapsed);
        }
      })
      .catch((error: unknown) => {
        console.error("Failed to load sidebar collapse preference:", error);
      });

    return () => {
      isActive = false;
    };
  }, []);

  function updateCollapsed(nextCollapsed: boolean): void {
    setIsCollapsed(nextCollapsed);

    saveSidebarCollapsed(nextCollapsed).catch((error: unknown) => {
      console.error("Failed to persist sidebar collapse preference:", error);
    });
  }

  return { isCollapsed, setCollapsed: updateCollapsed };
}
