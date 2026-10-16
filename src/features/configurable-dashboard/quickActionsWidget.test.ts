import { describe, expect, it } from "vitest";

import {
  getQuickActions,
  QUICK_ACTIONS,
  QUICK_ACTIONS_LIMIT,
  type QuickAction,
} from "./services/quickActionsWidgetService";

describe("quick actions widget service", () => {
  it("returns exactly 4 approved actions in display order", () => {
    const actions = getQuickActions();

    expect(actions).toHaveLength(4);
    expect(actions).toEqual(QUICK_ACTIONS);
  });

  it("exposes QUICK_ACTIONS_LIMIT equal to the action count", () => {
    expect(QUICK_ACTIONS_LIMIT).toBe(QUICK_ACTIONS.length);
  });

  it("my-library action routes to /library", () => {
    const action = QUICK_ACTIONS.find((a) => a.id === "my-library");

    expect(action).toBeDefined();
    expect(action!.route).toBe("/library");
    expect(action!.ariaLabel).toBe("Open your library");
  });

  it("discover action routes to /search", () => {
    const action = QUICK_ACTIONS.find((a) => a.id === "discover");

    expect(action).toBeDefined();
    expect(action!.route).toBe("/search");
    expect(action!.ariaLabel).toBe("Discover titles");
  });

  it("mark-watched action opens the library show-selection flow", () => {
    const action = QUICK_ACTIONS.find((a) => a.id === "mark-watched");

    expect(action).toBeDefined();
    expect(action!.route).toBe("/library");
    expect(action!.ariaLabel).toBe(
      "Choose a show in your library to mark episodes watched",
    );
  });

  it("import action opens the supported TV Time import flow in Settings", () => {
    const action = QUICK_ACTIONS.find((a) => a.id === "import");

    expect(action).toBeDefined();
    expect(action!.route).toBe("/settings");
    expect(action!.ariaLabel).toBe(
      "Open settings to import a TV Time export",
    );
  });

  it("each action has a unique id, non-empty label, route, and ariaLabel", () => {
    const ids = new Set<string>();

    for (const action of QUICK_ACTIONS) {
      expect(action.id).toMatch(/^[a-z-]+$/);
      expect(action.label.length).toBeGreaterThan(0);
      expect(action.route.startsWith("/")).toBe(true);
      expect(action.ariaLabel.length).toBeGreaterThan(0);
      expect(ids.has(action.id)).toBe(false);
      ids.add(action.id);
    }
  });

  it("action ids match the QuickAction union type", () => {
    const validIds: readonly QuickAction["id"][] = [
      "my-library",
      "discover",
      "mark-watched",
      "import",
    ];

    for (const id of validIds) {
      const found = QUICK_ACTIONS.find((a) => a.id === id);
      expect(found).toBeDefined();
    }
  });
});
