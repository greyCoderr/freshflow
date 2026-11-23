import { z } from "zod";
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  COOKIE_SECURE: z.enum(["true", "false"]).default("false").transform((v) => v === "true"),
  SESSION_HOURS: z.coerce.number().default(12),
  CLIENT_ORIGIN: z.string().default("http://localhost:5173"),
  /** Temporary password for admin-created accounts. The user must change it at first sign-in. */
  DEFAULT_PASSWORD: z.string().min(8).default("FreshFlow2026!"),
  /** Login/register attempts allowed per IP per 15 minutes. */
  AUTH_RATE_LIMIT: z.coerce.number().int().positive().default(30),
});
// A missing NODE_ENV is treated as production: never fall back to dev secrets silently.
export type Env = z.infer<typeof schema>;
export function loadEnv(src: NodeJS.ProcessEnv = process.env): Env {
  const parsed = schema.safeParse({ ...src, NODE_ENV: src.NODE_ENV || "production" });
  if (!parsed.success) throw new Error("Invalid environment: " + parsed.error.issues.map((i) => i.path.join(".")).join(", "));
  if (parsed.data.NODE_ENV === "production" && !parsed.data.COOKIE_SECURE) throw new Error("COOKIE_SECURE must be true in production");
  if (parsed.data.NODE_ENV === "production" && !src.DEFAULT_PASSWORD) throw new Error("DEFAULT_PASSWORD must be set in production");
  return parsed.data;
}
