import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { formatPeso } from "@freshflow/shared";
import { ApiError, post } from "../lib/api";
import { CART, useCart, type CustomerOrder } from "../lib/cart";
import { Field } from "../components/Field";
import { ReceiptSlip } from "../components/ReceiptSlip";

type Errors = Record<string, string[] | undefined>;
interface Problem { productId: number; name: string; message: string }

export function Checkout() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const cart = useCart();
  // Idempotency key made when the page loads (07 §7). A retry after a lost connection sends the same key,
  // so the server returns the first order instead of placing a second one.
  const [operationKey] = useState(() => crypto.randomUUID());
  const [fulfillment, setFulfillment] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [fields, setFields] = useState<Errors>({});
  const [err, setErr] = useState<{ text: string; problems?: Problem[]; toCart?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  if (cart.isPending) return <p role="status">Loading your order…</p>;
  if (cart.isError) return <div role="alert"><p>{cart.error.message}</p><button className="btn ghost" onClick={() => cart.refetch()}>Try again</button></div>;
  const c = cart.data;
  if (!busy && c.lines.length === 0) return <section className="empty"><h1>Nothing to check out</h1><p>Your cart is empty. <Link to="/products">Browse products</Link></p></section>;
  if (!c.canOrder) return <section><h1>Checkout</h1><p className="notice">Orders are placed from a customer account.</p></section>;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setBusy(true); setErr(null); setFields({});
    try {
      const order = await post<CustomerOrder & { replayed: boolean }>("/orders", {
        operationKey, contactName: f.contactName, contactNumber: f.contactNumber, fulfillment,
        address: fulfillment === "DELIVERY" ? f.address : undefined, note: f.note || undefined,
        expectedTotalCentavos: c.totalCentavos, // the total on screen; the server refuses if its own total differs
      });
      qc.setQueryData(["order", order.orderNo], order);
      await Promise.all([qc.invalidateQueries({ queryKey: CART }), qc.invalidateQueries({ queryKey: ["products"] })]);
      nav(`/checkout/placed/${order.orderNo}`, { replace: true });
    } catch (x) {
      setBusy(false);
      if (!(x instanceof ApiError)) { setErr({ text: "Something went wrong. Please try again." }); return; }
      if (x.status === 0) { setErr({ text: "Cannot reach FreshFlow. Check your connection, then press Place order again. Your order will not be placed twice." }); return; }
      if (x.fields) setFields(x.fields);
      if (x.code === "stock_changed" || x.code === "price_changed" || x.code === "cart_empty") void cart.refetch();
      if (x.code === "stock_changed") { setErr({ text: x.message, problems: x.body.problems as Problem[] | undefined, toCart: true }); return; }
      setErr({ text: x.message });
    }
  }

  return (
    <form className="checkout" onSubmit={submit} noValidate aria-busy={busy}>
      <h1>Checkout</h1>
      <ol className="steps">
        <li>
          <h2><span className="step-no mono" aria-hidden="true">1</span>Contact</h2>
          <div className="form-grid">
            <Field label="Name for this order" name="contactName" autoComplete="name" required defaultValue={c.contact?.name} error={fields.contactName} />
            <Field label="Mobile number" name="contactNumber" type="tel" inputMode="tel" autoComplete="tel" required placeholder="09XXXXXXXXX"
              defaultValue={c.contact?.contactNumber} error={fields.contactNumber} hint="BFDC calls this number about your order." />
          </div>
        </li>
        <li>
          <h2><span className="step-no mono" aria-hidden="true">2</span>Fulfillment</h2>
          <fieldset className="choices">
            <legend className="sr-only">How you get your order</legend>
            <label className="choice"><input type="radio" name="fulfillment" value="PICKUP" checked={fulfillment === "PICKUP"} onChange={() => setFulfillment("PICKUP")} />
              <span><strong>Pickup</strong><span className="hint">Collect at BFDC. We tell you when it is ready.</span></span></label>
            {/* BFDC-TBD (08 #1): delivery stays hidden until BFDC turns on delivery_enabled. */}
            {c.deliveryEnabled && (
              <label className="choice"><input type="radio" name="fulfillment" value="DELIVERY" checked={fulfillment === "DELIVERY"} onChange={() => setFulfillment("DELIVERY")} />
                <span><strong>Delivery</strong></span></label>
            )}
          </fieldset>
          {fields.fulfillment && <p className="err">{fields.fulfillment[0]}</p>}
          {fulfillment === "DELIVERY" && <Field label="Delivery address" name="address" autoComplete="street-address" required error={fields.address} />}
        </li>
        <li>
          <h2><span className="step-no mono" aria-hidden="true">3</span>Review</h2>
          <div className="field">
            <label htmlFor="note">Note for BFDC <span className="hint">(optional)</span></label>
            <textarea id="note" name="note" maxLength={300} rows={2} aria-describedby={fields.note ? "note-err" : undefined} />
            {fields.note && <span id="note-err" className="err">{fields.note[0]}</span>}
          </div>
          {/* BFDC-TBD (08 #4): no fees are added to totals until BFDC says otherwise. */}
          <ReceiptSlip title="Your order" lines={c.lines.map((l) => ({ key: l.productId, label: l.name, detail: ` × ${l.quantity} @ ${formatPeso(l.unitPriceCentavos)}`, amountCentavos: l.subtotalCentavos }))}
            totalCentavos={c.totalCentavos} meta={<span>No online payment: you pay at BFDC. No fees added.</span>}>
            {err && (
              <div role="alert" className="notice attention">
                <p>{err.text}</p>
                {err.problems && <ul>{err.problems.map((p) => <li key={p.productId}><strong>{p.name}:</strong> {p.message}</li>)}</ul>}
                {err.toCart && <p><Link to="/cart">Back to cart</Link></p>}
              </div>
            )}
            <button className="btn block" disabled={busy || !c.canCheckout}>
              {busy ? <><span className="spinner" aria-hidden="true" /> Placing order…</> : `Place order · ${formatPeso(c.totalCentavos)}`}
            </button>
            {!c.canCheckout && !err && <p className="hint">Some items changed. <Link to="/cart">Fix them in your cart</Link> to continue.</p>}
          </ReceiptSlip>
        </li>
      </ol>
    </form>
  );
}
