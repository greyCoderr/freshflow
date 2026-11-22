# Architecture and Delivery Workflow

## Repo layout
```
freshflow/
  shared/   roles, permissions, status machines, money, Zod schemas (unit-tested, no I/O)
  backend/   Express API, Prisma (MySQL), routes by feature, middleware
  frontend/   React + Vite, tokens.css, components, layouts, pages
  docs/     this knowledge pack
```
Backend feature layout: `routes/<feature>.ts` (HTTP + validation + permission) calling plain functions that use `prisma.$transaction`. Rules live in `shared` so frontend and backend cannot disagree.

## Transactions and locking
Order placement, cancellation, deduction, POS sale and stock adjustment each run in one `prisma.$transaction`. Lock the affected `InventoryBalance` rows with `SELECT ... FOR UPDATE` (raw query) in ascending product id order to avoid deadlocks, re-check availability after locking, write the movement rows in the same transaction.
Add CHECK constraints by hand in the migration SQL: `physical_stock >= 0`, `reserved_stock >= 0`, `reserved_stock <= physical_stock`, `quantity > 0`.

## Delivery workflow (vibe-coding with Claude as the platform)
1. Developer keeps the repo on GitHub (`main` plus a short-lived branch per patch).
2. Developer asks for one workflow, e.g. "Patch 0003: cart and checkout".
3. Claude replies with: a plan of 5 lines, `NNNN-name.patch` (unified diff, repo-root relative, `git apply`-able), the verify commands, and a `STATUS.md` update.
4. Developer runs:
   ```
   git checkout -b patch-0003
   git apply --check 0003-cart-and-checkout.patch
   git apply 0003-cart-and-checkout.patch
   npm install        # only if package.json changed
   npm run typecheck && npm test
   git add -A && git commit -m "0003 cart and checkout" && git push
   ```
5. GitHub Actions repeats the checks on a clean machine. If anything fails, paste the failing step's text (never `.env` values).
6. If a patch does not apply, attach the current version of the files named in the error. Claude resends a patch against that file.

Rules: one patch = one workflow; never edit applied patches, send a new one; new migrations only add (never edit an applied migration); `.env` never leaves the developer's machine.

## Local setup
XAMPP: start MySQL, create DB `freshflow`. Copy `.env.example` to `.env`. Then `npm install`, `npm run db:migrate`, `npm run db:seed`, `npm run dev`. API on :3000, web on :5173.
Seeded admin: username `admin`, password from `.env` (`ADMIN_PASSWORD`); change it before any deployment.

## Deployment (later)
Hostinger Node.js hosting. Build with `npm run build`, run `npm start`, run `npm run db:deploy` against the production DB. Set real `JWT_SECRET`, `COOKIE_SECURE=true`, `NODE_ENV=production`. Uploaded images go in a persistent folder outside the deploy directory (decide at deployment).
