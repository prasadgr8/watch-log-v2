import { act, type JSX } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it } from "vitest";

import DashboardWidgetCard from "./DashboardWidgetCard";
import { WIDGET_REGISTRY } from "../widgetRegistry";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function Harness(): JSX.Element {
  return (
    <MemoryRouter>
      <DashboardWidgetCard widget={WIDGET_REGISTRY["quick-actions"]} />
    </MemoryRouter>
  );
}

let container: HTMLElement | null = null;
let root: Root | null = null;

beforeEach(async () => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(<Harness />);
    await Promise.resolve();
    await Promise.resolve();
  });
});

it("renders both quick actions with usable touch targets and focus rings", () => {
  const links = Array.from(
    container?.querySelectorAll<HTMLAnchorElement>("ul[aria-label=\"Quick actions\"] a") ?? [],
  );
  expect(links).toHaveLength(2);
  expect(links.map((link) => link.getAttribute("aria-label"))).toEqual([
    "Choose a show in your library to mark episodes watched",
    "Open settings to import a TV Time export",
  ]);

  for (const link of links) {
    // Pointer/touch target: comfortable horizontal padding plus vertical padding.
    expect(link.className).toContain("px-4");
    expect(link.className).toContain("py-3");
    // Visible keyboard focus.
    expect(link.className).toContain("focus-visible:ring-2");
    expect(link.className).toContain("focus-visible:ring-accent-hover/40");
  }
});

afterEach(async () => {
  if (root) {
    const currentRoot = root;
    await act(async () => currentRoot.unmount());
  }
  container?.remove();
  container = null;
  root = null;
});
