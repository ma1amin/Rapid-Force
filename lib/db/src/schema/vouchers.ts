import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { tenantsTable, subscriptionTierEnum } from "./tenants";

export const vouchersTable = pgTable("vouchers", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  description: text("description"),
  discountType: text("discount_type").notNull().default("percent"), // "percent" | "flat"
  discountValue: integer("discount_value").notNull().default(10),
  tierRestriction: subscriptionTierEnum("tier_restriction"),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const voucherRedemptionsTable = pgTable("voucher_redemptions", {
  id: serial("id").primaryKey(),
  voucherId: integer("voucher_id").notNull().references(() => vouchersTable.id),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id),
  tenantName: text("tenant_name"),
  redeemedAt: timestamp("redeemed_at").notNull().defaultNow(),
});

export type Voucher = typeof vouchersTable.$inferSelect;
export type VoucherRedemption = typeof voucherRedemptionsTable.$inferSelect;
