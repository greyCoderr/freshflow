# FreshFlow (BFDC)
Web-based management system: Order Management, Inventory + POS, Membership Profiling, HR, with role-based access.
Stack: React + Vite, Node + Express, MySQL (Prisma), TypeScript.

Quick start (Windows, XAMPP MySQL running, DB `freshflow` created):
```
copy .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev
```
Tests:
```
npm run test:unit   # no database needed
npm run test:db     # needs MySQL running; uses its own database freshflow_test (created and migrated automatically, wiped between tests)
npm test            # both
```
If your MySQL root user has a password, set `TEST_DATABASE_URL` in `.env` (the database name must end in `_test`).

Docs for humans and for Claude are in `docs/` (start with `00-MASTER-PROMPT.md`). Progress: `docs/STATUS.md`.
