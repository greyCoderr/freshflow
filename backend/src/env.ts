import { z } from "zod";
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  COOKIE_SECURE: z.enum(["true", "false"]).default("false").transform((v) => v === "true"),
  SESSION_HOURS: z.coerce.number().default(12),
  CLIENT_ORIGIN: z.string().default("http://localhost:5173"),
});
// A missing NODE_ENV is treated as production: never fall back to dev secrets silently.
export function loadEnv(src: NodeJS.ProcessEnv = process.env) {
  const parsed = schema.safeParse({ ...src, NODE_ENV: src.NODE_ENV || "production" });
  if (!parsed.success) throw new Error("Invalid environment: " + parsed.error.issues.map((i) => i.path.join(".")).join(", "));
  if (parsed.data.NODE_ENV === "production" && !parsed.data.COOKIE_SECURE) throw new Error("COOKIE_SECURE must be true in production");
  return parsed.data;
}
