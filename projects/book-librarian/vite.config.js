import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteDemoBase } from "../../scripts/vite-pages-base.js";

export default defineConfig({
  plugins: [react()],
  base: viteDemoBase("librarian"),
  server: {
    port: 5176,
    proxy: {
      "/api/ollama": {
        target: "http://127.0.0.1:11434",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ollama/, ""),
      },
    },
  },
});
