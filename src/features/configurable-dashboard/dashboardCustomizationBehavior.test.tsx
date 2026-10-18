/**
 * Step 4 behavioral coverage — dashboard customization.
 *
 * Exercises the customization flow against a real DOM (jsdom), complementing
 * the source-level contract tests in configurableDashboardCustomization.test.ts:
 *
 * 1. Opening the dialog moves initial focus to the first widget checkbox.
 * 2. Every dialog control (8 checkboxes + Reset + Done) is focusable in DOM
 *    order (jsdom implements no Tab key, so traversal is verified by focusing
 *    each control in order).
 * 3. Escape closes the dialog and restores focus to the trigger.
 * 4. Checkbox toggles hide/show widgets on the dashboard immediately.
 * 5. Reset Widget Visibility restores every widget.
 * 6. Navigating away from the dashboard while the dialog is open closes it;
 *    returning does NOT reopen it (page-lifecycle scoped dialog state).
 * 7. Widget visibility survives in-app navigation for the session but resets
 *    with a fresh provider mount (transient, no persistence).
 */

import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { WIDGET_REGISTRY } from "./widgetRegistry";
import ConfigurableDashboardPage from "./components/ConfigurableDashboardPage";
import DashboardCustomizeButton from "./components/DashboardCustomizeButton";
import { DashboardCustomizationProvider } from "./services/dashboardCustomization";
import { useDashboardCustomization } from "./services/dashboardCustomizationContext";

// React act() support for a plain (non-testing-library) jsdom test.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function CustomizeTrigger(): React.JSX.Element {
  const { setIsCustomizing } = useDashboardCustomization();
  return <DashboardCustomizeButton onClick={() => setIsCustomizing(true)} />;
}

/**
 * Stands in for the app shell: the trigger stays mounted (like the header
 * button) while the dashboard page mounts/unmounts like route navigation.
 * The toggle button simulates navigating away from and back to the dashboard
 * (browser back / keyboard navigation behind the modal overlay).
 */
function TestApp(): React.JSX.Element {
  const [showPage, setShowPage] = useState(true);

  return (
    <MemoryRouter>
      <DashboardCustomizationProvider>
        <CustomizeTrigger />
        <button
          type="button"
          data-testid="toggle-dashboard-page"
          onClick={() => setShowPage((previous) => !previous)}
        >
          toggle page
        </button>
        {showPage && <ConfigurableDashboardPage />}
      </DashboardCustomizationProvider>
    </MemoryRouter>
  );
}

let container: HTMLElement | null = null;
let root: Root | null = null;

async function mountApp(): Promise<void> {
  container = document.createElement("div");
  document.body.appendChild(container);
  const nextRoot = createRoot(container);
  root = nextRoot;

  await act(async () => {
    nextRoot.render(<TestApp />);
  });
}

async function unmountApp(): Promise<void> {
  if (root) {
    const currentRoot = root;
    await act(async () => {
      currentRoot.unmount();
    });
  }

  container?.remove();
  root = null;
  container = null;
}

async function click(element: Element): Promise<void> {
  await act(async () => {
    (element as HTMLElement).click();
  });
}

async function pressEscape(): Promise<void> {
  await act(async () => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
  });
}

async function pressTab(shiftKey: boolean): Promise<void> {
  await act(async () => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Tab",
        bubbles: true,
        cancelable: true,
        shiftKey,
      }),
    );
  });
}

function getTrigger(): HTMLElement {
  const trigger = document.querySelector<HTMLElement>(
    'button[aria-label="Customize Dashboard"]',
  );

  if (!trigger) {
    throw new Error("Customize Dashboard trigger not found");
  }

  return trigger;
}

function getDialog(): HTMLElement {
  const dialog = document.querySelector<HTMLElement>('[role="dialog"]');

  if (!dialog) {
    throw new Error("Customization dialog not found");
  }

  return dialog;
}

function findDialog(): HTMLElement | null {
  return document.querySelector('[role="dialog"]');
}

function getCheckbox(widgetId: string): HTMLInputElement {
  const checkbox = document.getElementById(`widget-visibility-${widgetId}`);

  if (!(checkbox instanceof HTMLInputElement)) {
    throw new Error(`Checkbox for ${widgetId} not found`);
  }

  return checkbox;
}

function findDialogButton(label: string): HTMLElement {
  const button = Array.from(getDialog().querySelectorAll("button")).find(
    (candidate) => candidate.textContent === label,
  );

  if (!button) {
    throw new Error(`Dialog button "${label}" not found`);
  }

  return button;
}

function dashboardText(): string {
  return container?.textContent ?? "";
}

async function openDialog(): Promise<HTMLElement> {
  const trigger = getTrigger();
  trigger.focus();
  await click(trigger);
  return getDialog();
}

beforeEach(async () => {
  await mountApp();
});

afterEach(async () => {
  await unmountApp();
});

describe("dashboard customization behavior", () => {
  it("moves initial focus into the dialog and exposes every control in DOM order", async () => {
    const trigger = getTrigger();
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    await click(trigger);

    const dialog = getDialog();

    // Initial focus lands on the first widget checkbox, not on the trigger
    // behind the modal overlay.
    expect(document.activeElement).toBe(getCheckbox("continue-watching"));
    expect(trigger).not.toBe(document.activeElement);

    // Visibility checkboxes, one-shot layout radios, then visibility reset
    // and Done all remain keyboard reachable in document order.
    const focusables = dialog.querySelectorAll<HTMLElement>(
      'input[type="checkbox"], input[type="radio"], button',
    );
    expect(focusables).toHaveLength(12);

    for (const control of focusables) {
      control.focus();
      expect(document.activeElement).toBe(control);
    }
  });

  it("closes on Escape and restores focus to the Customize Dashboard trigger", async () => {
    const trigger = getTrigger();
    trigger.focus();
    await click(trigger);
    expect(document.activeElement).toBe(getCheckbox("continue-watching"));

    await pressEscape();

    expect(findDialog()).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("hides and shows widgets immediately through the dialog checkboxes", async () => {
    const title = WIDGET_REGISTRY["upcoming-releases"].title;
    expect(dashboardText()).toContain(title);

    await openDialog();

    const checkbox = getCheckbox("upcoming-releases");
    expect(checkbox.checked).toBe(true);

    await click(checkbox);
    expect(checkbox.checked).toBe(false);

    await click(findDialogButton("Done"));
    expect(findDialog()).toBeNull();
    expect(dashboardText()).not.toContain(title);

    // Reopening keeps the transient state: the widget is still hidden.
    await openDialog();
    expect(getCheckbox("upcoming-releases").checked).toBe(false);

    await click(getCheckbox("upcoming-releases"));
    expect(getCheckbox("upcoming-releases").checked).toBe(true);

    await pressEscape();
    expect(dashboardText()).toContain(title);
    expect(document.activeElement).toBe(getTrigger());
  });

  it("restores hidden widgets with Reset Widget Visibility", async () => {
    const title = WIDGET_REGISTRY["recently-watched"].title;

    await openDialog();
    await click(getCheckbox("recently-watched"));
    await pressEscape();
    expect(dashboardText()).not.toContain(title);

    await openDialog();
    await click(findDialogButton("Reset Widget Visibility"));

    expect(getCheckbox("recently-watched").checked).toBe(true);

    await pressEscape();
    expect(dashboardText()).toContain(title);
  });

  it("restores focus to the trigger after Done dismissal", async () => {
    await openDialog();

    await click(findDialogButton("Done"));

    expect(findDialog()).toBeNull();
    expect(document.activeElement).toBe(getTrigger());
  });

  it("restores focus to the trigger after backdrop dismissal", async () => {
    const panel = await openDialog();
    const backdrop = panel.previousElementSibling;

    if (
      !(backdrop instanceof HTMLElement) ||
      backdrop.getAttribute("aria-hidden") !== "true"
    ) {
      throw new Error("Dialog backdrop not found");
    }

    await click(backdrop);

    expect(findDialog()).toBeNull();
    expect(document.activeElement).toBe(getTrigger());
  });

  it("cycles Tab and Shift+Tab focus inside the dialog", async () => {
    const dialog = await openDialog();
    const focusables = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'input[type="checkbox"], input[type="radio"], button',
      ),
    );

    expect(focusables).toHaveLength(12);

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    // Forward Tab from the last control wraps to the first control.
    last.focus();
    await pressTab(false);
    expect(document.activeElement).toBe(first);

    // Shift+Tab from the first control wraps to the last control.
    first.focus();
    await pressTab(true);
    expect(document.activeElement).toBe(last);

    // Tab from an interior control moves one step forward, staying inside.
    focusables[1].focus();
    await pressTab(false);
    expect(document.activeElement).toBe(focusables[2]);
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("immediately restores focus when focus moves to the background", async () => {
    const dialog = await openDialog();
    const firstCheckbox = getCheckbox("continue-watching");

    await act(async () => {
      getTrigger().focus();
    });

    expect(document.activeElement).toBe(firstCheckbox);
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("does not reopen the dialog after navigating away while it is open", async () => {
    const title = WIDGET_REGISTRY["quick-actions"].title;
    const togglePage = document.querySelector<HTMLElement>(
      '[data-testid="toggle-dashboard-page"]',
    );

    if (!togglePage) {
      throw new Error("Page toggle control not found");
    }

    // Hide one widget first so session-scoped visibility can be observed.
    await openDialog();
    await click(getCheckbox("quick-actions"));
    await pressEscape();
    expect(dashboardText()).not.toContain(title);

    // Open the dialog, then navigate away from the dashboard (the page
    // unmounts, closing the dialog and clearing the open flag).
    await openDialog();
    expect(findDialog()).not.toBeNull();

    await click(togglePage);
    expect(findDialog()).toBeNull();

    // Return to the dashboard: the normal view, not an automatically
    // reopened dialog, and the hidden widget stays hidden for the session.
    await click(togglePage);
    expect(findDialog()).toBeNull();
    expect(dashboardText()).not.toContain(title);

    // The trigger still opens the dialog normally after returning.
    await openDialog();
    expect(findDialog()).not.toBeNull();

    await pressEscape();
    expect(findDialog()).toBeNull();
    expect(document.activeElement).toBe(getTrigger());
  });

  it("resets visibility with a fresh provider mount (transient session semantics)", async () => {
    const title = WIDGET_REGISTRY["quick-actions"].title;

    await openDialog();
    await click(getCheckbox("quick-actions"));
    await pressEscape();
    expect(dashboardText()).not.toContain(title);

    // A fresh provider mount stands in for a page reload: visibility returns
    // to the registry-driven default and no dialog opens.
    await unmountApp();
    await mountApp();

    expect(findDialog()).toBeNull();
    expect(dashboardText()).toContain(title);
  });
});