import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "./vitest.environment.ts",
    setupFiles: ["./src/test/setup.ts"],
    clearMocks: true,
    // Full-page tests exercise several successive interactions in jsdom.
    testTimeout: 45_000,
    // Limit contention between the CPU-heavy UI suites.
    maxWorkers: 1,
  },
  build: {
    chunkSizeWarningLimit: 1100,
    rollupOptions: {
      output: {
        manualChunks: {
          framework: [
            "react",
            "react-dom",
            "react-router-dom",
            "@tanstack/react-query",
          ],
          firebase: ["firebase/app", "firebase/auth"],
          icons: ["@ant-design/icons"],
          ui: ["antd"],
        },
      },
    },
  },
});
