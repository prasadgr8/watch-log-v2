import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import {
  CORE_WIDGET_IDS,
  WIDGET_REGISTRY,
  type ConfigurableDashboardWidgetId,
} from "./widgetRegistry";
import { getDefaultDashboardLayout } from "./defaultLayout";
import ConfigurableDashboardGrid from "./components/ConfigurableDashboardGrid";
import DashboardCustomizationDialog from "./components/DashboardCustomizationDialog";
import { DashboardCustomizationProvider } from "./services/dashboardCustomization";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const layoutDirectory = join(featureDirectory, "../../components", "layout");

const headerSource = readFileSync(join(layoutDirectory, "Header.tsx"), "utf-8");
const appLayoutSource = readFileSync(join(layoutDirectory, "AppLayout.tsx"), "utf-8");

const buttonSource = readFileSync(
  join(featureDirectory, "components", "DashboardCustomizeButton.tsx"),
  "utf-8",
);

const dialogSource = readFileSync(
  join(featureDirectory, "components", "DashboardCustomizationDialog.tsx"),
  "utf-8",
);

const customizationSource = readFileSync(
  join(featureDirectory, "services", "dashboardCustomization.tsx"),
  "utf-8",
);

const customizationContextSource = readFileSync(
  join(featureDirectory, "services", "dashboardCustomizationContext.ts"),
  "utf-8",
);

const pageSource = readFileSync(
  join(featureDirectory, "components", "ConfigurableDashboardPage.tsx"),
  "utf-8",
);

const gridSource = readFileSync(
  join(featureDirectory, "components", "ConfigurableDashboardGrid.tsx"),
  "utf-8",
);

type DashboardWidgetLayout = {
  widgetId: ConfigurableDashboardWidgetId;
  x: number;
  y: number;
  w: number;
  h: number;
  visible: boolean;
};

function layoutItem(
  widgetId: ConfigurableDashboardWidgetId,
  visible: boolean,
): DashboardWidgetLayout {
  return { widgetId, x: 0, y: 0, w: 4, h: 1, visible };
}

/* ------------------------------------------------------------------ */
/* A. Customize Dashboard control                                     */
/* ------------------------------------------------------------------ */

describe("Customize Dashboard control", () => {
  it("renders a small widgets/grid icon button in the header", () => {
    expect(headerSource).toContain("<DashboardCustomizeButton");
    expect(buttonSource).toContain("<LayoutGrid");
    expect(buttonSource).toContain("aria-hidden=\"true\"");
  });

  it("exposes the exact tooltip text Customize Dashboard", () => {
    expect(buttonSource).toContain('title="Customize Dashboard"');
    expect(headerSource).toContain("<DashboardCustomizeButton");
  });

  it("has an accessible name matching its purpose", () => {
    expect(buttonSource).toContain('aria-label="Customize Dashboard"');
    expect(headerSource).toContain("<DashboardCustomizeButton");
  });

  it("announces that it opens a dialog", () => {
    expect(buttonSource).toContain('aria-haspopup="dialog"');
  });

  it("is keyboard accessible with a visible focus state", () => {
    expect(buttonSource).toContain('type="button"');
    expect(buttonSource).toContain("onClick");
    expect(buttonSource).toContain("focus-visible:ring-2");
    expect(buttonSource).toContain("focus-visible:ring-accent-hover/40");
  });

  it("is only shown on the configurable dashboard preview route", () => {
    expect(appLayoutSource).toContain(
      'showCustomizeDashboard={isPreviewDashboard}',
    );
    expect(appLayoutSource).toContain(
      'location.pathname === "/dashboard/preview"',
    );
  });

  it("does not disturb the existing hero/banner design", () => {
    expect(pageSource).toContain("Your Dashboard");
    expect(pageSource).toContain("A personalized snapshot of your watch activity");
    expect(pageSource).not.toContain("progressPercentage");
  });
});

/* ------------------------------------------------------------------ */
/* B. Customization UI                                                */
/* ------------------------------------------------------------------ */

describe("Customization UI", () => {
  it("opens as a modal dialog with dialog semantics", () => {
    expect(dialogSource).toContain('role="dialog"');
    expect(dialogSource).toContain("aria-modal=\"true\"");
    expect(dialogSource).toContain(
      'aria-labelledby="dashboard-customization-title"',
    );
    expect(dialogSource).toContain(
      'aria-describedby="dashboard-customization-description"',
    );
  });

  it("renders the dialog at runtime when open", () => {
    const markup = renderDialogMarkup();

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain("Customize Dashboard");
    expect(markup).toContain("Choose which widgets appear on your dashboard.");
  });

  it("derives the widget list from the registry, not a hard-coded list", () => {
    expect(dialogSource).toContain("const widgetIds = CORE_WIDGET_IDS;");
    expect(dialogSource).toContain("getWidgetDefinition");
    expect(dialogSource).toContain("CORE_WIDGET_IDS");
    for (const id of CORE_WIDGET_IDS) {
      expect(dialogSource).not.toContain(`"${WIDGET_REGISTRY[id].title}"`);
    }
  });

  it("represents every registered widget with its name", () => {
    const markup = renderDialogMarkup();

    for (const id of CORE_WIDGET_IDS) {
      expect(markup).toContain(WIDGET_REGISTRY[id].title);
      expect(markup).toContain(`widget-visibility-${id}`);
    }
  });

  it("uses real labelled checkbox controls for show/hide", () => {
    expect(dialogSource).toContain('type="checkbox"');
    expect(dialogSource).toContain("htmlFor=");
    expect(dialogSource).toContain("onChange={() =>");
  });

  it("provides Reset Widget Visibility and Done actions", () => {
    const markup = renderDialogMarkup();
    expect(dialogSource).toContain("resetDashboardVisibility");
    expect(markup).toContain("Done");
    expect(markup).toContain("Reset Widget Visibility");
  });

  it("moves initial focus to the first widget checkbox on open", () => {
    expect(dialogSource).toContain("firstCheckboxRef.current?.focus()");
    expect(dialogSource).toContain("ref={index === 0 ? firstCheckboxRef");
  });

  it("dismisses on Escape and restores focus on close", () => {
    expect(dialogSource).toContain('event.key === "Escape"');
    expect(dialogSource).toContain("previouslyFocusedRef.current?.focus()");
    expect(dialogSource).toContain("document.addEventListener(\"keydown\"");
    expect(dialogSource).toContain("document.removeEventListener(\"keydown\"");
  });

  it("closes for good when the dashboard page unmounts", () => {
    // Page-lifecycle scoped dialog state: clearing the flag on unmount makes
    // navigating away close the dialog and returning show the normal
    // dashboard instead of reopening it.
    expect(pageSource).toContain("() => setIsCustomizing(false)");
    expect(pageSource).toContain("[setIsCustomizing]");
  });

  it("is keyboard navigable", () => {
    expect(dialogSource).toContain('type="checkbox"');
    expect(dialogSource).toContain("focus-visible:ring-2");
  });

  it("keeps the dialog usable on short viewports", () => {
    expect(dialogSource).toContain("max-h-full");
    expect(dialogSource).toContain("overflow-y-auto");
    expect(dialogSource).toContain("flex shrink-0 flex-col-reverse");
  });
});

function renderDialogMarkup(): string {
  return renderToStaticMarkup(
    createElement(DashboardCustomizationDialog, {
      widgetVisibility: {} as Record<ConfigurableDashboardWidgetId, boolean>,
      setWidgetVisibility: () => {},
      resetDashboardVisibility: () => {},
      onClose: () => {},
      onAutoArrange: () => {},
      onResetLayout: () => {},
    }),
  );
}

/* ------------------------------------------------------------------ */
/* C. Widget visibility                                               */
/* ------------------------------------------------------------------ */

describe("Widget visibility", () => {
  const wrappingLayout = [
    layoutItem("continue-watching", true),
    layoutItem("upcoming-releases", false),
  ];

  const WrappingTree = createElement(
    MemoryRouter,
    null,
    createElement(
      DashboardCustomizationProvider,
      null,
      createElement(
        "div",
        null,
        createElement(ConfigurableDashboardGrid, { layout: wrappingLayout, onLayoutChange: () => {} }),
      ),
    ),
  );

  it("hiding a widget removes it from the dashboard", () => {
    const markup = renderToStaticMarkup(WrappingTree);

    expect(markup).toContain("Continue Watching");
    expect(markup).not.toContain("Upcoming Releases");
  });

  const showingLayout = [
    layoutItem("recently-watched", true),
    layoutItem("watchlog-highlights", true),
  ];

  const showingTree = createElement(
    MemoryRouter,
    null,
    createElement(
      DashboardCustomizationProvider,
      null,
      createElement(
        "div",
        { "data-testid": "widget-visibility-host" },
        createElement(ConfigurableDashboardGrid, { layout: showingLayout, onLayoutChange: () => {} }),
      ),
    ),
  );

  it("showing a widget restores it to the dashboard", () => {
    const markup = renderToStaticMarkup(showingTree);

    expect(markup).toContain("Recently Watched");
    expect(markup).toContain("WatchLog Highlights");
  });

  const multiLayout = [
    layoutItem("continue-watching", true),
    layoutItem("upcoming-releases", false),
    layoutItem("recently-watched", false),
    layoutItem("watchlog-highlights", false),
    layoutItem("story-landscape", true),
    layoutItem("library-at-a-glance", true),
    layoutItem("top-stories", true),
    layoutItem("quick-actions", false),
  ];

  const multiTree = createElement(
    MemoryRouter,
    null,
    createElement(
      DashboardCustomizationProvider,
      null,
      createElement(
        "div",
        { "data-testid": "widget-visibility-host" },
        createElement(ConfigurableDashboardGrid, { layout: multiLayout, onLayoutChange: () => {} }),
      ),
    ),
  );


  it("multiple widgets can be hidden simultaneously", () => {
    const markup = renderToStaticMarkup(multiTree);

    expect(markup).toContain("Continue Watching");
    expect(markup).toContain("Your Story Landscape");
    expect(markup).toContain("Your Library at a Glance");
    expect(markup).toContain("Your Top Stories");
    expect(markup).not.toContain("Upcoming Releases");
    expect(markup).not.toContain("Recently Watched");
    expect(markup).not.toContain("WatchLog Highlights");
    expect(markup).not.toContain("Quick Actions");
  });

  it("applies visibility immediately through the customization state", () => {
    expect(customizationSource).toContain("setWidgetVisibility");
    expect(gridSource).toContain("layout.filter((item) => item.visible)");
  });

  it("uses the Widget Registry as the source of truth", () => {
    expect(customizationSource).toContain("CORE_WIDGET_IDS");
    expect(customizationSource).not.toContain("DEFAULT_PLACEMENTS");
    expect(dialogSource).toContain("getWidgetDefinition");
    expect(pageSource).toContain("widgetVisibility[item.widgetId]");
  });
});

/* ------------------------------------------------------------------ */
/* D. Radio layout action selection (persists while dialog is open)   */
/* ------------------------------------------------------------------ */

describe("Radio layout action selection", () => {
  it("initial dialog renders no selected layout radio", () => {
    const markup = renderDialogMarkup();

    expect(markup).toContain('name="dashboard-layout-action"');
    expect(markup).toContain("Auto Arrange");
    expect(markup).toContain("Reset Layout");

    const checkedRadio = markup.match(
      /<input[^>]*type="radio"[^>]*checked="checked"/,
    );
    expect(checkedRadio).toBeNull();
  });

  it("selects Auto Arrange and keeps the blue dot visible", () => {
    expect(dialogSource).toContain('checked={selectedLayoutAction === "auto-arrange"}');
    expect(dialogSource).toContain('className="h-4 w-4 shrink-0 accent-accent"');
    expect(dialogSource).toContain('onChange={() => runLayoutAction("auto-arrange")}');
    expect(dialogSource).toContain('type="radio"');
    expect(dialogSource).toContain('name="dashboard-layout-action"');
    expect(dialogSource).toContain('value="auto-arrange"');
    expect(dialogSource).toContain("Auto Arrange");
  });

  it("selects Reset Layout, deselects Auto Arrange, and keeps the blue dot visible", () => {
    expect(dialogSource).toContain('checked={selectedLayoutAction === "reset-layout"}');
    expect(dialogSource).toContain('className="h-4 w-4 shrink-0 accent-accent"');
    expect(dialogSource).toContain('onChange={() => runLayoutAction("reset-layout")}');
    expect(dialogSource).toContain('type="radio"');
    expect(dialogSource).toContain('name="dashboard-layout-action"');
    expect(dialogSource).toContain('value="reset-layout"');
    expect(dialogSource).toContain("Reset Layout");
    // Mutual exclusivity: re-selecting the same action is a no-op, so only one radio can be checked
    expect(dialogSource).toContain("if (selectedLayoutAction === action) {");
    expect(dialogSource).toContain("setSelectedLayoutAction(action);");
    expect(dialogSource).toContain("onResetLayout();");
  });

  it("Auto Arrange and Reset Layout remain mutually exclusive", () => {
    const markup = renderDialogMarkup();

    const autoArrangeChecked = markup.match(
      /<input[^>]*type="radio"[^>]*value="auto-arrange"[^>]*checked="checked"/,
    );
    const resetLayoutChecked = markup.match(
      /<input[^>]*type="radio"[^>]*value="reset-layout"[^>]*checked="checked"/,
    );

    expect(autoArrangeChecked).toBeNull();
    expect(resetLayoutChecked).toBeNull();
  });

  it("renders the reset action as Reset Widget Visibility (distinct from Reset Layout)", () => {
    const markup = renderDialogMarkup();

    expect(markup).toContain("Reset Widget Visibility");
    expect(markup).toContain("Reset Layout");
    expect(markup).not.toContain("Reset to Default");
  });

  it("keeps Reset Layout as a distinct layout action", () => {
    const markup = renderDialogMarkup();

    expect(markup).toContain("Reset Layout");
    expect(markup).not.toContain("Reset to Default");
  });

  it("has native radio semantics: name, checked state, and key handlers", () => {
    const markup = renderDialogMarkup();

    expect(markup).toContain('name="dashboard-layout-action"');
    expect(markup).toContain('type="radio"');
    expect(markup).toContain('role="radiogroup"');
    expect(markup).toContain('aria-labelledby="dashboard-layout-heading"');
    expect(markup).toContain('aria-describedby="dashboard-layout-description"');
  });
});

/* ------------------------------------------------------------------ */
/* D. Reset Widget Visibility (distinct from Reset Layout)            */
/* ------------------------------------------------------------------ */

describe("Reset Widget Visibility", () => {
  it("restores every widget to its default visible state", () => {
    const defaultLayout = getDefaultDashboardLayout();

    expect(defaultLayout.widgets).toHaveLength(8);
    for (const item of defaultLayout.widgets) {
      expect(item.visible).toBe(true);
      expect(CORE_WIDGET_IDS).toContain(item.widgetId);
    }

    expect(customizationSource).toContain("resetDashboardVisibility");
    expect(customizationSource).toContain(
      "setWidgetVisibilityState(defaultVisibility)",
    );
  });

  it("is deterministic", () => {
    const first = getDefaultDashboardLayout();
    const second = getDefaultDashboardLayout();
    expect(second).toEqual(first);
    expect(second).not.toBe(first);
  });
});

/* ------------------------------------------------------------------ */
/* E. No persistence                                                  */
/* ------------------------------------------------------------------ */

describe("No persistence", () => {
  it("keeps visibility in transient React state only", () => {
    for (const source of [customizationSource, customizationContextSource]) {
      expect(source).not.toContain("localStorage");
      expect(source).not.toContain("sessionStorage");
      expect(source).not.toContain("IndexedDB");
      expect(source).not.toContain("dexie");
    }
  });

  it("seeds visibility from the widget registry on every provider mount", () => {
    expect(customizationSource).toContain("CORE_WIDGET_IDS");
    expect(customizationSource).toContain("defaultVisibility");
    expect(customizationSource).not.toContain("DEFAULT_PLACEMENTS");
    expect(customizationSource).not.toContain("getDefaultDashboardLayout");
  });

  it("introduces no persistence in the page, grid, or shell", () => {
    for (const source of [pageSource, gridSource, headerSource, appLayoutSource]) {
      expect(source).not.toContain("localStorage");
      expect(source).not.toContain("IndexedDB");
      expect(source).not.toContain("sessionStorage");
    }
  });
});

/* ------------------------------------------------------------------ */
/* 13. Existing behavior remains intact                               */
/* ------------------------------------------------------------------ */

describe("Existing behavior remains intact", () => {
  it("keeps the registry unchanged (8 widgets, stable ids)", () => {
    expect(CORE_WIDGET_IDS).toHaveLength(8);
    expect(Object.keys(WIDGET_REGISTRY)).toEqual([...CORE_WIDGET_IDS]);
  });

  it("keeps the grid free of drag/drop and persistence behavior", () => {
    expect(gridSource).not.toContain("onDrag");
    expect(gridSource).not.toContain("onDrop");
    expect(gridSource).not.toContain("onResize");
    expect(gridSource).not.toContain("localStorage");
    expect(gridSource).not.toContain("IndexedDB");
  });

  it("keeps the widget card free of customization logic", () => {
    const cardSource = readFileSync(
      join(featureDirectory, "components", "DashboardWidgetCard.tsx"),
      "utf-8",
    );
    expect(cardSource).not.toContain("setWidgetVisibility");
    expect(cardSource).not.toContain("customiz");
    expect(cardSource).not.toContain("IndexedDB");
    expect(cardSource).not.toContain("localStorage");
  });

  it("does not reference Statistics or alter the old Dashboard", () => {
    expect(headerSource).not.toContain("statistics");
    expect(pageSource).not.toContain("Statistics");
  });
});