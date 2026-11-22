import { describe, expect, it } from "vitest";
import { loadEnv } from "../src/env.js";
const base = { DATABASE_URL: "mysql://x", JWT_SECRET: "x".repeat(32) };
describe("loadEnv", () => {
  it("treats a missing NODE_ENV as production and refuses insecure cookies", () => {
    expect(() => loadEnv({ ...base })).toThrow(/COOKIE_SECURE/);
  });
  it("accepts development", () => { expect(loadEnv({ ...base, NODE_ENV: "development" }).NODE_ENV).toBe("development"); });
  it("rejects short secrets", () => { expect(() => loadEnv({ ...base, JWT_SECRET: "short", NODE_ENV: "development" })).toThrow(); });
});
