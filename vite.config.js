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
    },
  },
}));
