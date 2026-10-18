import { packDesignAwareLayout } from "../../../domain/dashboardGrid";
import {
  getDefaultDashboardLayout,
  type DashboardWidgetLayout,
} from "../defaultLayout";
import { getWidgetDefinition } from "../widgetRegistry";
import { resolveSizes } from "./widgetGridConstraints";

/** Re-packs visible widgets by preferred dashboard role and compact grid fit. */
export function autoArrangeVisibleWidgets(
  layout: ReadonlyArray<DashboardWidgetLayout>,
): DashboardWidgetLayout[] {
  const visibleWidgets = layout.filter((item) => item.visible);

  for (const item of visibleWidgets) {
    const supportedSizes = resolveSizes(getWidgetDefinition(item.widgetId));
    if (
      !supportedSizes.some(
        (size) => size.w === item.w && size.h === item.h,
      )
    ) {
      throw new RangeError(
        `Widget ${item.widgetId} has a size not supported by its registry definition.`,
      );
    }
  }

  const preferredLayout = getDefaultDashboardLayout().widgets;
  return packDesignAwareLayout(
    visibleWidgets.map((item) => ({ ...item, x: 0, y: 0 })),
    preferredLayout,
  );
}
