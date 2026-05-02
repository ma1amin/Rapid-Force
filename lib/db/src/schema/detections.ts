import { pgTable, serial, text, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const detectionTypeEnum = pgEnum("detection_type", [
  "sigma",
  "yara",
  "query",
  "ioc",
  "behavioral",
]);

export const detectionStatusEnum = pgEnum("detection_status", [
  "active",
  "testing",
  "disabled",
  "review",
]);

export const detectionSeverityEnum = pgEnum("detection_severity", [
  "critical",
  "high",
  "medium",
  "low",
  "informational",
]);

export const detectionsTable = pgTable("detections", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  type: detectionTypeEnum("type").notNull(),
  ruleContent: text("rule_content").notNull(),
  severity: detectionSeverityEnum("severity").notNull(),
  status: detectionStatusEnum("status").notNull().default("testing"),
  mitreTechnique: text("mitre_technique"),
  mitreTactic: text("mitre_tactic"),
  tags: text("tags"),
  falsePositiveRate: text("false_positive_rate").default("0"),
  truePositiveCount: text("true_positive_count").default("0"),
  author: text("author"),
  version: text("version").default("1.0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
