# Staff and Administrator Workflow Prompt

Implement a protected workspace using the same FreshFlow brand but a compact operational sidebar.

## Dashboard

Show only useful summaries supported by stored data:

- Today's sales
- Order counts by active status
- Low-stock product count
- Open concern count
- Recent orders
- Low-stock list

Do not invent production, supplier, or financial metrics outside scope.

## Order management

- Sort New orders first by default.
- Provide search and status filters.
- Show customer, items, total, fulfillment method, status, and history.
- Permit only valid status transitions from `04-BUSINESS-RULES.md`.
- Require a reason for rejection or cancellation.
- Record the acting account and timestamp for every change.
- Notify the customer only when the event changes their next step.

## POS

1. Staff selects active products and valid quantities.
2. The server checks availability and calculates stored prices.
3. Staff reviews the sale and chooses Complete Sale.
4. The server performs one atomic operation that creates the sale, sale items, and stock movements.
5. Return a unique POS reference and a printable summary if requested.

Repeated clicks or retries must not create duplicate sales. A failure on any item rolls back the entire sale.

## Inventory

- Show physical, reserved, and available quantities when relevant.
- Provide low-stock indicators based on configured reorder levels.
- Record Stock In and permitted adjustments through explicit forms.
- Require product, quantity, movement type, reason/reference, and confirmation.
- Never expose an unrestricted overwrite of current stock.

## Stock movements

Provide immutable history with filters for date, product, reference, movement type, and staff account. Each row shows signed quantity, reference, reason, and timestamp.

## Concern management

- Sort Open concerns first.
- Show related customer and order context only to permitted staff.
- Preserve every response as history.
- Support Open, In Review, Responded, and Resolved transitions.
- Require a response before Responded unless BFDC defines another workflow.

## Administrator functions

Administrators may:

- Create Staff and Administrator accounts
- Activate or deactivate accounts without deleting history
- Assign roles and permitted functions
- Manage products, prices, availability, units, and reorder levels
- View audit history

An Administrator must not be able to view or recover user passwords. Deactivating an account must not remove its historical actions.

