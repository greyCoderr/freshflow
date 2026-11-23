import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, post } from "../lib/api";
import { useSession } from "../lib/session";
import { AuthCard } from "../components/AuthCard";
import { Field } from "../components/Field";

type Errors = Record<string, string[] | undefined>;

export function Register() {
  const nav = useNavigate();
  const session = useSession();
  const [fields, setFields] = useState<Errors>({});
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const local: Errors = {};
    if (f.password !== f.confirm) local.confirm = ["The two passwords do not match"];
    setFields(local); setErr("");
    if (Object.keys(local).length) return;
    setBusy(true);
    try {
      // No role is sent: the server always creates a Customer account.
      await post("/auth/register", { fullName: f.fullName, email: f.email, contactNumber: f.contactNumber, password: f.password });
      await session.refresh();
      nav("/", { replace: true });
    } catch (x) {
      if (x instanceof ApiError) {
        setFields(x.fields ?? (x.code === "email_taken" ? { email: [x.message] } : {}));
        setErr(x.code === "email_taken" ? "" : x.message);
      } else setErr("Could not create your account. Please try again.");
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Create a customer account" lead="Order BFDC products for pickup and follow your orders." wide>
      <form onSubmit={submit} noValidate className="form-grid">
        <Field label="Full name" name="fullName" autoComplete="name" required error={fields.fullName} />
        <Field label="Mobile number" name="contactNumber" type="tel" inputMode="tel" autoComplete="tel" required placeholder="09XXXXXXXXX" error={fields.contactNumber} />
        <Field label="Email" name="email" type="email" autoComplete="email" required error={fields.email} className="span-2" />
        <Field label="Password" name="password" type="password" autoComplete="new-password" required hint="At least 8 characters." error={fields.password} />
        <Field label="Confirm password" name="confirm" type="password" autoComplete="new-password" required error={fields.confirm} />
        {err && <p role="alert" className="notice danger span-2">{err}</p>}
        <button className="btn block span-2" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
      </form>
      <div className="auth-foot"><p>Already have an account? <Link to="/login">Sign in</Link></p></div>
    </AuthCard>
  );
}
