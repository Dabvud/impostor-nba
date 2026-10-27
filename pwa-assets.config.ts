import { defineConfig, minimal2023Preset } from "@vite-pwa/assets-generator/config";

// Apple- und Maskable-Icon randlos auf Marineblau statt mit weißem Rand
const fullBleed = { padding: 0, resizeOptions: { background: "#0a1530" } };

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, ...fullBleed },
    apple: { ...minimal2023Preset.apple, ...fullBleed },
  },
  images: ["public/icon.svg"],
});
