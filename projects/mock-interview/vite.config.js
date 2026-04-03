import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteDemoBase } from "../../scripts/vite-pages-base.js";

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: viteDemoBase("interview", command),
  resolve: { dedupe: ["react", "react-dom"] },
  server: {
    port: 5177,
  },
}));
