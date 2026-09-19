import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:10726",
    viewport: { width: 1280, height: 720 },
  },
  // Backend must already run on :10727 (just serve) and frontend on :10726.
  // No webServer here: CI runs the stack separately (see .github/workflows/ci.yml).
});
