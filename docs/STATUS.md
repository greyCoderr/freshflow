# STATUS (update with every patch)

| Area | State | Evidence |
|---|---|---|
| Repo scaffold (workspaces, TS, CI) | Done | `npm install` ran; client build ran |
| Shared rules (order and concern machines, money, roles, schemas) | Done | Unit tests pass |
| Prisma schema (all entities) | Done | Initial migration `init` applied by developer (patch 0001). Patch 0002 adds no migration. `init` SQL also applied cleanly to MariaDB 10.11 in the authoring sandbox. |
| Auth: login, register (always CUSTOMER), logout (ends all sessions), me, lockout (5 fails → 15 min), change-password (session version bump) | Patch 0002: done, DB-tested | Developer machine, Nov 23: `npm run test:db` 100/100 pass (auth 12, role matrix 88) |
| Admin-created staff accounts (DEFAULT_PASSWORD + forced change), deactivate/activate, audit entries | Patch 0002: done, DB-tested | Same run |
| Permission guards for every API area (`API_GUARDS` in shared; unbuilt areas answer 501 behind the guard) | Patch 0002: done | Role×area 403 matrix passes (same run) |
| Vitest `db` project, `freshflow_test`, reset helper (refuses non-`_test` DBs) | Patch 0002: done | Developer: `npm run typecheck` OK, `test:unit` 18/18, `test:db` 100/100 on XAMPP MySQL |
| Frontend: session, route guards, Login, Register, forced password change, Account, CustomerLayout, StaffLayout, 403, 404, minimal Users page | Patch 0002: typecheck + build pass; `npm run dev` starts API and web | Manual checklist against the real API still pending |
| Public product list API | Patch 0003: DB-tested (sandbox) | Availability = physical − reserved, never below 0; checked after an order in `checkout.db.test.ts` |
| Server-side cart: add (accumulates), change, remove; stock limit messages; retired/unknown product refused; non-customer accounts (ADMIN) may view but not fill | Patch 0003: DB-tested (sandbox) | See evidence note below |
| Checkout `POST /api/orders`: operationKey idempotency, server prices only, `expectedTotalCentavos` check, ONE transaction (Cart row lock → idempotency re-check → InventoryBalance `FOR UPDATE` ascending → re-check → order + item snapshots + history + `ORDER_RESERVED` movements → empty cart), deadlock retry | Patch 0003: DB-tested (sandbox) | 20 tests: double submit (sequential, 5 at once, two tabs), key reused by another customer, price tampering, price changed, last-unit race, 8 customers/3 units, stock changed since adding, retired product. Removing the `FOR UPDATE` locks makes the race tests fail (checked). |
| Own-order receipt `GET /api/orders/:orderNo` (other customers get the same 404 as a missing order) | Patch 0003: DB-tested (sandbox) | List, tracking, cancel are 0004 (`/api/orders` still answers 501 for those) |
| Migrations `20261123150000_order_reserved_movement`, `20261123150100_check_constraints` (21 CHECKs: stock ≥ 0, reserved ≤ physical, qty > 0, money ≥ 0, subtotal = price × qty, sale change) | Patch 0003: applied cleanly to MariaDB 10.11 (sandbox) | CHECKs rejecting bad rows tested. **Not yet run on MySQL 8 / XAMPP / CI** |
| Customer UI: hang-tag product rows with tally stepper + ticks, cart count in top bar, Cart (lines + sticky receipt slip; phone bottom bar), Checkout (3 numbered sections, key made on load, spinner, stock/price-changed states), Confirmation (bottle-cap stamp, mono order no., receipt slip) | Patch 0003: typecheck + build pass; flow driven in headless Chrome at 1440 and 390 (register → add → cart → checkout → stock-changed → order → reload confirmation) | Screenshots in the 0003 handoff. Keyboard-only, screen reader and 768/1024 not checked yet (0013) |
| Everything else (patches 0004 to 0014, see 13) | Not started | |

**Evidence note for 0003 (read this):** the authoring sandbox still cannot download Prisma engines. The DB tests ran there on **MariaDB 10.11 through Prisma's WASM query compiler + `@prisma/adapter-mariadb`** (a sandbox-only shim, not in the patch), with migrations applied as SQL: `vitest` 144/144 (unit 24, db 120), three runs in a row. The developer must still run `npm run db:migrate`, `npm run typecheck` and `npm test` on XAMPP with the normal engine, and CI must pass on MySQL 8.4, before 0003 counts as verified.

Next: developer verifies 0003, then Patch 0004 (customer orders, tracking, cancel while New, release reservation). Tick the tracker in `13-ROADMAP-AND-PATCH-PROMPTS.md` after each patch.
Repo: github.com/greyCoderr/freshflow (main; 0002 is on branch `patch-0002`, 0003 is built on top of it).
Known gaps:
- Authoring sandbox cannot download Prisma engines (see evidence note).
- TiDB accepts CHECK constraints but enforces them only with `tidb_enable_check_constraint=ON` (v7.2+). The API never relies on them; check in 0005 `tidb:check`.
- Pickup place and hours are not shown anywhere (BFDC-TBD 08 #1). Delivery hidden (`delivery_enabled=false`).
- Product photos: placeholders (D-09).
- `npm install` reports 10 audit findings (3 moderate, 5 high, 2 critical); not reviewed yet. Do not run `npm audit fix --force`.
- Password reset by email/SMS not built (BFDC-TBD); Login says "ask the BFDC office". Admin reset arrives in 0011.
- Full Users/Roles/Audit screens are patch 0011; 0002 has only list, create, deactivate/activate.
