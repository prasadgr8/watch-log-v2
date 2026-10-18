import { GRID_COLUMNS } from "../../../domain/dashboardGrid";
import type { ConfigurableDashboardWidgetDefinition } from "../widgetRegistry";

export interface GridSize {
  w: number;
  h: number;
}

type WidgetSizeDefinition = Pick<
  ConfigurableDashboardWidgetDefinition,
  "defaultSize" | "minSize" | "supportedSizes"
>;

function isGridSize(size: GridSize): boolean {
  return (
    Number.isSafeInteger(size.w) &&
    Number.isSafeInteger(size.h) &&
    size.w >= 1 &&
    size.w <= GRID_COLUMNS &&
    size.h >= 1
  );
}

function isAtLeastMinimum(size: GridSize, minimum: GridSize): boolean {
  return size.w >= minimum.w && size.h >= minimum.h;
}

function sameSize(left: GridSize, right: GridSize): boolean {
  return left.w === right.w && left.h === right.h;
}

/** Returns registry sizes that satisfy the declared minimum and grid width. */
export function resolveSizes(definition: WidgetSizeDefinition): GridSize[] {
  if (
    !isGridSize(definition.minSize) ||
    !isGridSize(definition.defaultSize) ||
    !isAtLeastMinimum(definition.defaultSize, definition.minSize)
  ) {
    throw new RangeError("Widget registry has an invalid default or minimum grid size.");
  }

  const candidates =
    definition.supportedSizes.length > 0
      ? definition.supportedSizes
      : [definition.defaultSize];
  const unique = new Map<string, GridSize>();

  for (const size of candidates) {
    if (
      isGridSize(size) &&
      isAtLeastMinimum(size, definition.minSize)
    ) {
      unique.set(`${size.w},${size.h}`, { ...size });
    }
  }

  const sizes = [...unique.values()].sort(
    (left, right) =>
      left.w * left.h - right.w * right.h ||
      left.w - right.w ||
      left.h - right.h,
  );

  if (
    sizes.length === 0 ||
    !sizes.some((size) => sameSize(size, definition.defaultSize))
  ) {
    throw new RangeError(
      "Widget registry default size must be a supported grid size.",
    );
  }

  return sizes;
}

/** Returns a copy of the validated registry default size. */
export function defaultSizeFor(definition: WidgetSizeDefinition): GridSize {
  resolveSizes(definition);
  return { ...definition.defaultSize };
}

/** Snaps a candidate to a registry-supported size with a stable tie break. */
export function clampSpan(
  candidate: GridSize,
  definition: WidgetSizeDefinition,
): GridSize {
  if (!Number.isFinite(candidate.w) || !Number.isFinite(candidate.h)) {
    throw new RangeError("Dashboard widget sizes must be finite.");
  }

  const sizes = resolveSizes(definition);
  const nearest = sizes.reduce((best, size) => {
    const distance =
      Math.abs(size.w - candidate.w) + Math.abs(size.h - candidate.h);
    const bestDistance =
      Math.abs(best.w - candidate.w) + Math.abs(best.h - candidate.h);
    return distance < bestDistance ? size : best;
  });

  return { ...nearest };
}

export function resizeDownFrom(current: GridSize, sizes: GridSize[]): GridSize {
  const currentIndex = sizes.findIndex((size) => sameSize(size, current));
  const nextIndex = currentIndex < 0 ? 0 : Math.max(currentIndex - 1, 0);
  return { ...sizes[nextIndex] };
}

export function resizeUpFrom(current: GridSize, sizes: GridSize[]): GridSize {
  const currentIndex = sizes.findIndex((size) => sameSize(size, current));
  const nextIndex =
    currentIndex < 0
      ? sizes.length - 1
      : Math.min(currentIndex + 1, sizes.length - 1);
  return { ...sizes[nextIndex] };
}
