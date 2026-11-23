import { Link } from "react-router-dom";
import { ROLE_LABELS } from "@freshflow/shared";
import { useSession } from "../../lib/session";
import { PageHead } from "../../components/PageHead";
import { STAFF_NAV } from "../../layouts/staffNav";

function greeting(d = new Date()) {
  const h = d.getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

/** Figures (sales, orders, stock, concerns) arrive with real data in a later patch; nothing is invented here. */
export function Dashboard() {
  const s = useSession();
  const u = s.user!;
  const sections = STAFF_NAV.filter((n) => n.permission && s.can(n.permission));
  return (
    <>
      <PageHead title="Dashboard" />
      <p className="lead">{greeting()}, {u.fullName.split(" ")[0]}. You are signed in as <strong>{ROLE_LABELS[u.role]}</strong>.</p>
      <section aria-labelledby="sec-h" className="ruled-section">
        <h2 id="sec-h">Your sections</h2>
        <ul className="index-list">
          {sections.map(({ to, label, icon: Icon }) => (
            <li key={to}><Link to={to}><Icon size={20} strokeWidth={1.5} aria-hidden /> <span>{label}</span></Link></li>
          ))}
        </ul>
      </section>
    </>
  );
}
