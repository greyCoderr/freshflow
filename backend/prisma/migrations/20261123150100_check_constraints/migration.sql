-- Patch 0003: CHECK constraints, written by hand (Prisma does not model CHECK constraints and ignores them
-- when it compares the schema, so `migrate dev` will not report drift for these).
-- They are a last line of defence: the API validates and locks first and never relies on them for messages.
-- Enforced by MySQL 8.0.16+ and MariaDB 10.2+. TiDB enforces CHECK only when tidb_enable_check_constraint=ON (v7.2+);
-- see patch 0005/0014 tidb:check.

-- Stock (10-ARCHITECTURE: physical >= 0, reserved >= 0, reserved <= physical)
ALTER TABLE `InventoryBalance`
  ADD CONSTRAINT `chk_balance_physical_nonneg` CHECK (`physicalStock` >= 0),
  ADD CONSTRAINT `chk_balance_reserved_nonneg` CHECK (`reservedStock` >= 0),
  ADD CONSTRAINT `chk_balance_reserved_le_physical` CHECK (`reservedStock` <= `physicalStock`),
  ADD CONSTRAINT `chk_balance_reorder_nonneg` CHECK (`reorderLevel` >= 0);

-- Quantities are always positive; direction comes from the movement type.
ALTER TABLE `StockMovement` ADD CONSTRAINT `chk_movement_qty_pos` CHECK (`quantity` > 0);
ALTER TABLE `CartItem` ADD CONSTRAINT `chk_cartitem_qty_pos` CHECK (`quantity` > 0);

-- Money is integer centavos, never negative; line subtotals match price x quantity.
ALTER TABLE `Product` ADD CONSTRAINT `chk_product_price_nonneg` CHECK (`priceCentavos` >= 0);
ALTER TABLE `Order` ADD CONSTRAINT `chk_order_total_nonneg` CHECK (`totalCentavos` >= 0);
ALTER TABLE `OrderItem`
  ADD CONSTRAINT `chk_orderitem_qty_pos` CHECK (`quantity` > 0),
  ADD CONSTRAINT `chk_orderitem_price_nonneg` CHECK (`unitPriceCentavos` >= 0),
  ADD CONSTRAINT `chk_orderitem_subtotal` CHECK (`subtotalCentavos` = `unitPriceCentavos` * `quantity`);
ALTER TABLE `Sale`
  ADD CONSTRAINT `chk_sale_total_nonneg` CHECK (`totalCentavos` >= 0),
  ADD CONSTRAINT `chk_sale_paid_covers_total` CHECK (`amountPaidCentavos` >= `totalCentavos`),
  ADD CONSTRAINT `chk_sale_change` CHECK (`changeCentavos` = `amountPaidCentavos` - `totalCentavos`);
ALTER TABLE `SaleItem`
  ADD CONSTRAINT `chk_saleitem_qty_pos` CHECK (`quantity` > 0),
  ADD CONSTRAINT `chk_saleitem_price_nonneg` CHECK (`unitPriceCentavos` >= 0),
  ADD CONSTRAINT `chk_saleitem_subtotal` CHECK (`subtotalCentavos` = `unitPriceCentavos` * `quantity`);

-- Raw materials
ALTER TABLE `RawMaterial`
  ADD CONSTRAINT `chk_material_qty_nonneg` CHECK (`quantity` >= 0),
  ADD CONSTRAINT `chk_material_reorder_nonneg` CHECK (`reorderLevel` >= 0);
ALTER TABLE `MaterialMovement`
  ADD CONSTRAINT `chk_matmove_qty_pos` CHECK (`quantity` > 0),
  ADD CONSTRAINT `chk_matmove_direction` CHECK (`direction` IN ('IN', 'OUT'));
