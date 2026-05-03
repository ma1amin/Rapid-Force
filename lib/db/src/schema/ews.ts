import { pgTable, serial, text, integer, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";

export const ewsSeverityEnum = pgEnum("ews_severity", ["critical", "high", "medium", "low"]);
export const ewsStatusEnum   = pgEnum("ews_status",   ["active", "expired", "confirmed", "false_positive"]);

export const ewsSignalsTable = pgTable("ews_signals", {
  id:             serial("id").primaryKey(),
  signalType:     text("signal_type").notNull(),
  source:         text("source").notNull(),
  title:          text("title").notNull(),
  description:    text("description").notNull(),
  confidence:     integer("confidence").notNull().default(50),
  severity:       ewsSeverityEnum("severity").notNull(),
  category:       text("category").notNull(),
  affectedAssets: integer("affected_assets").notNull().default(0),
  isActive:       boolean("is_active").notNull().default(true),
  triggeredAt:    timestamp("triggered_at").defaultNow().notNull(),
  createdAt:      timestamp("created_at").defaultNow().notNull(),
});

export const ewsPredictionsTable = pgTable("ews_predictions", {
  id:              serial("id").primaryKey(),
  title:           text("title").notNull(),
  threatCategory:  text("threat_category").notNull(),
  description:     text("description").notNull(),
  probability:     integer("probability").notNull(),
  severity:        ewsSeverityEnum("severity").notNull(),
  timeframe:       text("timeframe").notNull(),
  evidenceSignals: text("evidence_signals").notNull().default("[]"),
  recommendation:  text("recommendation").notNull(),
  status:          ewsStatusEnum("status").notNull().default("active"),
  confidence:      text("confidence").notNull().default("medium"),
  affectedAssets:  integer("affected_assets").notNull().default(0),
  analyzedAt:      timestamp("analyzed_at").defaultNow().notNull(),
  createdAt:       timestamp("created_at").defaultNow().notNull(),
});

export type EwsSignal     = typeof ewsSignalsTable.$inferSelect;
export type EwsPrediction = typeof ewsPredictionsTable.$inferSelect;
