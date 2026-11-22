# FreshFlow UI Design Plan (authoritative for all UI work)

Extends `06-UI-UX-ACCEPTANCE.md`. Where they conflict on visuals, this file wins. Business rules in `04-BUSINESS-RULES.md` always win over any UI wording.

## 1. Design concept: "The Co-op Ledger"

FreshFlow is a cooperative's shop and its back office. The look comes from two real objects in a dairy co-op:

- **The label and tag.** Bottle caps, hang-tags, batch stamps, and the paper slip a customer is handed. Customer side.
- **The ledger book.** Ruled lines, tabular numerals, entries written once and never erased. Staff side.

Customer and staff sides share one palette, one type system, and one set of status marks. They differ in density only: the customer side is airy like a market stall, the staff side is ruled like a ledger.

One sentence to test every screen against: *"Would this look at home on a printed co-op price list or receipt book?"* If it looks like a SaaS landing page, redo it.

## 2. What to avoid (explicit anti-patterns)

- Hero with centered headline, two buttons, and three feature cards.
- Purple or blue gradients, glassmorphism, glow, blurred blobs, floating 3D shapes.
- Emoji or stock "friendly human" illustrations used as icons or decoration.
- Card walls: every item in an identical rounded box with a drop shadow.
- Big decorative metric tiles with no data behind them (see `03`: only stored data).
- Pill badges in five random colors. Status uses the mark system in section 6.
- Lorem ipsum, fake brand logos, fake testimonials, "Trusted by 10,000 customers".
- Sparkle or "AI" icons. Nothing in the UI mentions AI.
- Hover-only information. Parallax. Scroll-jacking. Auto-playing carousels.

## 3. Tokens

Define once as CSS variables (or the framework's theme file). Never use raw hex in components.

```css
:root {
  /* surfaces */
  --ivory:   #FBF7EC;  /* page */
  --paper:   #F4EEDC;  /* raised/alt band, ledger header */
  --rule:    #D9D1B8;  /* 1px lines, borders */
  --sage:    #DCE6D3;  /* secondary surface, selected row */
  /* text */
  --ink:     #22271F;  /* body, 14.2:1 on ivory */
  --ink-2:   #4A5246;  /* secondary text, 7.6:1 */
  --sage-d:  #4B6B4F;  /* tertiary, icons, 5.6:1 */
  /* action */
  --pine:    #1F4D36;  /* primary buttons, active nav, 9.0:1 */
  --pine-d:  #163A29;  /* pressed, sidebar */
  /* signals */
  --clay:    #B4531A;  /* attention fills/borders only */
  --clay-t:  #964012;  /* attention TEXT, 5.5:1 on clay-bg */
  --clay-bg: #F6E1CC;
  --berry:   #9B2C2C;  /* failure, rejected, destructive */
  --berry-bg:#F5D9D4;
  /* shape */
  --r-sm: 4px; --r-md: 8px; --r-pill: 999px;
  --focus: 0 0 0 3px var(--ivory), 0 0 0 5px var(--pine);
}
```

Dark mode is out of scope for v1. Do not add it unless asked.

**Radius rule.** Controls and tags 4px, panels 8px, round only for the bottle-cap stamp and avatars. No 16-24px pillowy corners.

**Shadow rule.** No drop shadows except one thin `0 1px 0 var(--rule)` underline. Depth comes from paper tone and rules, not blur. Modals may use a single dim scrim.

## 4. Typography

| Role | Font | Notes |
|---|---|---|
| Display (page titles, product names, big numbers) | **Young Serif** | Warm, slightly old-fashioned, reads like a co-op label |
| Body and UI | **Instrument Sans** | Clean, not default-looking |
| References, quantities, money, timestamps | **IBM Plex Mono** (tabular) | Order numbers, SKUs, ledger columns |

Self-host via `@fontsource/*` packages (no CDN, works offline, fast on BFDC's connection). Subset to Latin. `font-display: swap`.

Scale (rem, 16px base): 0.8125 / 0.9375 / 1 / 1.125 / 1.375 / 1.75 / 2.5 (display). Body line-height 1.55. Maximum text line 68ch.

Money is always `₱1,250.00` in mono with tabular numbers, right-aligned in tables, with the currency symbol. Dates: `Nov 22, 2026 · 8:41 PM` for people, ISO in tooltips and exports.

## 5. Signature components (what makes it not generic)

1. **Bottle-cap stamp.** A 56-72px circle, double ring, stamped slightly off-axis (rotate -3deg), used for: Order Completed, Resolved, and the success screen after placing an order. Static SVG, no animation beyond a 160ms settle (respects reduced motion).
2. **Hang-tag product row.** Products are not a grid of cards. The catalog is a two-column list on desktop: photo on a sage rectangle (4:5), then name in Young Serif, unit and price in mono on a dotted leader line to the right (like a price list: `Fresh Milk, 1 L ........ ₱ 95.00`), then availability mark and quantity control. Single column on phone.
3. **Tally stepper.** Quantity control is a segmented strip: `[ - ]  3  [ + ]` with the number in mono, plus tick marks beneath showing available stock (max 10 ticks, then a number). It prevents above-available quantities by disabling `+`, and states why in text ("Only 4 left").
4. **Receipt slip.** Cart summary, order confirmation, POS review, and printable summary share one component: ivory paper, perforated top/bottom edge (CSS radial-gradient mask), mono lines, dotted leaders, total in display type. The same component prints.
5. **Route-line timeline.** Order tracking is a vertical line with dots: filled pine dot = done, ring = current, hollow = future, cross = ended (Rejected/Cancelled). Each dot has text label, timestamp, and actor role (never actor name for customers).
6. **Ledger table (staff).** Ruled rows (1px `--rule`), no zebra, no vertical lines, sticky header on `--paper`, mono numerals, sticky first column on small screens. Row hover is `--sage` at 40%. Selected row has a 3px pine left edge.
7. **Jar-level stock bar.** Inventory shows stock as a thin horizontal fill (height 6px) over the reorder level marker (a small vertical tick). Fill is pine; at or below reorder it is clay; at zero it is berry with the word "Out". Always with numbers beside it.
8. **Stamped movement entries.** Stock movement rows show signed quantity (`+24`, `-3`) in mono with direction arrow glyph and a type label. Rows are read-only, no edit affordance anywhere.

## 6. Status marks (text + color + shape, never color alone)

A status mark is a 4px-radius tag: small glyph, text, 1px border in the status color, tinted background.

| State | Glyph | Border/text | Background |
|---|---|---|---|
| New | ● | clay-t | clay-bg |
| Confirmed | ◐ | pine | sage |
| Preparing | ◔ | pine | sage |
| Ready for Pickup / Out for Delivery | ▶ | pine | sage |
| Completed | ✓ | pine-d (solid fill pine, ivory text) | pine |
| Rejected / Cancelled | ✕ | berry | berry-bg |
| Concern Open | ● | clay-t | clay-bg |
| In Review | ◐ | ink-2 | paper |
| Responded | ↩ | pine | sage |
| Resolved | ✓ | pine-d | pine |
| Low stock | ▼ | clay-t | clay-bg |
| Out of stock | ✕ | berry | berry-bg |

Glyphs are inline SVG with `aria-hidden`; the text is the accessible label.

## 7. Layout

### Customer site
- Top bar, not sidebar: wordmark left, nav center-left (Home, Products, My Orders, Feedback & Concerns), Cart (with count) and Account right. Bar sits on ivory with a 1px bottom rule. On phone: wordmark + cart + menu button, bottom sheet menu.
- Content max width 1120px, 24px gutters (16px on phone), vertical rhythm in 8px steps.
- **Home:** not a marketing page. A short greeting line, the three products as the hang-tag list (Fresh Milk, Cheese, Longganisa) with Add buttons, then "Your latest order" strip (if logged in) and a quiet BFDC note (pickup location, hours *only when BFDC supplies them*). Photography is the hero, used at real size, not as background wallpaper.
- **Cart:** two columns on desktop (lines left, receipt slip right, sticky). On phone the slip becomes a bottom-fixed bar with total and "Review order".
- **Checkout:** one page, three numbered sections (Contact, Fulfillment, Review). Primary button "Place order" shows a spinner and is disabled during submission. Idempotency key generated when the page loads.
- **Confirmation:** bottle-cap stamp, order number in large mono, receipt slip, plain next-step sentence, link "Track this order".

### Staff/Admin workspace
- Left rail 232px, `--pine-d` background, ivory text, active item has ivory 3px left edge plus `--pine` fill. Labels always visible (no icon-only rail). Bottom of rail: account name, role as text, Sign out.
- Top strip inside content: page title (display), a single primary action on the right.
- Under 1024px: rail becomes a drawer opened by a labeled "Menu" button; the current section name stays visible in the top strip.
- Content is ruled ledger sections, not boxes. Max width 1360px.
- **Dashboard:** one row of four figures set as large display numerals on ruled dividers (Today's sales, Active orders, Low stock, Open concerns), then two ledger lists side by side (Recent orders, Low-stock items). No charts in v1 unless BFDC asks; if a trend is needed add a single plain sales-by-day bar chart.
- **POS:** two panes. Left: product search and a compact product list with tally steppers. Right: the receipt slip with "Complete sale". Complete sale button is disabled while pending; on success show the POS reference and a Print summary action. Keyboard: `/` focuses search, `Enter` adds, `Ctrl+Enter` completes (with confirmation step).
- **Orders:** ledger table, New first. A row opens a right-side detail panel (not a new page) with items, history, allowed next-status buttons only, and reason field for reject/cancel.
- **Inventory:** ledger with product, physical, reserved, available, jar-level bar, reorder level. Row actions: Stock In, Adjust (opens a dialog form requiring quantity, type, reason, reference, confirmation). No inline editing of stock numbers.
- **Stock Movements:** ledger with filters bar (date range, product, type, reference, staff). Read-only.
- **Concerns:** split view, list left (Open first), thread right with immutable response history and a reply box.
- **Users & Roles (Admin):** ledger of accounts, role as text, active toggle behind a confirm dialog. Permission editor is a checklist grouped by area. Never display password fields for existing accounts; "Send reset" only.

## 8. Imagery and content

- Real photos only for Fresh Milk, Cheese, Longganisa. Shoot guide for BFDC: natural window light, ivory or wooden surface, 4:5 portrait, 1600px long edge, product label visible, no filters. Export WebP at 800 and 1600 widths.
- Until photos exist, use a labeled **sage placeholder block** with the product name in display type and the text "Photo pending". Never use stock photos or AI-generated product images.
- Icons: one set only, **Lucide**, 1.5px stroke, 20px, always paired with text in navigation.
- Voice: plain, short, specific. "Only 4 left. Lower the quantity to continue." not "Oops! Something went wrong."
- Empty states: one sentence plus one action, with a small line drawing of the product (simple monoline SVG drawn for the project, not clip art).

## 9. Motion

- 120-160ms ease-out for state changes (focus, hover, tag appear), 220ms for drawers and panels.
- No entrance animations on content, no skeleton shimmer longer than the data takes.
- Honor `prefers-reduced-motion: reduce`: remove transforms, keep opacity changes only.

## 10. Accessibility checks specific to this design

- All token pairs in section 3 used for text meet AA (contrast numbers noted above). `--clay` on ivory is for borders and fills only, never body text; use `--clay-t`.
- Focus ring: `--focus` on every interactive element, never removed.
- Dotted price leaders are `aria-hidden`; markup keeps name and price in one row via `<dl>` or a table.
- Receipt slip perforation is decorative (`aria-hidden`).
- Touch targets 44px minimum on phone, including tally stepper buttons.
- Dialogs: focus trap, Escape closes, return focus to trigger.

## 11. Screen inventory and build order

| # | Screen | Role | Key states to design |
|---|---|---|---|
| 1 | Login, Register, Reset password | All | invalid creds (generic), locked/rate limited, session expired |
| 2 | Home | Customer | loading, no orders yet |
| 3 | Products, Product detail | Customer | unavailable, low stock, search no result |
| 4 | Cart, Checkout, Confirmation | Customer | stock changed since adding, price changed, double submit |
| 5 | My Orders, Order detail, Cancel dialog | Customer | no orders, terminal states |
| 6 | Feedback & Concerns (list, new, thread) | Customer | closed thread, duplicate submit |
| 7 | Account | Customer | change password |
| 8 | Dashboard | Staff/Admin | empty day, API failure |
| 9 | POS | Staff/Admin | out of stock mid-sale, retry |
| 10 | Orders + detail panel | Staff/Admin | invalid transition blocked, reason required |
| 11 | Inventory, Stock In/Adjust dialogs | Staff/Admin | would-go-negative rejection |
| 12 | Stock Movements | Staff/Admin | empty filter result |
| 13 | Concerns | Staff/Admin | needs response before Responded |
| 14 | Users & Roles, Audit history | Admin | deactivate confirm, permission denied |
| 15 | 403, 404, 500, offline | All | safe retry |

Build order follows `00-MASTER-PROMPT.md` delivery order. Build the shared components (tokens, buttons, fields, tag, receipt slip, ledger table, dialog, drawer) first, then screens.

## 12. Definition of done for UI work

- Uses only tokens from section 3 and components from section 5.
- Passes the section 2 anti-pattern list.
- Verified at 360, 768, 1024, 1440 widths, keyboard-only, and with reduced motion.
- Every state in `06-UI-UX-ACCEPTANCE.md` exists.
- A screenshot of each screen at 1440 and 390 is attached to the handoff.
