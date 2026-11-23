import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ROLE_LABELS, type RoleName } from "@freshflow/shared";
import { api, ApiError, post } from "../../lib/api";
import { useSession } from "../../lib/session";
import { PageHead } from "../../components/PageHead";
import { Field } from "../../components/Field";
import { ConfirmDialog } from "../../components/ConfirmDialog";

interface UserRow { id: number; fullName: string; email: string; username: string | null; role: RoleName; status: "ACTIVE" | "INACTIVE"; mustChangePassword: boolean; createdAt: string }
const STAFF_ROLES: RoleName[] = ["SALES", "PLANT_STAFF", "MEMBERSHIP_HR", "ADMIN"];
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });

/** Minimal account list and staff account creation. The full admin area (roles, resets, audit) is patch 0011. */
export function Users() {
  const qc = useQueryClient();
  const me = useSession().user!;
  const q = useQuery({ queryKey: ["users"], queryFn: () => api<UserRow[]>("/users") });
  const [adding, setAdding] = useState(false);
  const [fields, setFields] = useState<Record<string, string[] | undefined>>({});
  const [formErr, setFormErr] = useState("");
  const [notice, setNotice] = useState("");
  const [target, setTarget] = useState<UserRow | null>(null);

  const create = useMutation({
    mutationFn: (d: Record<string, string>) => post<UserRow>("/users", d),
    onSuccess: (u) => {
      setAdding(false); setFields({}); setFormErr("");
      setNotice(`Account for ${u.fullName} created. They sign in with the temporary password from the server settings and must choose their own right away.`);
      void qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (x) => { if (x instanceof ApiError) { setFields(x.fields ?? {}); setFormErr(x.fields ? "" : x.message); } },
  });
  const toggle = useMutation({
    mutationFn: (u: UserRow) => post(`/users/${u.id}/${u.status === "ACTIVE" ? "deactivate" : "activate"}`),
    onSuccess: (_d, u) => {
      setTarget(null);
      setNotice(u.status === "ACTIVE" ? `${u.fullName} is deactivated and signed out everywhere. Their past records stay.` : `${u.fullName} can sign in again.`);
      void qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (x) => { setTarget(null); setNotice(x instanceof ApiError ? x.message : "Could not change the account."); },
  });

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const d: Record<string, string> = { fullName: f.fullName ?? "", email: f.email ?? "", role: f.role ?? "" };
    if (f.username?.trim()) d.username = f.username.trim();
    create.mutate(d);
  }

  return (
    <>
      <PageHead title="Users" action={!adding && <button className="btn" onClick={() => { setAdding(true); setNotice(""); }}>Add staff account</button>} />
      {notice && <p className="notice ok" role="status">{notice}</p>}

      {adding && (
        <section className="ruled-section" aria-labelledby="add-h">
          <h2 id="add-h">New staff account</h2>
          <form onSubmit={submit} noValidate className="form-grid">
            <Field label="Full name" name="fullName" required error={fields.fullName} />
            <Field label="Email" name="email" type="email" required error={fields.email} />
            <Field label="Username (optional)" name="username" autoComplete="off" error={fields.username} />
            <div className="field">
              <label htmlFor="role">Role</label>
              <select id="role" name="role" required defaultValue="SALES">
                {STAFF_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
            <p className="hint span-2">No password is entered here. The account gets the temporary password and must change it at first sign-in.</p>
            {formErr && <p role="alert" className="notice danger span-2">{formErr}</p>}
            <div className="span-2 row-actions">
              <button className="btn" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create account"}</button>
              <button type="button" className="btn ghost" onClick={() => setAdding(false)}>Cancel</button>
            </div>
          </form>
        </section>
      )}

      {q.isPending && <p role="status">Loading accounts…</p>}
      {q.isError && <div role="alert"><p>{q.error.message}</p><button className="btn ghost" onClick={() => q.refetch()}>Try again</button></div>}
      {q.data && (
        <div className="table-scroll">
          <table className="ledger">
            <thead><tr><th scope="col">Name</th><th scope="col">Email / username</th><th scope="col">Role</th><th scope="col">Status</th><th scope="col">Since</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {q.data.map((u) => (
                <tr key={u.id}>
                  <th scope="row">{u.fullName}</th>
                  <td>{u.email}{u.username && <><br /><span className="mono quiet">{u.username}</span></>}</td>
                  <td>{ROLE_LABELS[u.role]}</td>
                  <td>
                    <span className={`mark ${u.status === "ACTIVE" ? "mark-active" : "mark-ended"}`}><span aria-hidden="true">{u.status === "ACTIVE" ? "●" : "✕"}</span> {u.status === "ACTIVE" ? "Active" : "Inactive"}</span>
                    {u.mustChangePassword && <span className="mark mark-quiet tag-gap">Temporary password</span>}
                  </td>
                  <td className="mono">{fmtDate(u.createdAt)}</td>
                  <td className="num">
                    {u.id !== me.id && <button className="btn ghost small" onClick={() => setTarget(u)}>{u.status === "ACTIVE" ? "Deactivate" : "Activate"}</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog open={!!target} title={target?.status === "ACTIVE" ? `Deactivate ${target?.fullName}?` : `Activate ${target?.fullName}?`}
        confirmLabel={target?.status === "ACTIVE" ? "Deactivate" : "Activate"} danger={target?.status === "ACTIVE"} busy={toggle.isPending}
        onCancel={() => setTarget(null)} onConfirm={() => target && toggle.mutate(target)}>
        {target?.status === "ACTIVE"
          ? <p>They are signed out at once and cannot sign in. Orders, sales and records they made are kept.</p>
          : <p>They can sign in again with their current password.</p>}
      </ConfirmDialog>
    </>
  );
}
