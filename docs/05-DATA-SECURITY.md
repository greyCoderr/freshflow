# Data and Security Prompt

Design the minimum relational model needed for the validated objectives. Adapt naming to the repository's conventions.

## Required entities

- User
- Role
- Permission
- RolePermission or equivalent assignment
- Product
- InventoryBalance
- StockMovement
- Cart
- CartItem
- Order
- OrderItem
- OrderStatusHistory
- Sale
- SaleItem
- FeedbackConcern
- ConcernResponse
- Notification
- AuditLog

Use database constraints for unique references, valid nonnegative balances, valid quantities, required relationships, and appropriate status values where the selected database supports them.

## Ownership and authorization

- Customers access only their own cart, profile, orders, concerns, responses, and notifications.
- Staff access only operational functions granted to Staff.
- Administrators alone manage accounts, roles, and permissions.
- Check authorization for every server request and object, not only at route or menu level.
- Never accept a role, owner ID, product price, total, or privileged status directly from an untrusted client.

## Authentication

- Hash passwords using the framework's proven password facility.
- Use secure, HTTP-only session cookies or the repository's established secure authentication mechanism.
- Rotate or invalidate sessions after password or privilege changes when supported.
- Rate-limit authentication and sensitive mutation endpoints.
- Provide generic login failure messages that do not reveal account existence.

## Sensitive data

- Collect only necessary customer information.
- Never store plain-text passwords, payment-card data, secrets, or tokens in source control.
- Avoid logging passwords, session tokens, or full sensitive request bodies.
- Protect exports and administrative lists with authorization.

## Atomic operations

Use database transactions for:

- Order creation plus reservation
- Order cancellation plus reservation release
- Order deduction plus movement/history
- POS sale plus sale items and movements
- Stock adjustment plus movement/audit entry

Use concurrency control appropriate to the selected database so two simultaneous operations cannot oversell the same product.

## Audit events

Record actor, action, target type, target identifier, safe before/after summary, timestamp, and request correlation identifier for:

- Role or permission changes
- Account activation/deactivation
- Product and price changes
- Inventory adjustments
- Order status changes
- Concern status changes

Audit records are append-only through normal application functions.

## Minimum security tests

- Customer cannot access another customer's order or concern.
- Staff cannot manage users or grant permissions.
- Deactivated account cannot authenticate or retain active access.
- Client-modified price or total is ignored/rejected.
- Invalid status transition is rejected.
- Concurrent order/POS attempts cannot reduce available stock below zero.
- Repeated mutation request does not create duplicate records.

