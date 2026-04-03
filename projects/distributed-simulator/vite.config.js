import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteDemoBase } from "../../scripts/vite-pages-base.js";

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: viteDemoBase("simulator", command),
  server: { port: 5174 },
}));
