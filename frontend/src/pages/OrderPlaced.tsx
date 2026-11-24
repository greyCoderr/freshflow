import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatPeso } from "@freshflow/shared";
import { api } from "../lib/api";
import { formatDateTime } from "../lib/format";
import type { CustomerOrder } from "../lib/cart";
import { BottleCap } from "../components/BottleCap";
import { ReceiptSlip } from "../components/ReceiptSlip";
import { StatusMark } from "../components/StatusMark";

/** 07 §7 Confirmation: bottle-cap stamp, order number in large mono, receipt slip, plain next step, "Track this order". */
export function OrderPlaced() {
  const { orderNo = "" } = useParams();
  // Filled by checkout; fetched (own orders only) after a reload.
  const q = useQuery({ queryKey: ["order", orderNo], queryFn: () => api<CustomerOrder>(`/orders/${encodeURIComponent(orderNo)}`) });
  if (q.isPending) return <p role="status">Loading your order…</p>;
  if (q.isError) return <div role="alert"><p>{q.error.message}</p><p><Link to="/orders">Go to My Orders</Link></p></div>;
  const o = q.data;
  const units = o.items.reduce((n, i) => n + i.quantity, 0);
  return (
    <div className="placed">
      <header className="placed-head">
        <BottleCap />
        <div>
          <h1>Order placed</h1>
          <p className="placed-no mono" aria-label={`Order number ${o.orderNo.split("").join(" ")}`}>{o.orderNo}</p>
          <p className="quiet"><time dateTime={o.createdAt} title={o.createdAt}>{formatDateTime(o.createdAt)}</time> · <StatusMark status={o.status} /></p>
        </div>
      </header>
      <p className="lead">
        {/* BFDC-TBD (08 #1): pickup place and hours are shown only once BFDC supplies them. */}
        BFDC will confirm your order. {o.fulfillment === "PICKUP" ? "When it is ready for pickup, bring this order number." : "We will contact you about delivery."} We may call {o.contactNumber} if something changes.
      </p>
      <ReceiptSlip title="Receipt" className="placed-slip"
        meta={<span>{o.orderNo} · {units} {units === 1 ? "item" : "items"} · {o.fulfillment === "PICKUP" ? "Pickup" : "Delivery"} · {o.contactName}</span>}
        lines={o.items.map((i) => ({ key: i.productId, label: i.productName, detail: ` × ${i.quantity} @ ${formatPeso(i.unitPriceCentavos)}`, amountCentavos: i.subtotalCentavos }))}
        totalCentavos={o.totalCentavos}>
        {o.note && <p className="receipt-note">Note: {o.note}</p>}
      </ReceiptSlip>
      <p className="row-actions">
        <Link className="btn" to={`/orders/${o.orderNo}`}>Track this order</Link>
        <Link className="btn ghost" to="/products">Keep shopping</Link>
      </p>
    </div>
  );
}
