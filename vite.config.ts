import { defineConfig } from "vite";

export default defineConfig({
  // relative base so the build works from any path (GitHub Pages, a subfolder, file://)
  base: "./",
  server: { port: 5173 },
  build: { target: "es2022", outDir: "dist" },
});
