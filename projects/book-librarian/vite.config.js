import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "serve" ? "/librarian/" : "./",
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
}));
