# Scope, Decisions and Open Questions

## 1. How the paper's inconsistencies were resolved
The capstone paper and the client prompt kit disagreed. The developer decided: **follow the paper**, and fix diagrams that are inconsistent.

| Topic | Conflict | Decision |
|---|---|---|
| Modules | Ch. I objectives, Scope, Design and Develop phases name Orders, Inventory+POS, Membership, HR. Ch. III intro names Supplier Portal, Inventory, Ordering+Delivery, Feedback. Kit names Ordering, POS+Inventory, Feedback, RBAC. | **Objectives in Ch. I govern**: Order Management, Inventory+POS, Membership Profiling, HR Management, with auth and RBAC. |
| Supplier Application and Contract | In context diagram, DFD 4.0, ERD (Supplier, Supplier_Application, Contract) and Ch. III intro, but not in any objective or scope. | **Removed from scope.** Delete from diagrams and text. Raw materials remain without a supplier link. |
| Feedback and concerns | In Ch. III intro and kit, not in objectives. | **Kept as a small sub-feature of Order Management** (customers can send feedback or a concern tied to an order). Add one sentence to the paper. |
| Delivery | Ch. I mentions deliveries; kit says BFDC must confirm. | Pickup is built first; delivery sits behind a setting (`delivery_enabled=false`). BFDC-TBD. |
| Stack | Paper says PHP, Bootstrap, XAMPP. | **MERN with MySQL instead of MongoDB**: React, Express, Node, MySQL. XAMPP is still used for the local MySQL. Update Tables 1 and Phase 3 text (see `11`). |
| Roles | Paper has Customer, Sales Personnel, Plant Staff/Admin, Membership/HR. Kit has Customer, Staff, Admin. | Five roles: CUSTOMER, SALES, PLANT_STAFF, MEMBERSHIP_HR, ADMIN, driven by permissions (see `shared/src/roles.ts`). |
| Payroll/attendance | Appear only in literature review. | **Out of scope.** HR = employee profile and HR records only. |
| Reports | Ch. I mentions automated production and order records; objectives do not. | Printable order, sales, stock, member and employee reports in a late phase (delivery step 12). Not "production" planning. |

## 2. Decisions made by the developer's delegate (change any by editing this table)
| ID | Decision |
|---|---|
| D-01 | Monorepo with npm workspaces: `shared`, `server`, `client`. |
| D-02 | Auth: email or username + password, bcrypt, httpOnly cookie session (JWT, 12 h), session version for forced logout, 5 failed logins → 15 min lock, generic error message. |
| D-03 | Authorization by permission code, checked on every route. Role names are not checked directly except ADMIN bypass. |
| D-04 | Money in integer centavos, currency PHP. |
| D-05 | Idempotency: every mutating checkout/POS/concern/adjustment request carries a client `operationKey` (UUID) stored with a unique index. |
| D-06 | Customers may apply for membership from their account; Membership/HR approves. A Member may exist without a user account (walk-in farmers). |
| D-07 | UI follows `07-UI-DESIGN-PLAN.md`. No Figma file exists. |
| D-08 | CSS: hand-written CSS with design tokens, no Tailwind/Bootstrap, so the look stays distinctive. |
| D-09 | Product photos: placeholders until BFDC supplies real photos. |
| D-10 | Hosting: Hostinger Node.js hosting with its MySQL database, after development finishes. Not started. |

## 3. BFDC confirmation required (use the placeholder until answered)
| # | Question | Placeholder in code |
|---|---|---|
| 1 | Pickup only, or pickup and delivery? | Pickup only |
| 2 | Stock deducted at Confirmed, Preparing, or Completed? | Reserve at placement, deduct at Confirmed |
| 3 | May customers cancel a Confirmed order? | No (only while New) |
| 4 | Any fees added to totals? | None |
| 5 | POS payment methods and receipt rules? | Cash only, printable slip |
| 6 | Who may adjust stock and cancel late? | PLANT_STAFF adjusts; ADMIN cancels late |
| 7 | Can resolved concerns be reopened? | No |
| 8 | Final products, units, prices, reorder levels? | Seed: Fresh Milk, Soft Cheese, Longganisa (placeholder prices) |
| 9 | Which membership types and required member fields? | Farmer-Member, Cooperative, Associate |
| 10 | Which HR record types and who may see them? | Memo, Leave, Training, Evaluation; MEMBERSHIP_HR and ADMIN only |
| 11 | Raw materials list, units, reorder levels? | Empty; added through the UI |
| 12 | Do yogurt, flavored milk and Milk O'jel belong in the catalog? | Not seeded |
