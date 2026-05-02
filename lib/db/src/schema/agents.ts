import { pgTable, serial, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const agentRoleEnum = pgEnum("agent_role", [
  "architect",
  "cto",
  "product_manager",
  "security_lead",
  "senior_engineer",
  "devops",
  "ui_ux",
  "red_team",
  "documentation",
]);

export const agentStatusEnum = pgEnum("agent_status", [
  "active",
  "idle",
  "standby",
  "offline",
]);

export const agentsTable = pgTable("agents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: agentRoleEnum("role").notNull(),
  module: text("module").notNull(),
  status: agentStatusEnum("status").notNull().default("idle"),
  missionsCompleted: integer("missions_completed").notNull().default(0),
  tasksActive: integer("tasks_active").notNull().default(0),
  lastHeartbeat: timestamp("last_heartbeat").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAgentSchema = createInsertSchema(agentsTable).omit({
  id: true,
  missionsCompleted: true,
  tasksActive: true,
  lastHeartbeat: true,
  createdAt: true,
});

export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agentsTable.$inferSelect;
