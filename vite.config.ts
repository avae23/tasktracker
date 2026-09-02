import { defineConfig } from "vite";

export default defineConfig({
  // относительный base: сборка работает и из подпапки (GitHub Pages), и локально
  base: "./",
  server: { port: 5173 },
  build: {
    target: "es2022",
    outDir: "dist",
    emptyOutDir: true,
  },
});
