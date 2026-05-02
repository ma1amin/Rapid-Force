import { pgTable, serial, text, timestamp, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sprintStatusEnum = pgEnum("sprint_status", [
  "planning",
  "active",
  "complete",
  "paused",
]);

export const sprintsTable = pgTable("sprints", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  objective: text("objective").notNull(),
  status: sprintStatusEnum("status").notNull().default("planning"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  progress: numeric("progress", { precision: 5, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSprintSchema = createInsertSchema(sprintsTable).omit({
  id: true,
  progress: true,
  createdAt: true,
});

export type InsertSprint = z.infer<typeof insertSprintSchema>;
export type Sprint = typeof sprintsTable.$inferSelect;
