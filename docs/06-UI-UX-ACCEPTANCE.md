# UI/UX and Acceptance Prompt

Use the PNG mockups in the parent folder as visual references. Build responsive web interfaces, not pixel images embedded as pages.

## Visual language

- Warm ivory base surfaces
- Forest-green primary actions and active navigation
- Soft sage secondary surfaces and agricultural imagery
- Charcoal text with accessible contrast
- Restrained orange for warnings and selected secondary actions
- Spacious layout with few clear sections
- Consistent rounded corners and light borders
- Real product photography for Milk, Cheese, and Longganisa
- No overloaded dashboards, nested card walls, decorative metrics, or unnecessary animations

## Navigation

Customer navigation:

- Home
- Products
- My Orders
- Feedback & Concerns
- Cart
- Account

Staff navigation:

- Dashboard
- POS
- Orders
- Inventory
- Stock Movements
- Concerns

Administrator navigation adds:

- Users & Roles
- Settings or product configuration only when implemented

## Accessibility

- All controls are keyboard reachable and have visible focus.
- Inputs have persistent labels and useful validation messages.
- Status is communicated by text and color.
- Icon-only buttons have accessible names.
- Tables have correct headers and usable responsive alternatives.
- Dialogs trap focus and return it to the triggering control.
- Meet WCAG AA contrast for text and interactive states.
- Respect reduced-motion preferences.

## Responsive behavior

- Preserve the complete customer ordering flow on phone-sized screens.
- Convert staff sidebars into a labeled drawer without hiding the current location.
- Convert wide operational tables to horizontal scroll or structured rows without deleting critical fields.
- Keep primary actions reachable without overlapping content.

## Required interface states

Every data-driven screen defines:

- Initial loading
- Empty result
- Search with no result
- Validation error
- Permission denied
- Session expired
- Network/server failure with safe retry
- Successful mutation
- Disabled/in-progress submission

## Acceptance checks by objective

### Objective 1

- Customer can browse products, add valid quantities, place an order, and view its status history.
- Server-calculated totals and stored order snapshots are displayed consistently.

### Objective 2

- Staff can complete a POS sale exactly once.
- Inventory and movement history reflect the sale.
- Staff can record authorized Stock In and adjustments with reasons.

### Objective 3

- Customer can submit and follow an owned concern.
- Staff can respond and update it through valid statuses.
- Response history remains visible and ordered.

### Objective 4

- One login routes users by assigned role.
- Customer, Staff, and Administrator boundaries are enforced by the server.
- Unauthorized direct URLs and requests are rejected safely.

## Handoff evidence

For each completed workflow, provide:

- Relevant files changed
- Reproducible test or manual verification steps
- Build/lint/type-check/test results actually run
- Known limitations and unconfirmed BFDC policies

Do not report mock data, proposed behavior, or visual presence as proof that backend behavior is implemented.

