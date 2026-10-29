import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    clearMocks: true,
    testTimeout: 20_000,
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
