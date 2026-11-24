import { Link, useNavigate } from "react-router-dom";
import { CART_PROBLEM_TEXT, formatPeso } from "@freshflow/shared";
import { useCart, useCartMutations, type CartLine } from "../lib/cart";
import { TallyStepper } from "../components/TallyStepper";
import { ReceiptSlip } from "../components/ReceiptSlip";
import { BottleSketch } from "../components/BottleSketch";

function Line({ l, busy, onQty, onRemove }: { l: CartLine; busy: boolean; onQty: (n: number) => void; onRemove: () => void }) {
  // A line over the stock left can still be lowered: the stepper max is the larger of the two.
  const max = Math.max(l.available, l.quantity);
  return (
    <li className={`cline${l.problem ? " has-problem" : ""}`}>
      <div className="cline-photo" aria-hidden="true">{l.imageUrl ? <img src={l.imageUrl} alt="" /> : null}</div>
      <div className="cline-body">
        <h2 className="cline-name">{l.name}</h2>
        <p className="cline-unit"><span>{l.unit}</span> · <span className="mono">{formatPeso(l.unitPriceCentavos)}</span> each</p>
        {l.problem && <p className="cline-problem" role="status">{CART_PROBLEM_TEXT[l.problem](l.available)}</p>}
        <div className="cline-act">
          {l.problem === "unavailable" || l.problem === "out_of_stock"
            ? null
            : <TallyStepper label={l.name} value={l.quantity} max={max} onChange={onQty} disabled={busy}
                limitText={l.quantity >= l.available ? `Only ${l.available} left.` : undefined} />}
          <button type="button" className="linklike" onClick={onRemove} disabled={busy}>Remove<span className="sr-only"> {l.name}</span></button>
        </div>
      </div>
      <p className="cline-sub mono">{formatPeso(l.subtotalCentavos)}</p>
    </li>
  );
}

export function Cart() {
  const nav = useNavigate();
  const cart = useCart();
  const { setQty, remove } = useCartMutations();
  const err = setQty.error ?? remove.error;

  if (cart.isPending) return <p role="status">Loading your cart…</p>;
  if (cart.isError) return <div role="alert"><p>{cart.error.message}</p><button className="btn ghost" onClick={() => cart.refetch()}>Try again</button></div>;
  const c = cart.data;
  if (c.lines.length === 0) {
    return (
      <section className="empty">
        <BottleSketch />
        <h1>Your cart is empty</h1>
        <p>Add fresh milk, cheese or longganisa to place a pickup order. <Link to="/products">Browse products</Link></p>
      </section>
    );
  }
  const busyId = setQty.isPending ? setQty.variables?.productId : remove.isPending ? remove.variables : undefined;
  const blocked = !c.canCheckout;
  return (
    <div className="cart">
      <div className="cart-lines">
        <h1>Cart</h1>
        {err && <p role="alert" className="notice attention">{err.message}</p>}
        {blocked && c.canOrder && <p className="notice attention" role="status">Some items changed since you added them. Fix the marked lines to continue.</p>}
        {!c.canOrder && <p className="notice">Orders are placed from a customer account.</p>}
        <ul className="clist">
          {c.lines.map((l) => (
            <Line key={l.productId} l={l} busy={busyId === l.productId}
              onQty={(quantity) => setQty.mutate({ productId: l.productId, quantity })}
              onRemove={() => remove.mutate(l.productId)} />
          ))}
        </ul>
        <p><Link to="/products">Continue shopping</Link></p>
      </div>
      <aside className="cart-side">
        <ReceiptSlip title="Order summary" totalLabel="Total"
          meta={<span>{c.count} {c.count === 1 ? "item" : "items"} · prices checked again when you place the order</span>}
          lines={c.lines.map((l) => ({ key: l.productId, label: l.name, detail: ` × ${l.quantity}`, amountCentavos: l.subtotalCentavos }))}
          totalCentavos={c.totalCentavos}>
          <button className="btn block" disabled={blocked} onClick={() => nav("/checkout")}>Review order</button>
        </ReceiptSlip>
      </aside>
      {/* Phone: the slip becomes a bar fixed to the bottom (07 §7). */}
      <div className="cart-bar">
        <span>Total <strong className="mono">{formatPeso(c.totalCentavos)}</strong></span>
        <button className="btn" disabled={blocked} onClick={() => nav("/checkout")}>Review order</button>
      </div>
    </div>
  );
}
