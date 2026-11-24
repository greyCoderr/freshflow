-- Patch 0003: placing an order writes an ORDER_RESERVED movement (reserved stock +q, physical unchanged),
-- so reserved stock can be traced from movement rows alone. Added at the end of the enum: existing rows keep their values.
-- AlterTable
ALTER TABLE `StockMovement` MODIFY `type` ENUM('STOCK_IN', 'POS_SALE_OUT', 'ORDER_OUT', 'RESERVATION_RELEASED', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'ORDER_RESERVED') NOT NULL;
