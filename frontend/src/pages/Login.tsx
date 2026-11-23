import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { homePathFor } from "@freshflow/shared";
import { ApiError, post, safeNext } from "../lib/api";
import { useSession } from "../lib/session";
import { AuthCard } from "../components/AuthCard";
import { Field } from "../components/Field";

export function Login() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const session = useSession();
  const [err, setErr] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const expired = params.get("expired") === "1";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setErr(null);
    try {
      await post("/auth/login", { identifier: String(f.get("identifier") ?? ""), password: String(f.get("password") ?? "") });
      const u = await session.refresh();
      if (!u) throw new ApiError(401, "Could not start your session. Please try again.");
      nav(u.mustChangePassword ? "/change-password" : safeNext(params.get("next")) ?? homePathFor(u.role), { replace: true });
    } catch (x) {
      setErr(x instanceof ApiError ? x : new ApiError(0, "Could not sign in. Please try again."));
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Sign in" lead="Customers and BFDC staff sign in here.">
      {expired && !err && <p className="notice" role="status">Your session ended. Sign in again to continue.</p>}
      <form onSubmit={submit} noValidate>
        <Field label="Email or username" name="identifier" autoComplete="username" required autoFocus />
        <Field label="Password" name="password" type="password" autoComplete="current-password" required />
        {err && <p role="alert" className={`notice ${err.code === "rate_limited" ? "attention" : "danger"}`}>{err.message}</p>}
        <button className="btn block" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
      <div className="auth-foot">
        <p>New customer? <Link to="/register">Create an account</Link></p>
        {/* BFDC-TBD: self-service password reset needs email or SMS, which BFDC has not confirmed. */}
        <p className="quiet">Forgot your password? Ask the BFDC office to reset it.</p>
      </div>
    </AuthCard>
  );
}
