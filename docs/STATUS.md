# STATUS (update with every patch)

| Area | State | Evidence |
|---|---|---|
| Repo scaffold (workspaces, TS, CI) | Done | `npm install` ran; client build ran |
| Shared rules (order and concern machines, money, roles, schemas) | Done | 12 unit tests pass |
| Prisma schema (all entities) | Written, NOT yet validated | Needs `prisma validate` + first migration on a real DB |
| Auth (login, register, logout, me, lockout) | Written, NOT tested | Needs DB; first test target of patch 0001 |
| Public product list API | Written, NOT tested | |
| Frontend: tokens, StatusMark, TallyStepper, ProductRow, Login, Products | Built, visual check pending | `vite build` passes |
| Everything else | Not started | |

Next: Patch 0001, run first migration, seed, and add DB-backed auth and role-boundary tests.
Known gaps: server typecheck/Prisma generate could not run in the authoring sandbox (blocked download); first CI run will be the first real check.
