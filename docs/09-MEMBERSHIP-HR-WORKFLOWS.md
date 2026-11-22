# Membership Profiling and HR Workflows (paper Objectives 3 and 4)

Permissions: `member.view`, `member.manage`, `employee.view`, `employee.manage`. Held by MEMBERSHIP_HR and ADMIN. SALES may view members only.

## Membership
- A Member has: member number (generated, unique), full name, address, contact number, membership type, membership date, status (Pending, Active, Inactive).
- Walk-in registration: Membership/HR creates a member directly (status Active).
- Customer application: a logged-in Customer submits "Apply for membership" (name, address, contact, type requested). Status Pending. Membership/HR approves or marks Inactive with a reason. The Customer sees the status in Account.
- Update: edits are recorded in the audit log (who, what changed, never the full record dump).
- Search by name, number, status, type. Printable member list and member profile.
- Members are never deleted; use Inactive.

## Human Resources
- Employee: employee number (generated), full name, position, department, contact number, date hired, employment status (Active, On Leave, Resigned, Terminated). Optionally linked to a staff user account.
- HR Records belong to an employee: type (Memo, Leave, Training, Evaluation, Other), description, record date, created by. Append-only: corrections are new records.
- Employee list with search and status filter; employee page shows profile and record history.
- Out of scope: attendance, payroll, recruitment.
- Access: only `employee.view/manage`. Customers, Sales and Plant Staff never see employee data. Every view of a profile is not logged, but every create/update/status change is.

## Required states
Loading, empty, no search result, validation error, permission denied, success, double-submit protection (same as `06`).

## Acceptance
- Membership/HR can register, approve, update and deactivate members; history is retained.
- A Customer can apply and see the outcome, and cannot see any other member.
- Membership/HR can add employees and HR records; a SALES user gets 403 on every employee endpoint (test required).
