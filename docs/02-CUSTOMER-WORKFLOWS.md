# Customer Workflow Prompt

Implement the following customer experience using the shared business rules and visual references.

## Authentication

- Present one login form with email and password.
- Allow customer registration and password recovery.
- Do not display a role selector.
- After authentication, route according to the server-owned account role.

## Browse and add to cart

1. Display active products with name, image, unit, current price, and availability.
2. Product details show a concise description and permitted quantity control.
3. Prevent zero, negative, non-numeric, or above-available quantities.
4. Preserve the cart while the customer navigates and, when appropriate, across sessions.
5. Recalculate cart totals whenever quantity changes.

## Checkout

Collect only data required for fulfillment:

- Customer name
- Contact number
- Fulfillment method approved by BFDC
- Address only if Delivery is enabled and selected
- Optional order note
- Final item and total review

The server must reload product prices and stock before accepting the order. Show a submission-in-progress state and prevent double submission.

## Confirmation and tracking

After placement, show:

- Unique order number
- Date and time
- Items, quantities, and stored prices
- Order total
- Fulfillment method
- Current status
- Clear next-step message

The customer order list shows active orders first. Order details show the permitted status timeline and history. Do not show staff-only notes, inventory values, audit entries, or internal permissions.

## Cancellation

- Customer cancellation is available while the order is New.
- Cancellation while Confirmed is a BFDC policy decision.
- Require confirmation and a reason.
- Show the recorded cancellation outcome.
- Never delete the order.

## Feedback and concerns

Allow the customer to:

- Choose Feedback or Concern
- Optionally associate an owned order
- Enter subject and message
- Submit once without duplication
- View status and staff responses
- Add clarification only while the request remains open, if BFDC approves replies

The customer can access only their own orders, notifications, profile, feedback, and concerns.

## Required convenience states

Design useful loading, empty, unavailable, validation-error, server-error, success, and session-expired states. Messages must explain the next action in plain language.

