/**
 * Shared card-density contract for Library, Movies, Media Search, and
 * TV-show Episode cards.
 *
 * Density affects presentation only (poster size, spacing, grid columns,
 * typography). It never changes which metadata is displayed or which actions
 * are available. All three densities are information-equivalent.
 */

export const DENSITIES = ["compact", "comfortable", "large"] as const;

export type CardDensity = (typeof DENSITIES)[number];

export const DEFAULT_DENSITY: CardDensity = "comfortable";

export const DENSITY_LABELS: Record<CardDensity, string> = {
  compact: "Compact",
  comfortable: "Comfortable",
  large: "Large",
};

export function isCardDensity(value: unknown): value is CardDensity {
  return (
    typeof value === "string" && DENSITIES.includes(value as CardDensity)
  );
}

/**
 * Grid column classes for Library/Movies card grid at each density.
 * Uses auto-fill with density-specific fixed track widths to avoid
 * fractional stretching. Cards are content-sized; unused horizontal
 * space appears only after the final card in a row.
 */
export const LIBRARY_GRID_COLUMNS: Record<CardDensity, string> = {
  compact: "grid-cols-[repeat(auto-fill,_minmax(160px,_160px))]",
  comfortable: "grid-cols-[repeat(auto-fill,_minmax(200px,_200px))]",
  large: "grid-cols-[repeat(auto-fill,_minmax(240px,_240px))]",
};

/**
 * Grid column lengths for Search card grid at each density.
 */
export const SEARCH_GRID_COLUMNS: Record<CardDensity, string> = {
  compact: "grid-cols-[repeat(auto-fill,_minmax(140px,_140px))]",
  comfortable: "grid-cols-[repeat(auto-fill,_minmax(180px,_180px))]",
  large: "grid-cols-[repeat(auto-fill,_minmax(220px,_220px))]",
};

/**
 * Grid column lengths for Episode card grid at each density.
 * Episode cards are 16:9 still-based cards with dense content (number badge,
 * title, runtime, air date, watched state, overview, full-width action), so
 * they use wider tracks than Library/Movies poster cards.
 */
export const EPISODE_GRID_COLUMNS: Record<CardDensity, string> = {
  compact: "grid-cols-[repeat(auto-fill,_minmax(240px,_240px))]",
  comfortable: "grid-cols-[repeat(auto-fill,_minmax(320px,_320px))]",
  large: "grid-cols-[repeat(auto-fill,_minmax(400px,_400px))]",
};

/**
 * Grid column classes for the Dashboard Continue Watching summary grid at
 * each density.
 *
 * Continue Watching cards are posterless summary cards with a dense content
 * stack (title, progress, up-next, full-width action), so they need wider
 * tracks than poster cards. From lg upwards the tracks are fluid: each density
 * sets a minimum track width (240px / 320px / 400px) and the tracks then share
 * the row width, so cards stretch to fill their row evenly instead of leaving
 * fixed-width slack. Below the lg breakpoint the grid intentionally stays a
 * single full-width column, so narrow screens never overflow and the card
 * keeps its established full-width presentation.
 *
 * auto-fill is used deliberately: it keeps a stable number of tracks per row
 * derived from the density minimum and shares the leftover row width across
 * those tracks. auto-fit must not be used because it collapses the empty
 * tracks of a partially filled row, which would stretch the remaining cards
 * (a single item would become full width) and break the row-width sharing
 * contract that density is supposed to control.
 */
export const DASHBOARD_GRID_COLUMNS: Record<CardDensity, string> = {
  compact: "grid-cols-1 lg:grid-cols-[repeat(auto-fill,_minmax(240px,_1fr))]",
  comfortable:
    "grid-cols-1 lg:grid-cols-[repeat(auto-fill,_minmax(320px,_1fr))]",
  large: "grid-cols-1 lg:grid-cols-[repeat(auto-fill,_minmax(400px,_1fr))]",
};

/**
 * Card gap classes for each density.
 */
export const CARD_GAP: Record<CardDensity, string> = {
  compact: "gap-3",
  comfortable: "gap-4",
  large: "gap-6",
};

/**
 * List item padding classes for each density.
 */
export const LIST_PADDING: Record<CardDensity, string> = {
  compact: "p-3",
  comfortable: "p-4",
  large: "p-5",
};

/**
 * List thumbnail dimensions for each density.
 */
export const LIST_THUMBNAIL: Record<CardDensity, string> = {
  compact: "h-14 w-10",
  comfortable: "h-16 w-12",
  large: "h-20 w-14",
};

/**
 * Card title typography classes for each density.
 */
export const CARD_TITLE_SIZE: Record<CardDensity, string> = {
  compact: "text-sm",
  comfortable: "text-base",
  large: "text-lg",
};
