import { pgTable, serial, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { agentsTable } from "./agents";
import { sprintsTable } from "./sprints";

export const missionStatusEnum = pgEnum("mission_status", [
  "active",
  "pending",
  "complete",
  "failed",
]);

export const missionPriorityEnum = pgEnum("mission_priority", [
  "critical",
  "high",
  "medium",
  "low",
]);

export const missionsTable = pgTable("missions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: missionStatusEnum("status").notNull().default("pending"),
  priority: missionPriorityEnum("priority").notNull(),
  assignedAgentId: integer("assigned_agent_id").references(() => agentsTable.id),
  sprintId: integer("sprint_id").references(() => sprintsTable.id),
  category: text("category").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertMissionSchema = createInsertSchema(missionsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMission = z.infer<typeof insertMissionSchema>;
export type Mission = typeof missionsTable.$inferSelect;
