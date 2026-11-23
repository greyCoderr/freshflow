import { useState } from "react";
import { ApiError, post } from "../lib/api";
import { Field } from "./Field";

type Errors = Record<string, string[] | undefined>;

export function ChangePasswordForm({ forced, onDone }: { forced?: boolean; onDone: () => void }) {
  const [fields, setFields] = useState<Errors>({});
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const local: Errors = {};
    if ((f.newPassword ?? "").length < 8) local.newPassword = ["Use at least 8 characters"];
    if (f.newPassword !== f.confirm) local.confirm = ["The two passwords do not match"];
    setFields(local); setErr("");
    if (Object.keys(local).length) return;
    setBusy(true);
    try {
      await post("/auth/change-password", { currentPassword: f.currentPassword, newPassword: f.newPassword });
      form.reset();
      onDone();
    } catch (x) {
      if (x instanceof ApiError) { setFields(x.fields ?? {}); setErr(x.fields ? "" : x.message); }
      else setErr("Could not change your password. Please try again.");
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} noValidate>
      <Field label={forced ? "Temporary password" : "Current password"} name="currentPassword" type="password" autoComplete="current-password" required error={fields.currentPassword} />
      <Field label="New password" name="newPassword" type="password" autoComplete="new-password" required hint="At least 8 characters. Other devices will be signed out." error={fields.newPassword} />
      <Field label="Confirm new password" name="confirm" type="password" autoComplete="new-password" required error={fields.confirm} />
      {err && <p role="alert" className="notice danger">{err}</p>}
      <button className="btn" disabled={busy}>{busy ? "Saving…" : forced ? "Save and continue" : "Change password"}</button>
    </form>
  );
}
