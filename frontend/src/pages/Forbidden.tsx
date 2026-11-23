import { Link } from "react-router-dom";
import { homePathFor, ROLE_LABELS } from "@freshflow/shared";
import { useSession } from "../lib/session";

export function Forbidden() {
  const { user } = useSession();
  return (
    <section className="errpage" aria-labelledby="e-h">
      <p className="errcode mono" aria-hidden="true">403</p>
      <h1 id="e-h">No access to this page</h1>
      <p>{user ? `Your account (${ROLE_LABELS[user.role]}) cannot open this page. If your work needs it, ask an administrator.` : "Sign in with an account that can open this page."}</p>
      <Link className="btn" to={user ? homePathFor(user.role) : "/login"}>{user ? "Go to your home page" : "Sign in"}</Link>
    </section>
  );
}
