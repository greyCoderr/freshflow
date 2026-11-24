import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CartLineProblem } from "@freshflow/shared";
import { api, post } from "./api";
import { useSession } from "./session";

export interface CartLine {
  productId: number; name: string; unit: string; imageUrl: string | null;
  unitPriceCentavos: number; quantity: number; subtotalCentavos: number; available: number; problem: CartLineProblem | null;
}
export interface Cart {
  lines: CartLine[]; count: number; totalCentavos: number; canCheckout: boolean; canOrder: boolean;
  deliveryEnabled: boolean; contact: { name: string; contactNumber: string } | null;
}
export interface CustomerOrder {
  orderNo: string; status: string; fulfillment: "PICKUP" | "DELIVERY";
  contactName: string; contactNumber: string; address: string | null; note: string | null;
  totalCentavos: number; createdAt: string;
  items: { productId: number; productName: string; unit: string; unitPriceCentavos: number; quantity: number; subtotalCentavos: number }[];
  history: { toStatus: string; at: string; actorRole: string | null }[];
}
export const CART = ["cart"] as const;

/** The server-side cart. Only fetched for accounts that may order; everyone else gets undefined. */
export function useCart() {
  const s = useSession();
  return useQuery({ queryKey: CART, queryFn: () => api<Cart>("/cart"), enabled: s.can("order.place") && !s.user?.mustChangePassword, staleTime: 10_000 });
}

/** Every cart change answers with the whole cart; it replaces the cached one so totals are always the server's. */
export function useCartMutations() {
  const qc = useQueryClient();
  const onSuccess = (c: Cart) => { qc.setQueryData(CART, c); void qc.invalidateQueries({ queryKey: ["products"] }); };
  const add = useMutation({ mutationFn: (v: { productId: number; quantity: number }) => post<Cart>("/cart/items", v), onSuccess });
  const setQty = useMutation({
    mutationFn: (v: { productId: number; quantity: number }) => api<Cart>(`/cart/items/${v.productId}`, { method: "PATCH", body: JSON.stringify({ quantity: v.quantity }) }),
    onSuccess,
  });
  const remove = useMutation({ mutationFn: (productId: number) => api<Cart>(`/cart/items/${productId}`, { method: "DELETE" }), onSuccess });
  return { add, setQty, remove };
}
