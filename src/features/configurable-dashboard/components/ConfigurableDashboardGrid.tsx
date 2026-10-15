import DashboardWidgetCard from "./DashboardWidgetCard";
import type { DashboardWidgetLayout } from "../defaultLayout";
import { WIDGET_REGISTRY } from "../widgetRegistry";

interface ConfigurableDashboardGridProps {
  layout: DashboardWidgetLayout[];
}

/*
 * Maps a 12-column desktop span to Tailwind grid column classes. Tablet uses
 * a 6-column grid and mobile a single column; spans at or below half width
 * take half the tablet row, wider spans take the full row. Placement flows
 * from DOM order so future interaction steps can reorder items without
 * fighting the layout.
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
 * Responsive grid foundation: 1 column on mobile, 6 on tablet, 12 on
 * desktop. Pure CSS grid with DOM-order flow; future interaction steps
 * attach later without layout redesign.
 */
export default function ConfigurableDashboardGrid({
  layout,
}: ConfigurableDashboardGridProps) {
  const visibleWidgets = layout.filter((item) => item.visible);

  return (
    <ul
      aria-label="Dashboard widgets"
      className="grid w-full min-w-0 grid-cols-1 gap-4 md:grid-cols-6 md:gap-5 lg:grid-cols-12 lg:gap-6"
    >
      {visibleWidgets.map((item) => (
        <li
          key={item.widgetId}
          className={`min-w-0 ${spanClassForWidth(item.w)}`}
        >
          <DashboardWidgetCard widget={WIDGET_REGISTRY[item.widgetId]} />
        </li>
      ))}
    </ul>
  );
}
