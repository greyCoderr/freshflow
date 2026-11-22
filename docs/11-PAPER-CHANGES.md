# Paper Changes Required (so the capstone matches the system)

Corrected working diagrams are in `docs/diagrams/` (`erd.png`, `context.png`, `dfd1.png`, with `.mmd` sources). They are clean drafts: redraw them in your usual tool (draw.io, Lucidchart) using the same content, so the style matches the rest of the paper.

## A. Chapter I
1. Title: "Bicol Federation **and** Dairy Cooperative" appears in the Introduction and Objectives; change to "Bicol Federation **of** Dairy Cooperative" everywhere.
2. Introduction, last paragraph: it lists four functions (inventory monitoring, order management, automated production and order records, authentication/RBAC). The Objectives list four different ones (orders, inventory+POS, membership, HR). Rewrite to the Objectives' four modules, mention login and role-based access as the security layer, and drop "automated production records" or rename it "printable order, sales, stock, member and employee reports".
3. Scope and Delimitation: the same "four functions" paragraph appears three times with two different lists. Keep one version (orders, inventory+POS, membership, HR). Add: customer feedback and concerns are handled inside Order Management; supplier applications, payroll, attendance, online payment and GPS tracking are excluded.
4. Add to the Delimitation: the system runs on MERN (see C) and is deployed to a web host after testing.
5. Conceptual Framework: "GGG" placeholder text sits above Figure 1.1; remove it.
6. Definition of Terms: add *Role-Based Access Control*, *Order Status*, *Stock Movement*, *Feedback and Concern*.

## B. Chapter III text
7. Research Design (descriptive paragraph): remove "supplier applications" and the "Supplier Application Portal"; list Order Management, Inventory and POS, Membership Profiling, Human Resource Management (plus feedback and concerns inside Order Management).
8. Figure 3.1 shows a broken image path (`/home/claude/fig/fig2_agile.png`). Re-insert the Agile Scrum figure.
9. Phase 1 and Table 1 (Software Requirements): replace the PHP/Bootstrap rows.
   | Software | Minimum | Recommended |
   |---|---|---|
   | Operating System | Windows 10 | Windows 11 |
   | Code Editor | Visual Studio Code | Latest VS Code |
   | Runtime | Node.js 22 | Node.js 22 LTS or later |
   | Front-end | React 18 with Vite | Same, latest stable |
   | Back-end | Express 5 (Node.js) | Same, latest stable |
   | Database | MySQL (XAMPP for local use) | MySQL 8 |
   | Version control | Git and GitHub | Same |
10. Mobile paragraph after Table 3: "allowing suppliers, customers, and plant staff" and "submit supplier applications" → customers and BFDC personnel; "place orders, track order status, and submit feedback".
11. Phase 3 (Develop): replace "PHP... Bootstrap... XAMPP with MySQL" with "JavaScript/TypeScript with React (front-end), Node.js and Express (back-end) and MySQL (database); XAMPP provides the local MySQL server; GitHub is used for version control". Remove "Bootstrap".
12. Phase 5 (Deploy) already lists Administrator, Sales Personnel, Plant Staff, Membership/HR: keep. Add the hosting environment once decided.

## C. Diagrams
13. **Figure 3.3 (architecture):** keep. Change "Web Server" label to "Web Server (Node.js/Express)" and "Database" to "MySQL Database".
14. **Figure 3.4 (context diagram):** remove the Supplier entity and its flows (supplier applications, quality details, qualification result, printable contract). Add to Customer: registration, membership application, feedback or concern in; concern responses out.
15. **Figure 3.5 (DFD Level 1):** rename 4.0 from "Membership Profiling and Supplier Application" to "Membership Profiling"; D4 from "Member, Supplier and Contract Records" to "Member Records"; D3 becomes "Order and Concern Records"; add the Customer registration/login flow to 1.0 and the membership application flow to 4.0. Update the paragraph under the figure to match (it currently describes supplier evaluation and printable contracts).
16. **Figure 3.6 (ERD):** delete SUPPLIER, SUPPLIER_APPLICATION, CONTRACT; remove `supplier_id` from RAW_MATERIAL; add `membership_type` to MEMBER (the text mentions it but the figure lacks it); add the entities the system actually needs: PERMISSION, ROLE_PERMISSION, CART, CART_ITEM, ORDER_STATUS_HISTORY, INVENTORY_BALANCE, STOCK_MOVEMENT, MATERIAL_MOVEMENT, FEEDBACK_CONCERN, CONCERN_RESPONSE, NOTIFICATION, AUDIT_LOG; link USER_ACCOUNT to CUSTOMER, MEMBER and EMPLOYEE (optional); store money as whole centavos. Rewrite the paragraphs that describe Supplier, Supplier Application, Contract and the Raw Material supplier link.
17. ERD currently has Customer with its own name, email and address, but login lives in USER_ACCOUNT. In the corrected ERD the name and email live in USER_ACCOUNT, and CUSTOMER holds contact number and address, so there is one source for each fact.

## D. Chapter II
18. Literature is consistent with the four modules. No supplier literature to remove. If a panelist asks about feedback and concerns, add one paragraph on web-based customer feedback systems.

## E. Things to tell the panel honestly
- The prototype was built with MERN (MySQL) rather than the originally planned PHP; the paper is updated to say so.
- Delivery, stock-deduction timing and similar rules follow BFDC's confirmed policy; unconfirmed items are listed in `08-SCOPE-AND-DECISIONS.md`.
