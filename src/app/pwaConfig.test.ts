import { readFileSync } from "node:fs";

import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const viteConfigSource = readFileSync(
  resolve(process.cwd(), "vite.config.ts"),
  "utf-8",
);

describe("PWA service worker configuration", () => {
  it("registers the service worker with the autoUpdate strategy", () => {
    expect(viteConfigSource).toContain('registerType: "autoUpdate"');
  });

  it("falls back to the application shell for SPA navigations", () => {
    expect(viteConfigSource).toContain('navigateFallback: "/index.html"');
  });

  it("gives the web app manifest a stable identity", () => {
    expect(viteConfigSource).toContain('id: "/"');
  });

  it("caches only public TMDB images at runtime with bounded growth", () => {
    expect(viteConfigSource).toContain("image\\.tmdb\\.org");
    expect(viteConfigSource).toContain('cacheName: "tmdb-images"');
    expect(viteConfigSource).toContain("CacheFirst");
    expect(viteConfigSource).toContain("maxEntries: 150");
    expect(viteConfigSource).toContain("maxAgeSeconds: 30 * 24 * 60 * 60");
  });

  it("never caches TMDB API JSON responses", () => {
    expect(viteConfigSource).not.toContain("api.themoviedb.org");
  });
});