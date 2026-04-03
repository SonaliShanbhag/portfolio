import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteDemoBase } from "../../scripts/vite-pages-base.js";

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: viteDemoBase("simulator", command),
  // Shared `projects/shared/*` imports must use the same React as this app (avoids "useState of null").
  resolve: { dedupe: ["react", "react-dom"] },
  server: { port: 5174 },
}));
