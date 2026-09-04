import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
// `--mode singlefile` folds the lazy-loaded 3D chunk back into one bundle, for
// environments that can only serve a single self-contained HTML file.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  build:
    mode === "singlefile"
      ? { rollupOptions: { output: { inlineDynamicImports: true } } }
      : {},
}));
