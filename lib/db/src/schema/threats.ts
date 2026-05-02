import { pgTable, serial, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const threatSeverityEnum = pgEnum("threat_severity", [
  "critical",
  "high",
  "medium",
  "low",
]);

export const threatStatusEnum = pgEnum("threat_status", [
  "active",
  "mitigated",
  "monitoring",
  "closed",
]);

export const threatsTable = pgTable("threats", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: threatSeverityEnum("severity").notNull(),
  category: text("category").notNull(),
  source: text("source").notNull(),
  status: threatStatusEnum("status").notNull().default("active"),
  detectedAt: timestamp("detected_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertThreatSchema = createInsertSchema(threatsTable).omit({
  id: true,
  detectedAt: true,
  createdAt: true,
});

export type InsertThreat = z.infer<typeof insertThreatSchema>;
export type Threat = typeof threatsTable.$inferSelect;
