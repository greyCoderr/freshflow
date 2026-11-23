import { defineConfig } from "vitest/config";
import { DB_TEST_ENV } from "./backend/test/db/test-env.js";

export default defineConfig({
  test: {
    projects: [
      { test: { name: "unit", include: ["shared/test/**/*.test.ts", "backend/test/**/*.unit.test.ts"], environment: "node" } },
      {
        // Needs MySQL. Uses its own database (freshflow_test by default), never the dev database.
        test: {
          name: "db",
          include: ["backend/test/**/*.db.test.ts"],
          environment: "node",
          env: { ...DB_TEST_ENV },
          globalSetup: ["backend/test/db/global-setup.ts"],
          pool: "forks",
          poolOptions: { forks: { singleFork: true } }, // one DB, so test files run one after another
          testTimeout: 20_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
