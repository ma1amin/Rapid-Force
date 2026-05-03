import { pgTable, serial, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const playbookStatusEnum    = pgEnum("playbook_status",    ["active", "paused", "draft"]);
export const playbookSeverityEnum  = pgEnum("playbook_severity",  ["critical", "high", "medium", "info"]);
export const executionStatusEnum   = pgEnum("execution_status",   ["running", "complete", "failed", "aborted"]);

export const playbooksTable = pgTable("playbooks", {
  id:             serial("id").primaryKey(),
  name:           text("name").notNull(),
  description:    text("description").notNull(),
  trigger:        text("trigger").notNull(),
  category:       text("category").notNull(),
  status:         playbookStatusEnum("status").notNull().default("draft"),
  severity:       playbookSeverityEnum("severity").notNull().default("medium"),
  steps:          text("steps").notNull().default("[]"),
  automationRate: integer("automation_rate").notNull().default(0),
  avgRuntime:     text("avg_runtime").notNull().default("—"),
  completedRuns:  integer("completed_runs").notNull().default(0),
  createdAt:      timestamp("created_at").defaultNow().notNull(),
  updatedAt:      timestamp("updated_at").defaultNow().notNull(),
});

export const playbookExecutionsTable = pgTable("playbook_executions", {
  id:           serial("id").primaryKey(),
  playbookId:   integer("playbook_id").references(() => playbooksTable.id),
  incidentId:   integer("incident_id"),
  status:       executionStatusEnum("status").notNull().default("running"),
  stepsResult:  text("steps_result").notNull().default("[]"),
  triggeredBy:  text("triggered_by").notNull().default("manual"),
  startedAt:    timestamp("started_at").defaultNow().notNull(),
  completedAt:  timestamp("completed_at"),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
});

export type Playbook          = typeof playbooksTable.$inferSelect;
export type PlaybookExecution = typeof playbookExecutionsTable.$inferSelect;
