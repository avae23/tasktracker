import { defineConfig, mergeConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import base from "./vite.config";

/**
 * Сборка в один самодостаточный HTML-файл: скрипт и стили вшиты внутрь,
 * поэтому файл открывается двойным кликом, без сервера.
 */
export default mergeConfig(
  base,
  defineConfig({
    plugins: [viteSingleFile()],
    build: { outDir: "dist-single" },
  }),
);
