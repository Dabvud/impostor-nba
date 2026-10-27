/// <reference types="vitest/config" />
import { execSync } from "node:child_process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import pkg from "./package.json";
import { versionFromDescribe } from "./src/version";

function gitDescribe(): string {
  try {
    return execSync("git describe --tags --long", { stdio: ["ignore", "pipe", "ignore"] }).toString();
  } catch {
    return "";
  }
}

const buildDate = new Date().toLocaleDateString("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Europe/Berlin",
});

export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  define: {
    __APP_VERSION__: JSON.stringify(versionFromDescribe(gitDescribe(), pkg.version)),
    __BUILD_DATE__: JSON.stringify(buildDate),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Impostor",
        short_name: "Impostor",
        description: "Fußball-Impostor für eure Runde – ein Handy, alle Spieler.",
        lang: "de",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#0f1a14",
        background_color: "#0f1a14",
        icons: [
          { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,json}"],
      },
    }),
  ],
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts?(x)"],
    setupFiles: ["tests/setup.ts"],
    // UI-Tests mit echten Wartezeiten (Halten, Klickschutz) brauchen unter Last mehr als 5 s
    testTimeout: 15000,
  },
});
