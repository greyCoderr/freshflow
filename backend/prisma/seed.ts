import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/index.js";
import { DEFAULT_ROLE_PERMISSIONS, PERMISSIONS, ROLES } from "@freshflow/shared";

const prisma = new PrismaClient();
async function main() {
  for (const code of PERMISSIONS) await prisma.permission.upsert({ where: { code }, update: {}, create: { code } });
  for (const name of ROLES) {
    const role = await prisma.role.upsert({ where: { name }, update: {}, create: { name } });
    for (const code of DEFAULT_ROLE_PERMISSIONS[name]) {
      const p = await prisma.permission.findUniqueOrThrow({ where: { code } });
      await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: p.id } }, update: {}, create: { roleId: role.id, permissionId: p.id } });
    }
  }
  const admin = await prisma.role.findUniqueOrThrow({ where: { name: "ADMIN" } });
  const pw = process.env.ADMIN_PASSWORD ?? "Admin2026!";
  await prisma.user.upsert({ where: { email: "admin@freshflow.local" }, update: {},
    create: { roleId: admin.id, fullName: "System Administrator", email: "admin@freshflow.local", username: process.env.ADMIN_USERNAME ?? "admin", passwordHash: await bcrypt.hash(pw, 10) } });

  // PLACEHOLDER catalog. Final products, units, prices, reorder levels = BFDC confirmation required.
  const items = [
    { name: "Fresh Milk", category: "Dairy", unit: "1 L bottle", priceCentavos: 9500, stock: 60, reorder: 15, description: "Fresh milk from BFDC member farms." },
    { name: "Soft Cheese", category: "Dairy", unit: "200 g pack", priceCentavos: 18000, stock: 40, reorder: 10, description: "Soft white cheese made at the BFDC plant." },
    { name: "Longganisa", category: "Non-dairy", unit: "500 g pack", priceCentavos: 22000, stock: 30, reorder: 8, description: "Local-style longganisa." },
  ];
  for (const i of items) {
    const exists = await prisma.product.findFirst({ where: { name: i.name } });
    if (exists) continue;
    await prisma.product.create({ data: { name: i.name, category: i.category, unit: i.unit, priceCentavos: i.priceCentavos, description: i.description,
      balance: { create: { physicalStock: i.stock, reservedStock: 0, reorderLevel: i.reorder } },
      movements: { create: { type: "STOCK_IN", quantity: i.stock, reference: "SEED-OPENING", reason: "Opening balance (seed)" } } } });
  }
  await prisma.setting.upsert({ where: { key: "delivery_enabled" }, update: {}, create: { key: "delivery_enabled", value: "false" } });
  await prisma.setting.upsert({ where: { key: "deduct_at" }, update: {}, create: { key: "deduct_at", value: "CONFIRMED" } });
  console.log("Seed complete.");
}
main().finally(() => prisma.$disconnect());
