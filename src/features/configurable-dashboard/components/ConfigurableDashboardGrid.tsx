import { useEffect, useRef, useState } from "react";
import { Grip, Maximize2 } from "lucide-react";

import DashboardWidgetCard from "./DashboardWidgetCard";
import type { DashboardWidgetLayout } from "../defaultLayout";
import { WIDGET_REGISTRY } from "../widgetRegistry";
import {
  GRID_ROW_HEIGHT_PX,
  useGridInteraction,
} from "../services/gridInteractionService";

interface ConfigurableDashboardGridProps {
  layout: DashboardWidgetLayout[];
  /** Receives the packed layout after each drag/resize step (Step 5). */
  onLayoutChange: (next: DashboardWidgetLayout[]) => void;
  /** Hides a widget via the approved widget menu action. */
  onHideWidget?: (widgetId: DashboardWidgetLayout["widgetId"]) => void;
  /** Restores a widget to its registry default size via the menu. */
  onResetWidgetSize?: (widgetId: DashboardWidgetLayout["widgetId"]) => void;
}

/*
 * Maps a 12-column desktop span to the established tablet flow columns.
 */
function spanClassForWidth(w: number): string {
  if (w <= 4) {
    return "col-span-1 md:col-span-3 lg:col-span-4";
  }

  if (w <= 6) {
    return "col-span-1 md:col-span-3 lg:col-span-6";
  }

  if (w <= 8) {
    return "col-span-1 md:col-span-6 lg:col-span-8";
  }

  return "col-span-1 md:col-span-6 lg:col-span-12";
}

/*
 * Mobile and tablet keep the existing responsive flow and expose compact
 * keyboard move/resize controls. Desktop uses the application grid
 * coordinates, where pointer interactions are also enabled.
 */
export default function ConfigurableDashboardGrid({
  layout,
  onLayoutChange,
  onHideWidget,
  onResetWidgetSize,
}: ConfigurableDashboardGridProps) {
  const gridRef = useRef<HTMLUListElement>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  /*
   * Pointer drag/resize uses desktop grid coordinates. The keyboard controls
   * remain rendered at every breakpoint and operate on the same application
   * grid model while the visual layout flows responsively below desktop.
   */
  useEffect(() => {
    // Environments without matchMedia (headless DOMs, very old browsers)
    // fall back to the responsive flow layout, which is always safe.
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const visibleWidgets = layout.filter((item) => item.visible);

  const {
    activeInteraction,
    announcement,
    handleMoveKeyDown,
    handleResizeKeyDown,
  } = useGridInteraction({
    layout: visibleWidgets,
    onLayoutChange,
    gridRef,
  });

  return (
    <>
      <ul
        ref={gridRef}
        aria-label="Dashboard widgets"
        className="grid w-full min-w-0 grid-cols-1 gap-4 overflow-hidden md:grid-cols-6 md:gap-5 lg:grid-cols-12 lg:gap-6"
        style={
          isDesktop
            ? { gridAutoRows: `minmax(${GRID_ROW_HEIGHT_PX}px, auto)` }
            : undefined
        }
      >
        {visibleWidgets.map((item) => {
          const definition = WIDGET_REGISTRY[item.widgetId];
          const active = activeInteraction?.widgetId === item.widgetId;
          const isMoving = active && activeInteraction.action === "move";

          const moveHandle = (
            <button
              type="button"
              data-action-move="move"
              data-widget-id={item.widgetId}
              data-drag-handle="true"
              aria-label={`Move ${definition.title} widget. Current position: column ${item.x + 1}, row ${item.y + 1}. Use arrow keys to move one grid cell.`}
              aria-describedby="dashboard-grid-instructions"
              aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown"
              onKeyDown={(event) => handleMoveKeyDown(item.widgetId, event)}
              className={`flex h-8 w-8 shrink-0 cursor-grab select-none touch-none items-center justify-center rounded p-1 transition hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40 motion-reduce:transition-none ${
                isMoving ? "cursor-grabbing text-accent" : "text-muted"
              }`}
            >
              <Grip aria-hidden="true" className="h-4 w-4" />
            </button>
          );

          const resizeHandle = (
            <button
              type="button"
              data-action-resize="resize"
              data-widget-id={item.widgetId}
              aria-label={`Resize ${definition.title} widget. Current size: ${item.w} columns by ${item.h} ${item.h === 1 ? "row" : "rows"}. Use arrow keys to step through supported sizes.`}
              aria-describedby="dashboard-grid-instructions"
              aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown"
              onKeyDown={(event) => handleResizeKeyDown(item.widgetId, event)}
              className="flex h-8 w-8 shrink-0 cursor-nwse-resize select-none touch-none items-center justify-center rounded p-1 text-muted transition hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40 motion-reduce:transition-none"
            >
              <Maximize2 aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          );

          return (
            <li
              key={item.widgetId}
              data-dragging={isMoving ? "true" : undefined}
              data-resizing={
                active && activeInteraction.action === "resize"
                  ? "true"
                  : undefined
              }
              className={
                isDesktop
                  ? `min-h-0 min-w-0 self-start ${active ? "rounded-xl ring-2 ring-accent/60" : ""}`
                  : `min-w-0 ${spanClassForWidth(item.w)}`
              }
              style={
                isDesktop
                  ? {
                      gridColumn: `${item.x + 1} / span ${item.w}`,
                      gridRow: `${item.y + 1} / span ${item.h}`,
                    }
                  : undefined
              }
            >
              <DashboardWidgetCard
                widget={definition}
                dragHandle={moveHandle}
                resizeHandle={resizeHandle}
                onHideWidget={onHideWidget}
                onResetWidgetSize={onResetWidgetSize}
              />
            </li>
          );
        })}
      </ul>
      <p
        id="dashboard-grid-instructions"
        className="sr-only"
      >
        Use arrow keys on a Move button to move one grid cell. On a Resize
        button, use Right or Down to grow and Left or Up to shrink through
        supported sizes. Changes are announced here. Pointer drag and resize
        are available on desktop widths; keyboard controls work at every size.
      </p>
      <p
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </p>
    </>
  );
}
