/**
 * Adapter between pointer/keyboard input and the configurable dashboard's
 * application layout model. All placement and collision work remains in the
 * pure grid domain module.
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import {
  GRID_COLUMNS,
  offsetPosition,
  tryPackLayout,
} from "../../../domain/dashboardGrid";
import type { DashboardWidgetLayout } from "../defaultLayout";
import {
  resizeDownFrom,
  resizeUpFrom,
  resolveSizes,
} from "./widgetGridConstraints";
import {
  getWidgetDefinition,
  isConfigurableDashboardWidgetId,
  type ConfigurableDashboardWidgetId,
} from "../widgetRegistry";

/** Uniform desktop row height in CSS pixels; the column/row gaps are measured. */
export const GRID_ROW_HEIGHT_PX = 128;

type GridAction = "move" | "resize";

interface UseGridInteractionOptions {
  layout: DashboardWidgetLayout[];
  onLayoutChange: (next: DashboardWidgetLayout[]) => void;
  gridRef: React.RefObject<HTMLElement | null>;
}

interface PointerInteraction {
  widgetId: ConfigurableDashboardWidgetId;
  action: GridAction;
  initialLayout: DashboardWidgetLayout[];
  initialItem: DashboardWidgetLayout;
  startX: number;
  startY: number;
}

interface GridPitch {
  column: number;
  row: number;
}

function cssPixels(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getGridPitch(grid: HTMLElement | null): GridPitch {
  if (!grid) return { column: 1, row: GRID_ROW_HEIGHT_PX };

  const rect = grid.getBoundingClientRect();
  const style = window.getComputedStyle(grid);
  const columnGap = cssPixels(style.columnGap);
  const rowGap = cssPixels(style.rowGap);
  const columnWidth =
    rect.width > 0
      ? Math.max((rect.width - columnGap * (GRID_COLUMNS - 1)) / GRID_COLUMNS, 1)
      : 1;
  const rowHeight = cssPixels(style.gridAutoRows) || GRID_ROW_HEIGHT_PX;

  return {
    column: columnWidth + columnGap,
    row: rowHeight + rowGap,
  };
}

function findLayoutItem(
  layout: DashboardWidgetLayout[],
  widgetId: ConfigurableDashboardWidgetId,
): DashboardWidgetLayout | undefined {
  return layout.find((item) => item.widgetId === widgetId);
}

function describeSize(item: Pick<DashboardWidgetLayout, "w" | "h">): string {
  return `${item.w} columns by ${item.h} ${item.h === 1 ? "row" : "rows"}`;
}

export function useGridInteraction({
  layout,
  onLayoutChange,
  gridRef,
}: UseGridInteractionOptions) {
  const [activeInteraction, setActiveInteraction] =
    useState<Pick<PointerInteraction, "widgetId" | "action"> | null>(null);
  const [announcement, setAnnouncement] = useState(
    "Use the Move and Resize buttons to change widget placement and size.",
  );

  const pointerRef = useRef<PointerInteraction | null>(null);
  const layoutRef = useRef(layout);
  const changeRef = useRef(onLayoutChange);

  useLayoutEffect(() => {
    layoutRef.current = layout;
    changeRef.current = onLayoutChange;
  }, [layout, onLayoutChange]);

  const publishLayout = useCallback(
    (
      baseLayout: DashboardWidgetLayout[],
      widgetId: ConfigurableDashboardWidgetId,
      patch: Partial<DashboardWidgetLayout>,
      action: GridAction,
    ): void => {
      const before = findLayoutItem(baseLayout, widgetId);
      if (!before) return;
      const supportedSizes = resolveSizes(getWidgetDefinition(widgetId));
      if (
        !supportedSizes.some(
          (size) => size.w === before.w && size.h === before.h,
        )
      ) {
        throw new RangeError(
          `Widget ${widgetId} has a size not supported by its registry definition.`,
        );
      }

      const candidate = baseLayout.map((item) =>
        item.widgetId === widgetId ? { ...item, ...patch } : item,
      );
      const next = tryPackLayout(candidate, widgetId);

      const after = findLayoutItem(next, widgetId);
      if (
        !after ||
        (before.x === after.x &&
          before.y === after.y &&
          before.w === after.w &&
          before.h === after.h)
      ) {
        return;
      }

      layoutRef.current = next;
      changeRef.current(next);
      const title = getWidgetDefinition(widgetId).title;
      setAnnouncement(
        action === "move"
          ? `${title} moved to column ${after.x + 1}, row ${after.y + 1}.`
          : `${title} resized to ${describeSize(after)}.`,
      );
    },
    [],
  );

  const moveWidget = useCallback(
    (widgetId: ConfigurableDashboardWidgetId, dx: number, dy: number) => {
      const current = layoutRef.current;
      const item = findLayoutItem(current, widgetId);
      if (!item) return;

      const nextPosition = offsetPosition(item, dx, dy);
      publishLayout(current, widgetId, nextPosition, "move");
    },
    [publishLayout],
  );

  const stepResize = useCallback(
    (widgetId: ConfigurableDashboardWidgetId, direction: 1 | -1) => {
      const current = layoutRef.current;
      const item = findLayoutItem(current, widgetId);
      if (!item) return;

      const definition = getWidgetDefinition(widgetId);
      const availableSizes = resolveSizes(definition).filter(
        (size) => size.w <= GRID_COLUMNS - item.x,
      );
      const currentSize = { w: item.w, h: item.h };
      const nextSize =
        direction === 1
          ? resizeUpFrom(currentSize, availableSizes)
          : resizeDownFrom(currentSize, availableSizes);
      publishLayout(current, widgetId, nextSize, "resize");
    },
    [publishLayout],
  );

  const cancelPointerInteraction = useCallback(() => {
    const interaction = pointerRef.current;
    if (!interaction) return;

    layoutRef.current = interaction.initialLayout;
    changeRef.current(interaction.initialLayout);
    const title = getWidgetDefinition(interaction.widgetId).title;
    setAnnouncement(
      `${interaction.action === "move" ? "Move" : "Resize"} canceled. ${title} returned to its original position and size.`,
    );
    pointerRef.current = null;
    setActiveInteraction(null);
  }, []);

  useEffect(() => {
    const resolveHandle = (
      target: EventTarget | null,
    ):
      | {
          widgetId: ConfigurableDashboardWidgetId;
          action: GridAction;
        }
      | null => {
      if (!(target instanceof Element)) return null;

      const moveHandle = target.closest<HTMLElement>("[data-action-move]");
      const resizeHandle = target.closest<HTMLElement>("[data-action-resize]");
      const handle = moveHandle ?? resizeHandle;
      const widgetId = handle?.getAttribute("data-widget-id");

      if (!handle || !widgetId || !isConfigurableDashboardWidgetId(widgetId)) {
        return null;
      }

      return { widgetId, action: moveHandle ? "move" : "resize" };
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      if (
        typeof window.matchMedia !== "function" ||
        !window.matchMedia("(min-width: 1024px)").matches
      ) {
        return;
      }
      const resolved = resolveHandle(event.target);
      if (!resolved) return;

      const initialLayout = layoutRef.current.map((item) => ({ ...item }));
      const initialItem = findLayoutItem(initialLayout, resolved.widgetId);
      if (!initialItem) return;

      pointerRef.current = {
        ...resolved,
        initialLayout,
        initialItem,
        startX: event.clientX,
        startY: event.clientY,
      };
      setActiveInteraction({
        widgetId: resolved.widgetId,
        action: resolved.action,
      });
      const title = getWidgetDefinition(resolved.widgetId).title;
      setAnnouncement(
        `${resolved.action === "move" ? "Moving" : "Resizing"} ${title}. Press Escape to cancel.`,
      );
    };

    const onPointerMove = (event: PointerEvent) => {
      const interaction = pointerRef.current;
      if (!interaction) return;

      const pitch = getGridPitch(gridRef.current);
      const dx = Math.round((event.clientX - interaction.startX) / pitch.column);
      const dy = Math.round((event.clientY - interaction.startY) / pitch.row);

      if (interaction.action === "move") {
        const position = offsetPosition(interaction.initialItem, dx, dy);
        publishLayout(
          interaction.initialLayout,
          interaction.widgetId,
          position,
          "move",
        );
        return;
      }

      const definition = getWidgetDefinition(interaction.widgetId);
      const availableSizes = resolveSizes(definition).filter(
        (size) => size.w <= GRID_COLUMNS - interaction.initialItem.x,
      );
      // Follow the dominant snapped axis; ties favor horizontal movement.
      const steps = Math.abs(dx) >= Math.abs(dy) ? dx : dy;
      let size = {
        w: interaction.initialItem.w,
        h: interaction.initialItem.h,
      };

      for (let index = 0; index < Math.abs(steps); index += 1) {
        size =
          steps > 0
            ? resizeUpFrom(size, availableSizes)
            : resizeDownFrom(size, availableSizes);
      }
      publishLayout(
        interaction.initialLayout,
        interaction.widgetId,
        size,
        "resize",
      );
    };

    const onPointerUp = () => {
      const interaction = pointerRef.current;
      if (!interaction) return;

      const finalItem = findLayoutItem(
        layoutRef.current,
        interaction.widgetId,
      );
      if (finalItem) {
        const title = getWidgetDefinition(interaction.widgetId).title;
        setAnnouncement(
          interaction.action === "move"
            ? `Finished moving ${title} at column ${finalItem.x + 1}, row ${finalItem.y + 1}.`
            : `Finished resizing ${title} to ${describeSize(finalItem)}.`,
        );
      }
      pointerRef.current = null;
      setActiveInteraction(null);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && pointerRef.current) {
        event.preventDefault();
        cancelPointerInteraction();
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", cancelPointerInteraction);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", cancelPointerInteraction);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [cancelPointerInteraction, gridRef, publishLayout]);

  const handleMoveKeyDown = useCallback(
    (widgetId: ConfigurableDashboardWidgetId, event: React.KeyboardEvent) => {
      const deltaByKey: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      const delta = deltaByKey[event.key];
      if (!delta) return;

      event.preventDefault();
      moveWidget(widgetId, delta[0], delta[1]);
    },
    [moveWidget],
  );

  const handleResizeKeyDown = useCallback(
    (widgetId: ConfigurableDashboardWidgetId, event: React.KeyboardEvent) => {
      const directionByKey: Record<string, 1 | -1> = {
        ArrowRight: 1,
        ArrowDown: 1,
        ArrowLeft: -1,
        ArrowUp: -1,
      };
      const direction = directionByKey[event.key];
      if (!direction) return;

      event.preventDefault();
      stepResize(widgetId, direction);
    },
    [stepResize],
  );

  return {
    activeInteraction,
    announcement,
    handleMoveKeyDown,
    handleResizeKeyDown,
  };
}
