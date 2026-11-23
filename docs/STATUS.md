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
| Frontend: session, route guards, Login, Register, forced password change, Account, CustomerLayout (top bar + phone sheet), StaffLayout (left rail, drawer under 1024px), 403, 404, minimal Users page | Patch 0002: typecheck + build pass; `npm run dev` starts API (:3000) and web (:5173) | Manual checklist against the real API still pending |
| Public product list API + Products page | Written, not tested against DB | Patch 0003 |
| Everything else (patches 0003 to 0014, see 13) | Not started | |

Next: Patch 0003 (catalog, cart, checkout). Tick the tracker in `13-ROADMAP-AND-PATCH-PROMPTS.md` after each patch.
Repo: github.com/greyCoderr/freshflow (main).
Known gaps:
- Authoring sandbox cannot download Prisma engines, so DB tests run only on the developer's machine and in CI.
- `npm install` reports 10 audit findings (3 moderate, 5 high, 2 critical); not reviewed yet. Do not run `npm audit fix --force`.
- Password reset by email/SMS not built (BFDC-TBD); Login says "ask the BFDC office". Admin reset arrives in 0011.
- Full Users/Roles/Audit screens are patch 0011; 0002 has only list, create, deactivate/activate.
