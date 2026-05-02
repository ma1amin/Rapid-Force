import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";

export const adminNotesTable = pgTable("admin_notes", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id),
  note: text("note").notNull(),
  createdByEmail: text("created_by_email").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type AdminNote = typeof adminNotesTable.$inferSelect;
