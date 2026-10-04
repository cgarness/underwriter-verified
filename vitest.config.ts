import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    // All API access in these tests is mocked; use a local target so fixtures
    // exercise the allowed local path without bypassing the production guard.
    env: { VITE_SUPABASE_URL: "http://127.0.0.1:3001", VITE_DEPLOYMENT_ENV: "development" },
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
