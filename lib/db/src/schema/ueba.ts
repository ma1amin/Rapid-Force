import { pgTable, serial, text, integer, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";

export const uebaEntityTypeEnum = pgEnum("ueba_entity_type", ["user", "host", "service"]);
export const uebaRiskTrendEnum  = pgEnum("ueba_risk_trend",  ["up", "down", "stable"]);
export const uebaAlertSeverityEnum = pgEnum("ueba_alert_severity", ["critical", "high", "medium", "low"]);

export const uebaProfilesTable = pgTable("ueba_profiles", {
  id:                 serial("id").primaryKey(),
  entityId:          text("entity_id").notNull().unique(),
  entityType:        uebaEntityTypeEnum("entity_type").notNull(),
  displayName:       text("display_name").notNull(),
  department:        text("department"),
  location:          text("location"),
  riskScore:         integer("risk_score").notNull().default(0),
  riskTrend:         uebaRiskTrendEnum("risk_trend").notNull().default("stable"),
  anomalyCount:      integer("anomaly_count").notNull().default(0),
  baselineLoginTime: text("baseline_login_time"),
  baselineDataAccess:text("baseline_data_access"),
  baselineGeo:       text("baseline_geo"),
  recentLoginTime:   text("recent_login_time"),
  recentDataAccess:  text("recent_data_access"),
  recentGeo:         text("recent_geo"),
  flags:             text("flags").default("[]"),
  lastActivity:      timestamp("last_activity").defaultNow(),
  createdAt:         timestamp("created_at").defaultNow().notNull(),
  updatedAt:         timestamp("updated_at").defaultNow().notNull(),
});

export const uebaAlertsTable = pgTable("ueba_alerts", {
  id:              serial("id").primaryKey(),
  entityId:        text("entity_id").notNull(),
  entityType:      uebaEntityTypeEnum("entity_type").notNull(),
  displayName:     text("display_name").notNull(),
  alertType:       text("alert_type").notNull(),
  severity:        uebaAlertSeverityEnum("severity").notNull(),
  description:     text("description").notNull(),
  confidence:      text("confidence").notNull().default("medium"),
  isAcknowledged:  boolean("is_acknowledged").notNull().default(false),
  triggeredAt:     timestamp("triggered_at").defaultNow().notNull(),
  createdAt:       timestamp("created_at").defaultNow().notNull(),
});

export const behaviorEventsTable = pgTable("behavior_events", {
  id:          serial("id").primaryKey(),
  entityId:    text("entity_id").notNull(),
  entityType:  uebaEntityTypeEnum("entity_type").notNull(),
  eventType:   text("event_type").notNull(),
  description: text("description").notNull(),
  metadata:    text("metadata").default("{}"),
  riskDelta:   integer("risk_delta").notNull().default(0),
  timestamp:   timestamp("timestamp").defaultNow().notNull(),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
});

export type UebaProfile     = typeof uebaProfilesTable.$inferSelect;
export type UebaAlert       = typeof uebaAlertsTable.$inferSelect;
export type BehaviorEvent   = typeof behaviorEventsTable.$inferSelect;
