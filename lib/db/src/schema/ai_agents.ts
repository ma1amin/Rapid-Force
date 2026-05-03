import { pgTable, serial, text, integer, boolean, timestamp, pgEnum, real } from "drizzle-orm/pg-core";

export const agentRoleEnum   = pgEnum("agent_role",   ["soc_analyst","threat_hunter","malware_analyst","detection_engineer","incident_commander"]);
export const agentStatusEnum = pgEnum("agent_status", ["online","investigating","idle","offline"]);
export const taskStatusEnum  = pgEnum("task_status",  ["pending","in_progress","awaiting_approval","approved","rejected","complete","failed"]);
export const taskPriorityEnum = pgEnum("task_priority", ["critical","high","medium","low"]);

export const aiAgentsTable = pgTable("ai_agents", {
  id:              serial("id").primaryKey(),
  name:            text("name").notNull(),
  role:            agentRoleEnum("role").notNull(),
  description:     text("description").notNull(),
  specialization:  text("specialization").notNull(),
  status:          agentStatusEnum("status").notNull().default("idle"),
  tasksCompleted:  integer("tasks_completed").notNull().default(0),
  successRate:     real("success_rate").notNull().default(0),
  model:           text("model").notNull().default("gpt-4o"),
  capabilities:    text("capabilities").notNull().default("[]"),
  currentTask:     text("current_task"),
  avatarColor:     text("avatar_color").notNull().default("#00FFC8"),
  createdAt:       timestamp("created_at").defaultNow().notNull(),
  updatedAt:       timestamp("updated_at").defaultNow().notNull(),
});

export const agentTasksTable = pgTable("agent_tasks", {
  id:              serial("id").primaryKey(),
  agentId:         integer("agent_id").references(() => aiAgentsTable.id),
  incidentId:      integer("incident_id"),
  type:            text("type").notNull(),
  title:           text("title").notNull(),
  description:     text("description").notNull(),
  status:          taskStatusEnum("status").notNull().default("pending"),
  priority:        taskPriorityEnum("priority").notNull().default("medium"),
  result:          text("result"),
  reasoning:       text("reasoning"),
  evidence:        text("evidence").notNull().default("[]"),
  humanRequired:   boolean("human_required").notNull().default(false),
  approvedBy:      text("approved_by"),
  rejectionReason: text("rejection_reason"),
  startedAt:       timestamp("started_at"),
  completedAt:     timestamp("completed_at"),
  createdAt:       timestamp("created_at").defaultNow().notNull(),
});

export const agentConversationsTable = pgTable("agent_conversations", {
  id:        serial("id").primaryKey(),
  taskId:    integer("task_id").references(() => agentTasksTable.id),
  agentId:   integer("agent_id").references(() => aiAgentsTable.id),
  role:      text("role").notNull(),
  content:   text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AiAgent            = typeof aiAgentsTable.$inferSelect;
export type AgentTask          = typeof agentTasksTable.$inferSelect;
export type AgentConversation  = typeof agentConversationsTable.$inferSelect;
