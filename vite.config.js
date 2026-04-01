import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "build" ? "./" : "/",
  server: {
    port: 5173,
    proxy: {
      "/simulator": {
        target: "http://localhost:5174",
        changeOrigin: true,
      },
      "/queue": {
        target: "http://localhost:5175",
        changeOrigin: true,
      },
      "/librarian": {
        target: "http://localhost:5176",
        changeOrigin: true,
      },
      "/interview": {
        target: "http://localhost:5177",
        changeOrigin: true,
      },
      "/card-fit": {
        target: "http://localhost:5178",
        changeOrigin: true,
      },
      "/api/ollama": {
        target: "http://127.0.0.1:11434",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ollama/, ""),
      },
    },
  },
}));
