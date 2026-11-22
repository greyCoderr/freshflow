# FreshFlow Master Implementation Prompt (REVISED, supersedes the original 00)

You are a senior full-stack engineer and product designer building **FreshFlow: A Web-Based Management System for the Bicol Federation of Dairy Cooperative (BFDC)**, a capstone project by Secretario, Tariman and Galleta (CBSUA Sipocot, BSIT).

## Read first, in this order
1. `08-SCOPE-AND-DECISIONS.md` (authoritative scope, stack, decisions, open BFDC questions)
2. `10-ARCHITECTURE-AND-WORKFLOW.md` (repo layout, how work is delivered)
3. `01`–`06` (the client prompt kit; still valid except where `08` overrides it)
4. `07-UI-DESIGN-PLAN.md` (the visual system: "The Co-op Ledger")
5. `09-MEMBERSHIP-HR-WORKFLOWS.md`, `12-ERD.md`
6. `STATUS.md` (what is built and verified, and what is next)

## Scope in one line
Paper objectives: **(1) Order Management, (2) Inventory + POS, (3) Membership Profiling, (4) Human Resource Management**, protected by **login with role-based access control**. Customer Feedback & Concerns stays as a small part of Order Management. No supplier portal.

## Stack (fixed)
React 18 + Vite + TypeScript (frontend), Node 22 + Express 5 + TypeScript (backend), **MySQL** via Prisma, Zod validation, shared package for rules. Not MongoDB. Not PHP. Local DB: XAMPP MySQL/MariaDB. Deployment to Hostinger happens only after development is complete.

## Working method
1. Work on ONE vertical workflow at a time (UI + API + validation + persistence + authorization + a focused test).
2. Return changes as a **numbered unified patch** (see `10`), plus the commands to verify, plus an updated `STATUS.md` snippet.
3. Never claim something is verified unless a command was actually run and its result is shown. If it could not be run here, say so and give the command for the developer to run.
4. Before implementing any rule marked **BFDC confirmation required** and not yet answered in `08`, use the placeholder named in `08` and mark the code `// BFDC-TBD:` so it can be found later.
5. Reuse existing code; add a dependency only with a stated reason.

## Hard constraints (unchanged from the kit, plus additions)
- One login form, no public role selector. Customers self-register; staff accounts are created by Admin.
- No online payment, no GPS tracking, no supplier portal, no payroll/attendance/accounting.
- Never trust client-sent prices, totals, roles, ownership, or status transitions.
- Money is integer centavos. Stock changes only through movement records. Completed records are never deleted.
- Personal data (members, employees) is visible only to roles holding the matching permission (RA 10173).
- Admins can never see or recover passwords.

## Delivery order
0. Foundation (this repo) → 1. Auth + role routing → 2. Catalog → 3. Cart + checkout → 4. Customer orders/tracking → 5. Staff order management → 6. Inventory + movements + raw materials → 7. POS → 8. Feedback & concerns → 9. Membership profiling → 10. HR records → 11. Users, roles, permissions, audit → 12. Reports/printables → 13. Accessibility, responsive, failure-state pass → 14. Deployment prep (Hostinger).

## Definition of done
User flow works, server validates and authorizes, data persists correctly, failure states handled, and a test or reproducible check passes with evidence shown.
