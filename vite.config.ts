import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Watch Log V2",
        short_name: "WatchLog",
        description:
          "Watch Log V2 is a personal media tracker that helps you track movies and TV shows, manage watch progress, and maintain your viewing history.",
        start_url: "/",
        id: "/",
        display: "standalone",
        background_color: "#0F172A",
        theme_color: "#0F172A",
        icons: [
          {
            src: "/icons/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,webmanifest}"],
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/image\.tmdb\.org\/.*/,
            handler: "CacheFirst",
            options: {
              cacheName: "tmdb-images",
              expiration: {
                maxEntries: 150,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  test: {
    environment: "node",
    setupFiles: ["./src/test/setup.ts"],
  },
});
