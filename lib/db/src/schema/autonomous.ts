import { pgTable, serial, text, integer, boolean, timestamp, pgEnum, real } from "drizzle-orm/pg-core";

export const autoActionStatusEnum  = pgEnum("auto_action_status",  ["pending","executing","complete","failed","approved","rejected","awaiting_approval"]);
export const autoActionTypeEnum    = pgEnum("auto_action_type",    ["triage","isolate","block_ip","quarantine","escalate","notify","investigate","close"]);
export const autoRiskLevelEnum     = pgEnum("auto_risk_level",     ["critical","high","medium","low"]);

export const autonomousActionsTable = pgTable("autonomous_actions", {
  id:               serial("id").primaryKey(),
  type:             autoActionTypeEnum("type").notNull(),
  title:            text("title").notNull(),
  description:      text("description").notNull(),
  status:           autoActionStatusEnum("status").notNull().default("pending"),
  incidentId:       integer("incident_id"),
  incidentTitle:    text("incident_title"),
  riskLevel:        autoRiskLevelEnum("risk_level").notNull().default("medium"),
  reasoning:        text("reasoning").notNull().default(""),
  result:           text("result"),
  requiresApproval: boolean("requires_approval").notNull().default(false),
  approvedBy:       text("approved_by"),
  confidence:       real("confidence").notNull().default(0),
  executedAt:       timestamp("executed_at"),
  createdAt:        timestamp("created_at").defaultNow().notNull(),
});

export const aiBriefingsTable = pgTable("ai_briefings", {
  id:              serial("id").primaryKey(),
  title:           text("title").notNull(),
  period:          text("period").notNull(),
  summary:         text("summary").notNull(),
  keyFindings:     text("key_findings").notNull().default("[]"),
  recommendations: text("recommendations").notNull().default("[]"),
  metrics:         text("metrics").notNull().default("{}"),
  generatedAt:     timestamp("generated_at").defaultNow().notNull(),
  content:         text("content").notNull().default(""),
});

export type AutonomousAction = typeof autonomousActionsTable.$inferSelect;
export type AiBriefing       = typeof aiBriefingsTable.$inferSelect;
