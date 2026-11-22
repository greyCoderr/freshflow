import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    projects: [
      { test: { name: "unit", include: ["shared/test/**/*.test.ts", "backend/test/**/*.unit.test.ts"], environment: "node" } },
    ],
  },
});
