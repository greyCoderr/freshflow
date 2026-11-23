export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string, public fields?: Record<string, string[]>) { super(message); }
}

/** Fired so the session layer can react without every page handling it. */
export const SESSION_EXPIRED_EVENT = "ff:session-expired";
export const PASSWORD_CHANGE_EVENT = "ff:password-change-required";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, { credentials: "include", headers: { "Content-Type": "application/json" }, ...init });
  } catch {
    throw new ApiError(0, "Cannot reach FreshFlow. Check your connection, then try again.", "offline");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Login and /me answer 401 as a normal result; everywhere else a 401 means the session ended.
    if (res.status === 401 && !path.startsWith("/auth/")) window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    if (res.status === 403 && body.code === "password_change_required") window.dispatchEvent(new Event(PASSWORD_CHANGE_EVENT));
    throw new ApiError(res.status, body.error ?? "Something went wrong. Please try again.", body.code, body.fields);
  }
  return body as T;
}

export const post = <T>(path: string, data?: unknown) => api<T>(path, { method: "POST", body: data === undefined ? undefined : JSON.stringify(data) });

/** Only same-site paths are accepted as a post-login destination (no open redirects). */
export function safeNext(next: string | null): string | null {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login") ? next : null;
}
