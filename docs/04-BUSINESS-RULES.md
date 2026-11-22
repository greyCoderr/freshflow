# FreshFlow Business Rules

## Order state machine

| Current status | Permitted next status |
|---|---|
| New | Confirmed, Rejected, Cancelled |
| Confirmed | Preparing, Cancelled |
| Preparing | Ready for Pickup, Out for Delivery, Cancelled by authorized staff |
| Ready for Pickup | Completed |
| Out for Delivery | Completed |
| Completed | None |
| Rejected | None |
| Cancelled | None |

Only expose Out for Delivery when Delivery is enabled. Completed, Rejected, and Cancelled are terminal.

## Inventory quantities

For each product:

    available_stock = physical_stock - reserved_stock

- Reserve valid quantities when an order is accepted for placement.
- Release the reservation when an order is rejected or cancelled before deduction.
- Convert the reservation to an Order Out movement at the BFDC-approved deduction status.
- Prevent available stock from becoming negative.
- Lock or otherwise protect affected stock records during concurrent order/POS completion.

**BFDC confirmation required:** choose whether physical deduction occurs at Confirmed, Preparing, or Completed. Recommended default: reserve at placement and deduct at confirmation.

## Movement types

| Type | Effect |
|---|---:|
| Stock In | Physical stock increases |
| POS Sale Out | Physical stock decreases |
| Order Out | Physical stock decreases and corresponding reservation clears |
| Reservation Released | Reserved stock decreases; physical stock unchanged |
| Adjustment In | Physical stock increases |
| Adjustment Out | Physical stock decreases |

Every movement has one product, positive magnitude, direction/type, reference, reason, actor, and timestamp.

## Pricing

- The server owns the current product price.
- Cart display is provisional until server validation.
- Order and sale items store product name, unit, and unit-price snapshots.
- Historical totals never change after later product-price edits.
- Use fixed decimal money arithmetic and an explicit currency.

## Cancellation

Cancellation records the actor, reason, previous status, timestamp, and inventory consequence in one transaction. It never deletes an order.

## Concern state machine

| Current status | Permitted next status |
|---|---|
| Open | In Review, Resolved |
| In Review | Responded, Resolved |
| Responded | In Review, Resolved |
| Resolved | None unless authorized reopening is approved |

## Idempotency

Order placement, POS completion, cancellation, stock adjustment, and concern response endpoints must safely reject or return the prior result for repeated submissions using the same operation key.

## BFDC confirmation required

1. Pickup only or Pickup and Delivery
2. Physical stock deduction status
3. Whether customers can cancel Confirmed orders
4. Any fees added to product totals
5. POS payment-method and receipt requirements
6. Staff permissions for adjustments and late cancellation
7. Whether resolved concerns can be reopened
8. Final products, units, prices, and reorder levels

