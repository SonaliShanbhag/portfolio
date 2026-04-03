import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteDemoBase } from "../../scripts/vite-pages-base.js";

export default defineConfig({
  plugins: [react()],
  base: viteDemoBase("interview"),
  server: {
    port: 5177,
  },
});
