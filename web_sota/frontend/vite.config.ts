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
    port: 10726,
    strictPort: true,
    proxy: {
      "/api": "http://127.0.0.1:10727",
      "/mcp": "http://127.0.0.1:10727",
    },
  },
});
