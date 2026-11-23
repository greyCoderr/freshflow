import "@fontsource/young-serif/400.css";
import "@fontsource/instrument-sans/400.css";
import "@fontsource/instrument-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/shell.css";
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "./lib/api";
import { SessionProvider } from "./lib/session";
import { GuestOnly, RequireAuth, RequirePermission, RequireStaff } from "./components/guards";
import { CustomerLayout } from "./layouts/CustomerLayout";
import { StaffLayout } from "./layouts/StaffLayout";
import { STAFF_NAV } from "./layouts/staffNav";
import { Products } from "./pages/Products";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { ChangePassword } from "./pages/ChangePassword";
import { Account } from "./pages/Account";
import { NotFound } from "./pages/NotFound";
import { NotBuilt } from "./pages/NotBuilt";
import { Dashboard } from "./pages/staff/Dashboard";
import { Users } from "./pages/staff/Users";

const queryClient = new QueryClient({
  defaultOptions: {
    // Do not retry answers the server meant (4xx); retry once for network or server trouble.
    queries: { staleTime: 30_000, retry: (n, e) => !(e instanceof ApiError && e.status >= 400 && e.status < 500) && n < 1 },
  },
});

const built: Record<string, React.ReactNode> = { "/staff/users": <Users /> };
const auth = (el: React.ReactNode) => <RequireAuth>{el}</RequireAuth>;

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
            <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
            <Route path="/change-password" element={auth(<ChangePassword />)} />

            <Route element={<CustomerLayout />}>
              <Route index element={<Products />} />
              <Route path="products" element={<Products />} />
              <Route path="cart" element={auth(<RequirePermission permission="order.place"><NotBuilt title="Cart" /></RequirePermission>)} />
              <Route path="orders" element={auth(<RequirePermission permission="order.view_own"><NotBuilt title="My Orders" /></RequirePermission>)} />
              <Route path="concerns" element={auth(<RequirePermission permission="concern.submit"><NotBuilt title="Feedback & Concerns" /></RequirePermission>)} />
              <Route path="account" element={auth(<Account />)} />
              <Route path="*" element={<NotFound />} />
            </Route>

            <Route path="/staff" element={auth(<RequireStaff><StaffLayout /></RequireStaff>)}>
              <Route index element={<Dashboard />} />
              <Route path="account" element={<Account />} />
              {STAFF_NAV.filter((n) => n.permission).map((n) => (
                <Route key={n.to} path={n.to.replace("/staff/", "")}
                  element={<RequirePermission permission={n.permission!}>{built[n.to] ?? <NotBuilt title={n.label} />}</RequirePermission>} />
              ))}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </SessionProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
