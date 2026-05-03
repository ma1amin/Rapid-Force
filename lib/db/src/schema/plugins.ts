import { pgTable, serial, text, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const pluginCategoryEnum = pgEnum("plugin_category", [
  "siem", "ticketing", "notification", "threat_intel", "ir_tools", "cloud_security", "identity", "vulnerability",
]);

export const pluginsTable = pgTable("plugins", {
  id:           serial("id").primaryKey(),
  name:         text("name").notNull(),
  slug:         text("slug").notNull().unique(),
  description:  text("description").notNull(),
  longDesc:     text("long_desc").notNull().default(""),
  author:       text("author").notNull(),
  version:      text("version").notNull().default("1.0.0"),
  category:     pluginCategoryEnum("category").notNull(),
  icon:         text("icon").notNull().default("plug"),
  capabilities: text("capabilities").notNull().default("[]"),
  configSchema: text("config_schema").notNull().default("{}"),
  isBuiltIn:    boolean("is_built_in").notNull().default(false),
  isInstalled:  boolean("is_installed").notNull().default(false),
  isEnabled:    boolean("is_enabled").notNull().default(false),
  installCount: integer("install_count").notNull().default(0),
  rating:       integer("rating").notNull().default(0),
  reviewCount:  integer("review_count").notNull().default(0),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
  updatedAt:    timestamp("updated_at").defaultNow().notNull(),
});

export type Plugin = typeof pluginsTable.$inferSelect;
