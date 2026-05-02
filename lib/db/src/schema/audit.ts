import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";

export const adminAuditLogsTable = pgTable("admin_audit_logs", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  actorEmail: text("actor_email").notNull(),
  targetType: text("target_type"),
  targetId: integer("target_id"),
  targetName: text("target_name"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type AdminAuditLog = typeof adminAuditLogsTable.$inferSelect;
