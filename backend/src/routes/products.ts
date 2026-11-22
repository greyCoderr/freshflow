import { Router } from "express";
import { availableStock } from "@freshflow/shared";
import { prisma } from "../db.js";

export const productRoutes = Router();
// Public catalog: active products with availability only (no physical/reserved numbers, no reorder level).
productRoutes.get("/", async (_req, res) => {
  const rows = await prisma.product.findMany({ where: { isActive: true }, include: { balance: true }, orderBy: { name: "asc" } });
  res.json(rows.map((p) => ({
    id: p.id, name: p.name, category: p.category, unit: p.unit, description: p.description, imageUrl: p.imageUrl,
    priceCentavos: p.priceCentavos, available: availableStock(p.balance?.physicalStock ?? 0, p.balance?.reservedStock ?? 0),
  })));
});
