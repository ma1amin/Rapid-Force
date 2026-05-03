import { pgTable, serial, text, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const pipelineStageEnum = pgEnum("pipeline_stage", ["draft","review","test","production","deprecated"]);
export const reviewDecisionEnum = pgEnum("review_decision", ["pending","approved","rejected","changes_requested"]);

export const ruleVersionsTable = pgTable("rule_versions", {
  id:            serial("id").primaryKey(),
  detectionId:   integer("detection_id").notNull(),
  version:       text("version").notNull(),
  ruleContent:   text("rule_content").notNull(),
  stage:         pipelineStageEnum("stage").notNull().default("draft"),
  changelog:     text("changelog").notNull().default(""),
  author:        text("author").notNull().default("system"),
  testResults:   text("test_results").notNull().default("{}"),
  isCurrent:     boolean("is_current").notNull().default(true),
  createdAt:     timestamp("created_at").defaultNow().notNull(),
});

export const ruleReviewsTable = pgTable("rule_reviews", {
  id:            serial("id").primaryKey(),
  ruleVersionId: integer("rule_version_id").references(() => ruleVersionsTable.id),
  detectionId:   integer("detection_id").notNull(),
  reviewer:      text("reviewer").notNull(),
  decision:      reviewDecisionEnum("decision").notNull().default("pending"),
  comments:      text("comments").notNull().default(""),
  createdAt:     timestamp("created_at").defaultNow().notNull(),
});

export type RuleVersion = typeof ruleVersionsTable.$inferSelect;
export type RuleReview  = typeof ruleReviewsTable.$inferSelect;
