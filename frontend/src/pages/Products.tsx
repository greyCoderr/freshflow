import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "../lib/api";
import { useSession } from "../lib/session";
import { useCart, useCartMutations } from "../lib/cart";
import { ProductRow, type AddMode, type ProductDto } from "../components/ProductRow";

type Msg = { id: number; tone: "ok" | "attention"; text: string } | null;

export function Products() {
  const s = useSession();
  const nav = useNavigate();
  const q = useQuery({ queryKey: ["products"], queryFn: () => api<ProductDto[]>("/products") });
  const cart = useCart();
  const { add } = useCartMutations();
  const [msg, setMsg] = useState<Msg>(null);

  const mode: AddMode = !s.user ? "guest" : s.can("order.place") && cart.data?.canOrder !== false ? "customer" : "cannot_order";
  const inCart = new Map((cart.data?.lines ?? []).map((l) => [l.productId, l.quantity]));

  function onAdd(productId: number, quantity: number) {
    setMsg(null);
    add.mutate({ productId, quantity }, {
      onSuccess: () => setMsg({ id: productId, tone: "ok", text: `Added ${quantity} to your cart.` }),
      onError: (e) => {
        if (e instanceof ApiError && e.status === 401) { nav("/login?next=/products"); return; }
        setMsg({ id: productId, tone: "attention", text: e.message });
        void q.refetch(); // the stock number shown was out of date
      },
    });
  }

  if (q.isPending) return <p role="status">Loading products…</p>;
  if (q.isError) return <div role="alert"><p>{q.error.message}</p><button className="btn ghost" onClick={() => q.refetch()}>Try again</button></div>;
  if (q.data.length === 0) return <p>No products are available right now. Please check back soon.</p>;
  return (
    <>
      <h1>Products</h1>
      {mode === "cannot_order" && <p className="notice">Orders are placed from a customer account. Staff record walk-in sales in POS.</p>}
      <ul className="plist">
        {q.data.map((p) => (
          <ProductRow key={p.id} p={p} inCart={inCart.get(p.id) ?? 0} mode={mode}
            busy={add.isPending && add.variables?.productId === p.id}
            message={msg?.id === p.id ? msg : null} onAdd={onAdd} />
        ))}
      </ul>
    </>
  );
}
