import { act, type JSX } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ContinueWatchingWidgetItem } from "../services/continueWatchingWidgetService";
import * as continueWatchingWidgetService from "../services/continueWatchingWidgetService";
import DashboardWidgetCard from "./DashboardWidgetCard";
import { WIDGET_REGISTRY } from "../widgetRegistry";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function createItem(index: number): ContinueWatchingWidgetItem {
  const now = new Date("2026-07-15T00:00:00.000Z");
  return {
    media: {
      id: index + 1,
      tmdbId: 5000 + index,
      mediaType: "tv",
      title: `Show ${index}`,
      posterPath: index === 0 ? "/poster.jpg" : undefined,
      backdropPath: index === 0 ? "/backdrop.jpg" : undefined,
      userStatus: "watching",
      createdAt: now,
      updatedAt: now,
    },
    artworkPath:
      index === 0 ? "/backdrop.jpg" : index === 1 ? "/poster-only.jpg" : undefined,
    nextEpisode: {
      id: index + 1,
      showId: index + 1,
      seasonNumber: 1,
      episodeNumber: 2,
      title: "Episode 2",
      watched: false,
      createdAt: now,
      updatedAt: now,
    },
    lastWatchedAt: now,
  };
}

function Harness(): JSX.Element {
  return (
    <MemoryRouter>
      <DashboardWidgetCard widget={WIDGET_REGISTRY["continue-watching"]} />
    </MemoryRouter>
  );
}

let container: HTMLElement | null = null;
let root: Root | null = null;

beforeEach(async () => {
  vi.spyOn(
    continueWatchingWidgetService,
    "getContinueWatchingWidgetItems",
  ).mockResolvedValue([createItem(0), createItem(1), createItem(2)]);

  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(<Harness />);
    await Promise.resolve();
    await Promise.resolve();
  });
});

it("renders stored artwork prominently and prefers backdrop metadata", () => {
  const poster = document.querySelector<HTMLImageElement>(
    'img[alt="Show 0 artwork"]',
  );
  expect(poster).not.toBeNull();
  expect(poster?.getAttribute("src")).toBe(
    "https://image.tmdb.org/t/p/w342/backdrop.jpg",
  );
  expect(poster?.className).toContain("object-cover");
  expect(poster?.parentElement?.className).toContain("aspect-video");

  const posterFallback = document.querySelector<HTMLImageElement>(
    'img[alt="Show 1 artwork"]',
  );
  expect(posterFallback?.getAttribute("src")).toBe(
    "https://image.tmdb.org/t/p/w342/poster-only.jpg",
  );
});

it("provides an accessible fallback when stored artwork is missing or fails", async () => {
  const missingArtwork = document.querySelector(
    '[role="img"][aria-label="Artwork unavailable for Show 2"]',
  );
  expect(missingArtwork).not.toBeNull();

  const image = document.querySelector<HTMLImageElement>(
    'img[alt="Show 0 artwork"]',
  );
  expect(image).not.toBeNull();
  await act(async () => {
    image?.dispatchEvent(new Event("error"));
  });
  expect(
    document.querySelector(
      '[role="img"][aria-label="Artwork unavailable for Show 0"]',
    ),
  ).not.toBeNull();
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

describe("Continue Watching responsive card layout", () => {
  it("uses wrapping grid tracks and preserves each show's next-episode action", () => {
    const list = document.querySelector<HTMLUListElement>(
      'ul[aria-label="Shows to continue watching"]',
    );
    expect(list, container?.textContent ?? "No widget content").not.toBeNull();
    expect(list?.style.gridTemplateColumns).toContain("auto-fill");
    expect(list?.style.gridTemplateColumns).toContain("min(100%, 13rem)");
    expect(list?.className).toContain("grid");
    expect(list?.className).toContain("min-w-0");
    expect(list?.parentElement?.className).toContain("flex-1");

    const cards = Array.from(list?.querySelectorAll(":scope > li") ?? []);
    expect(cards).toHaveLength(3);
    for (const card of cards) {
      expect(card.className).toContain("min-w-0");
      expect(card.querySelector("a[aria-label^='Open ']")).not.toBeNull();
      expect(card.textContent).toContain("Next: S1 E2");
      expect(card.textContent).toContain("Episode 2");
      expect(card.querySelector("a[aria-label^='Watch next episode']")).not
        .toBeNull();
      expect(
        card.querySelector("a[aria-label^='Watch next episode']")?.className,
      ).toContain("w-full");
      expect(card.textContent).not.toContain("Last watched");
      expect(card.textContent).not.toMatch(/\b\d+\s*%/);
    }
  });
});
