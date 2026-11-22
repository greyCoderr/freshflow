import { NavLink, Outlet } from "react-router-dom";
const links = [["/", "Home"], ["/products", "Products"], ["/orders", "My Orders"], ["/concerns", "Feedback & Concerns"], ["/cart", "Cart"], ["/account", "Account"]] as const;
export function CustomerLayout() {
  return (
    <>
      <header className="top"><div className="wrap">
        <a className="brand" href="/">FreshFlow</a>
        <nav aria-label="Main">{links.map(([to, label]) => <NavLink key={to} to={to} end={to === "/"}>{label}</NavLink>)}</nav>
      </div></header>
      <main className="wrap" style={{ padding: "40px 24px 80px" }}><Outlet /></main>
    </>
  );
}
