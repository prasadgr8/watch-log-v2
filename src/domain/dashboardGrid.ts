/**
 * Pure grid geometry for the configurable dashboard.
 *
 * The feature adapter owns the application DashboardWidgetLayout type and
 * maps it through these generic helpers without exposing a library layout
 * contract to the rest of WatchLog.
 */

export const GRID_COLUMNS = 12 as const;

export interface DashboardGridItem {
  widgetId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  visible: boolean;
}

/** Moves a widget by grid cells while keeping its full span inside the grid. */
export function offsetPosition(
  item: Pick<DashboardGridItem, "x" | "y" | "w" | "h">,
  dx: number,
  dy: number,
): { x: number; y: number } {
  if (![item.x, item.y, item.w, item.h, dx, dy].every(Number.isFinite)) {
    throw new RangeError("Dashboard grid movement values must be finite.");
  }
  validateSpan(item.w, item.h);

  const maxX = Math.max(GRID_COLUMNS - item.w, 0);

  return {
    x: Math.min(Math.max(Math.round(item.x + dx), 0), maxX),
    y: Math.max(Math.round(item.y + dy), 0),
  };
}

/** Grid-cell rectangle for a widget. */
export function bounds(
  item: Readonly<Pick<DashboardGridItem, "x" | "y" | "w" | "h">>,
): { x: number; y: number; w: number; h: number } {
  return { x: item.x, y: item.y, w: item.w, h: item.h };
}

function validateSpan(w: number, h: number): void {
  if (
    !Number.isSafeInteger(w) ||
    !Number.isSafeInteger(h) ||
    w < 1 ||
    w > GRID_COLUMNS ||
    h < 1
  ) {
    throw new RangeError("Dashboard widget spans must be positive grid dimensions.");
  }
}

function compareScores(
  left: readonly number[],
  right: readonly number[],
): number {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return left[index] - right[index];
    }
  }
  return 0;
}

/**
 * Packs widgets deterministically, placing the requested active widget first
 * so a valid user destination is honored and other colliding widgets move.
 * The grid is vertically unbounded, so valid spans always fit after packing.
 */
export function tryPackLayout<T extends DashboardGridItem>(
  layout: ReadonlyArray<T>,
  priorityWidgetId?: string,
): T[] {
  const seenIds = new Set<string>();
  const candidates = layout.map((item) => {
    if (seenIds.has(item.widgetId)) {
      throw new RangeError(`Duplicate dashboard widget id: ${item.widgetId}`);
    }
    seenIds.add(item.widgetId);

    for (const value of [item.x, item.y, item.w, item.h]) {
      if (!Number.isFinite(value)) {
        throw new RangeError("Dashboard grid coordinates must be finite.");
      }
    }

    validateSpan(item.w, item.h);
    const w = item.w;
    const h = item.h;
    const roundedX = Math.round(item.x);
    const roundedY = Math.round(item.y);
    if (!Number.isSafeInteger(roundedX) || !Number.isSafeInteger(roundedY)) {
      throw new RangeError("Dashboard grid coordinates must be safe integers.");
    }
    return {
      item,
      x: Math.min(Math.max(roundedX, 0), GRID_COLUMNS - w),
      y: Math.max(roundedY, 0),
      w,
      h,
    };
  });

  if (priorityWidgetId) {
    const priorityIndex = candidates.findIndex(
      (candidate) => candidate.item.widgetId === priorityWidgetId,
    );
    if (priorityIndex > 0) {
      candidates.unshift(candidates.splice(priorityIndex, 1)[0]);
    }
  }

  const placed: Array<{ x: number; y: number; w: number; h: number }> = [];
  const positions = new Map<
    string,
    { x: number; y: number; w: number; h: number }
  >();

  for (const candidate of candidates) {
    let slot: { x: number; y: number } | undefined;

    for (let distance = 0; !slot; distance += 1) {
      const shell: Array<{ x: number; y: number }> = [];
      for (let x = 0; x <= GRID_COLUMNS - candidate.w; x += 1) {
        const horizontalDistance = Math.abs(x - candidate.x);
        const verticalDistance = distance - horizontalDistance;
        if (verticalDistance < 0) continue;

        const upperY = candidate.y - verticalDistance;
        const lowerY = candidate.y + verticalDistance;
        if (upperY >= 0) shell.push({ x, y: upperY });
        if (verticalDistance > 0) shell.push({ x, y: lowerY });
      }
      shell.sort((left, right) => left.y - right.y || left.x - right.x);

      slot = shell.find(({ x, y }) =>
        placed.every(
          (other) =>
            x + candidate.w <= other.x ||
            other.x + other.w <= x ||
            y + candidate.h <= other.y ||
            other.y + other.h <= y,
        ),
      );
    }

    const position = {
      x: slot.x,
      y: slot.y,
      w: candidate.w,
      h: candidate.h,
    };
    placed.push(position);
    positions.set(candidate.item.widgetId, position);
  }

  return layout.map((item) => ({
    ...item,
    ...positions.get(item.widgetId),
  }));
}

/** Packs valid widget geometry into the 12-column, vertically growing grid. */
export function computeLayoutPositions<T extends DashboardGridItem>(
  layout: ReadonlyArray<T>,
  priorityWidgetId?: string,
): T[] {
  return tryPackLayout(layout, priorityWidgetId);
}

/**
 * Packs widgets in stable role order, choosing the tightest available
 * rectangle before applying preferred placement hints as tie-breakers.
 */
export function packDesignAwareLayout<T extends DashboardGridItem>(
  layout: ReadonlyArray<T>,
  preferredLayout: ReadonlyArray<
    Pick<DashboardGridItem, "widgetId" | "x" | "y">
  >,
): T[] {
  const seenIds = new Set<string>();
  const preferredPositions = new Map(
    preferredLayout.map((item, index) => [
      item.widgetId,
      { x: item.x, y: item.y, index },
    ]),
  );
  const candidates = layout.map((item, index) => {
    if (seenIds.has(item.widgetId)) {
      throw new RangeError(`Duplicate dashboard widget id: ${item.widgetId}`);
    }
    seenIds.add(item.widgetId);

    for (const value of [item.x, item.y, item.w, item.h]) {
      if (!Number.isFinite(value)) {
        throw new RangeError("Dashboard grid coordinates must be finite.");
      }
    }
    validateSpan(item.w, item.h);

    const preferred = preferredPositions.get(item.widgetId);
    return {
      item,
      inputIndex: index,
      preferred: preferred ?? {
        x: 0,
        y: 0,
        index: preferredLayout.length + index,
      },
    };
  });
  candidates.sort(
    (left, right) =>
      left.preferred.index - right.preferred.index ||
      left.inputIndex - right.inputIndex,
  );

  const placed: Array<{
    widgetId: string;
    x: number;
    y: number;
    w: number;
    h: number;
  }> = [];
  const positions = new Map<string, { x: number; y: number }>();

  for (const candidate of candidates) {
    const bottom = placed.reduce(
      (current, item) => Math.max(current, item.y + item.h),
      0,
    );
    let best:
      | {
          x: number;
          y: number;
          score: readonly number[];
        }
      | undefined;

    for (let y = 0; y <= bottom; y += 1) {
      for (let x = 0; x <= GRID_COLUMNS - candidate.item.w; x += 1) {
        const proposed = {
          x,
          y,
          w: candidate.item.w,
          h: candidate.item.h,
        };
        if (
          placed.some(
            (other) =>
              x < other.x + other.w &&
              x + proposed.w > other.x &&
              y < other.y + other.h &&
              y + proposed.h > other.y,
          )
        ) {
          continue;
        }

        const rectangles = [
          ...placed,
          { ...proposed, widgetId: candidate.item.widgetId },
        ];
        const rows = new Map<number, Set<number>>();
        for (const rectangle of rectangles) {
          for (
            let row = rectangle.y;
            row < rectangle.y + rectangle.h;
            row += 1
          ) {
            let cells = rows.get(row);
            if (!cells) {
              cells = new Set<number>();
              rows.set(row, cells);
            }
            for (
              let column = rectangle.x;
              column < rectangle.x + rectangle.w;
              column += 1
            ) {
              cells.add(column);
            }
          }
        }

        let internalGaps = 0;
        let leftOffset = 0;
        for (const cells of rows.values()) {
          const columns = Array.from(cells);
          const minColumn = Math.min(...columns);
          const maxColumn = Math.max(...columns);
          internalGaps += maxColumn - minColumn + 1 - cells.size;
          leftOffset += minColumn;
        }

        const score = [
          Math.max(bottom, y + proposed.h),
          internalGaps,
          leftOffset,
          Math.abs(x - candidate.preferred.x) +
            Math.abs(y - candidate.preferred.y),
          y,
          x,
        ];
        if (!best || compareScores(score, best.score) < 0) {
          best = { x, y, score };
        }
      }
    }

    if (!best) {
      throw new RangeError(
        `Unable to place dashboard widget ${candidate.item.widgetId}.`,
      );
    }

    placed.push({
      widgetId: candidate.item.widgetId,
      x: best.x,
      y: best.y,
      w: candidate.item.w,
      h: candidate.item.h,
    });
    positions.set(candidate.item.widgetId, { x: best.x, y: best.y });
  }

  return layout.map((item) => ({
    ...item,
    ...positions.get(item.widgetId),
  }));
}

/** Backwards-compatible descriptive name for the deterministic packer. */
export function packLeftAlign<T extends DashboardGridItem>(
  layout: ReadonlyArray<T>,
  priorityWidgetId?: string,
): T[] {
  return computeLayoutPositions(layout, priorityWidgetId);
}
