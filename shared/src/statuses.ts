export const ORDER_STATUSES = ["NEW","CONFIRMED","PREPARING","READY_FOR_PICKUP","OUT_FOR_DELIVERY","COMPLETED","REJECTED","CANCELLED"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

const ORDER_NEXT: Record<OrderStatus, readonly OrderStatus[]> = {
  NEW: ["CONFIRMED", "REJECTED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "CANCELLED"],
  READY_FOR_PICKUP: ["COMPLETED"],
  OUT_FOR_DELIVERY: ["COMPLETED"],
  COMPLETED: [], REJECTED: [], CANCELLED: [],
};
export const ORDER_TERMINAL: readonly OrderStatus[] = ["COMPLETED", "REJECTED", "CANCELLED"];
export const REASON_REQUIRED: readonly OrderStatus[] = ["REJECTED", "CANCELLED"];

export function nextOrderStatuses(from: OrderStatus, deliveryEnabled: boolean): OrderStatus[] {
  return ORDER_NEXT[from].filter((s) => deliveryEnabled || s !== "OUT_FOR_DELIVERY");
}
export function canMoveOrder(from: OrderStatus, to: OrderStatus, deliveryEnabled: boolean): boolean {
  return nextOrderStatuses(from, deliveryEnabled).includes(to);
}

export const CONCERN_STATUSES = ["OPEN", "IN_REVIEW", "RESPONDED", "RESOLVED"] as const;
export type ConcernStatus = (typeof CONCERN_STATUSES)[number];
const CONCERN_NEXT: Record<ConcernStatus, readonly ConcernStatus[]> = {
  OPEN: ["IN_REVIEW", "RESOLVED"], IN_REVIEW: ["RESPONDED", "RESOLVED"],
  RESPONDED: ["IN_REVIEW", "RESOLVED"], RESOLVED: [],
};
export function canMoveConcern(from: ConcernStatus, to: ConcernStatus): boolean {
  return CONCERN_NEXT[from].includes(to);
}

export const MOVEMENT_TYPES = ["STOCK_IN","POS_SALE_OUT","ORDER_OUT","RESERVATION_RELEASED","ADJUSTMENT_IN","ADJUSTMENT_OUT","ORDER_RESERVED"] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];
/** Effect on [physical, reserved] for a positive quantity q. */
export const MOVEMENT_EFFECT: Record<MovementType, { physical: 1 | 0 | -1; reserved: 1 | 0 | -1 }> = {
  STOCK_IN: { physical: 1, reserved: 0 },
  POS_SALE_OUT: { physical: -1, reserved: 0 },
  ORDER_OUT: { physical: -1, reserved: -1 },
  RESERVATION_RELEASED: { physical: 0, reserved: -1 },
  ADJUSTMENT_IN: { physical: 1, reserved: 0 },
  ADJUSTMENT_OUT: { physical: -1, reserved: 0 },
  // Added in 0003: placing an order reserves stock, so reserved stock can be traced from movements alone.
  ORDER_RESERVED: { physical: 0, reserved: 1 },
};
export const availableStock = (physical: number, reserved: number) => physical - reserved;
