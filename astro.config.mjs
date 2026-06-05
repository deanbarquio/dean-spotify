// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": new URL("./src", import.meta.url).pathname,
      },
    },
    optimizeDeps: {
      // Pre-bundle heavy deps so the first page load doesn't 504 with "Outdated Optimize Dep"
      include: ["three", "gsap", "lenis", "react", "react-dom"],
    },
  },
});
