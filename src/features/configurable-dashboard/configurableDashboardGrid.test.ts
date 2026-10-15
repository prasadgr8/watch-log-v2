import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const gridSource = readFileSync(
  join(featureDirectory, "components", "ConfigurableDashboardGrid.tsx"),
  "utf-8",
);

const pageSource = readFileSync(
  join(featureDirectory, "components", "ConfigurableDashboardPage.tsx"),
  "utf-8",
);

/*
 * Grid + page foundation contract: responsive CSS grid only, minimal hero
 * with no metrics, no Step 2+ behavior, accessible landmarks.
 */
describe("configurable dashboard grid foundation", () => {
  it("builds on responsive CSS grid without absolute positioning", () => {
    expect(gridSource).toContain("grid-cols-1");
    expect(gridSource).toContain("md:grid-cols-6");
    expect(gridSource).toContain("lg:grid-cols-12");
    expect(gridSource).not.toMatch(/position:\s*absolute/);
    expect(gridSource).not.toContain("position-absolute");
  });

  it("carries no Step 2+ interaction or persistence behavior", () => {
    expect(gridSource).not.toContain("onDrag");
    expect(gridSource).not.toContain("onDrop");
    expect(gridSource).not.toContain("onResize");
    expect(gridSource).not.toContain("localStorage");
    expect(gridSource).not.toContain("IndexedDB");
  });

  it("exposes an accessible widget list", () => {
    expect(gridSource).toContain('aria-label="Dashboard widgets"');
  });
});

describe("configurable dashboard page foundation", () => {
  it("keeps the hero free of metrics values and analytics", () => {
    expect(pageSource).not.toContain("progressPercentage");
    expect(pageSource).not.toContain("ProgressBar");
    expect(pageSource).not.toMatch(/role="progressbar"/);
    expect(pageSource).not.toContain("useMemo(() => compute");
    expect(pageSource).toContain("Your Dashboard");
  });

  it("uses semantic theme tokens instead of hard-coded palette colors", () => {
    expect(pageSource).not.toMatch(/slate-/);
    expect(pageSource).not.toMatch(/text-white/);
    expect(pageSource).not.toMatch(/bg-blue-/);
    expect(pageSource).toContain("text-primary");
    expect(pageSource).toContain("text-muted");
  });

  it("exposes accessible landmarks", () => {
    expect(pageSource).toContain("configurable-dashboard-heading");
    expect(pageSource).toContain('aria-label="Dashboard widgets"');
  });
});
