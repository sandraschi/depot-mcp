import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  base: "/app/",
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    allowedHosts: ["goliath"],
    port: 10726,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:10727",
        changeOrigin: true,
      },
      "/mcp": {
        target: "http://127.0.0.1:10727",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
