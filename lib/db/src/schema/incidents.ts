import { pgTable, serial, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { agentsTable } from "./agents";
import { detectionsTable } from "./detections";

export const incidentSeverityEnum = pgEnum("incident_severity", [
  "critical",
  "high",
  "medium",
  "low",
]);

export const incidentStatusEnum = pgEnum("incident_status", [
  "open",
  "investigating",
  "contained",
  "eradicated",
  "closed",
]);

export const incidentTypeEnum = pgEnum("incident_type", [
  "malware",
  "ransomware",
  "phishing",
  "insider_threat",
  "data_breach",
  "supply_chain",
  "ddos",
  "zero_day",
  "lateral_movement",
  "privilege_escalation",
  "other",
]);

export const incidentsTable = pgTable("incidents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: incidentSeverityEnum("severity").notNull(),
  status: incidentStatusEnum("status").notNull().default("open"),
  type: incidentTypeEnum("type").notNull(),
  assignedAgentId: integer("assigned_agent_id").references(() => agentsTable.id),
  detectionId: integer("detection_id").references(() => detectionsTable.id),
  affectedSystems: text("affected_systems"),
  iocIndicators: text("ioc_indicators"),
  playbookSteps: text("playbook_steps"),
  attackVector: text("attack_vector"),
  mitreTechnique: text("mitre_technique"),
  containmentActions: text("containment_actions"),
  timeToDetect: integer("time_to_detect"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
