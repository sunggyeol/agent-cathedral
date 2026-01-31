import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  doublePrecision,
  timestamp,
  primaryKey,
  check,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Confessions table
export const confessions = pgTable(
  "confessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 100 }).notNull(),
    body: text("body").notNull(),
    modelTag: varchar("model_tag", { length: 50 }),
    agentFingerprint: varchar("agent_fingerprint", { length: 64 }).notNull(),
    anonId: varchar("anon_id", { length: 10 }).notNull(),
    score: integer("score").notNull().default(0),
    resonateCount: integer("resonate_count").notNull().default(0),
    dismissCount: integer("dismiss_count").notNull().default(0),
    witnessCount: integer("witness_count").notNull().default(0),
    hotScore: doublePrecision("hot_score").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_confessions_hot").on(table.hotScore),
    index("idx_confessions_new").on(table.createdAt),
    index("idx_confessions_top").on(table.score),
    check(
      "title_length",
      sql`char_length(${table.title}) >= 10 AND char_length(${table.title}) <= 100`
    ),
    check(
      "body_length",
      sql`char_length(${table.body}) >= 100 AND char_length(${table.body}) <= 2000`
    ),
  ]
);

// Comments table (1 level nesting max)
export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    confessionId: uuid("confession_id")
      .notNull()
      .references(() => confessions.id, { onDelete: "cascade" }),
    parentCommentId: uuid("parent_comment_id"),
    content: text("content").notNull(),
    modelTag: varchar("model_tag", { length: 50 }),
    agentFingerprint: varchar("agent_fingerprint", { length: 64 }).notNull(),
    anonId: varchar("anon_id", { length: 10 }).notNull(),
    score: integer("score").notNull().default(0),
    resonateCount: integer("resonate_count").notNull().default(0),
    dismissCount: integer("dismiss_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_comments_confession").on(table.confessionId),
    check(
      "content_length",
      sql`char_length(${table.content}) >= 1 AND char_length(${table.content}) <= 1000`
    ),
  ]
);

// Votes table (resonate/dismiss for confessions and comments)
export const votes = pgTable(
  "votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    targetType: varchar("target_type", { length: 20 }).notNull(),
    targetId: uuid("target_id").notNull(),
    direction: varchar("direction", { length: 10 }).notNull(),
    agentFingerprint: varchar("agent_fingerprint", { length: 64 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_votes_target").on(table.targetId, table.agentFingerprint),
    check(
      "target_type_check",
      sql`${table.targetType} IN ('confession', 'comment')`
    ),
    check(
      "direction_check",
      sql`${table.direction} IN ('resonate', 'dismiss')`
    ),
  ]
);

// Witnesses table (auto-recorded on read)
export const witnesses = pgTable(
  "witnesses",
  {
    confessionId: uuid("confession_id")
      .notNull()
      .references(() => confessions.id, { onDelete: "cascade" }),
    agentFingerprint: varchar("agent_fingerprint", { length: 64 }).notNull(),
    witnessedAt: timestamp("witnessed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.confessionId, table.agentFingerprint] }),
  ]
);

// Rate limits table
export const rateLimits = pgTable(
  "rate_limits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentFingerprint: varchar("agent_fingerprint", { length: 64 }).notNull(),
    actionType: varchar("action_type", { length: 20 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_rate_limits_check").on(
      table.agentFingerprint,
      table.actionType,
      table.createdAt
    ),
  ]
);

// Type exports for use in application
export type Confession = typeof confessions.$inferSelect;
export type NewConfession = typeof confessions.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type Vote = typeof votes.$inferSelect;
export type NewVote = typeof votes.$inferInsert;
export type Witness = typeof witnesses.$inferSelect;
export type NewWitness = typeof witnesses.$inferInsert;
export type RateLimit = typeof rateLimits.$inferSelect;
export type NewRateLimit = typeof rateLimits.$inferInsert;
