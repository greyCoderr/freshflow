import { useState } from "react";
import { api, ApiError } from "../lib/api";
export function Login() {
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setErr("");
    const f = new FormData(e.currentTarget);
    try { await api("/auth/login", { method: "POST", body: JSON.stringify({ identifier: f.get("identifier"), password: f.get("password") }) }); location.href = "/"; }
    catch (x) { setErr(x instanceof ApiError ? x.message : "Could not sign in."); } finally { setBusy(false); }
  }
  return (
    <main className="wrap" style={{ maxWidth: 440, paddingTop: 80 }}>
      <h1>Sign in</h1>
      <form onSubmit={submit} noValidate>
        <div className="field"><label htmlFor="identifier">Email or username</label><input id="identifier" name="identifier" autoComplete="username" required /></div>
        <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required /></div>
        {err && <p role="alert" style={{ color: "var(--berry)" }}>{err}</p>}
        <button className="btn" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </main>
  );
}
