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
Docs for humans and for Claude are in `docs/` (start with `00-MASTER-PROMPT.md`). Progress: `docs/STATUS.md`.
