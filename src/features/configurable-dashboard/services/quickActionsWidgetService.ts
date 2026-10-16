/**
 * Configurable Dashboard — Quick Actions widget data (Step 3).
 *
 * Compact shortcuts to common actions, reusing existing routes and navigation
 * patterns. No new backend or network dependency.
 */

export interface QuickAction {
  /** Stable action key used for rendering and testing. */
  id: "my-library" | "discover" | "mark-watched" | "import";
  /** Button label. */
  label: string;
  /** Navigation target. */
  route: string;
  /** Accessible label announced to assistive technology. */
  ariaLabel: string;
}

/** Approved quick actions in display order. */
export const QUICK_ACTIONS: readonly QuickAction[] = [
  {
    id: "my-library",
    label: "My Library",
    route: "/library",
    ariaLabel: "Open your library",
  },
  {
    id: "discover",
    label: "Discover",
    route: "/search",
    ariaLabel: "Discover titles",
  },
  {
    id: "mark-watched",
    label: "Mark Watched",
    route: "/library",
    ariaLabel: "Choose a show in your library to mark episodes watched",
  },
  {
    id: "import",
    label: "Import",
    route: "/settings",
    ariaLabel: "Open settings to import a TV Time export",
  },
] as const;

/** Maximum actions rendered in the compact widget. */
export const QUICK_ACTIONS_LIMIT = QUICK_ACTIONS.length;

/**
 * Returns the quick actions available for the widget, in display order.
 */
export function getQuickActions(): readonly QuickAction[] {
  return QUICK_ACTIONS;
}

export type QuickActionId = QuickAction["id"];
