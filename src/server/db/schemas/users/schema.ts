import { relations } from "drizzle-orm";
import {
  datetime,
  int,
  mysqlTable,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const brainrotusers = mysqlTable(
  "brainrot-users",
  {
    id: int("id").primaryKey().autoincrement(),
    name: varchar("name", { length: 200 }).notNull(),
    password: varchar("password", { length: 100 }),
    email: varchar("email", { length: 100 }).notNull().unique(),
    username: varchar("username", { length: 30 }).notNull().unique(),
    clerk_id: varchar("clerk_id", { length: 200 }).notNull().unique(),
    created_at: datetime("created_at", { mode: "date" })
      .notNull()
      .default(new Date()),
  },
  (t) => ({
    clerkIdx: uniqueIndex("clerk_idx").on(t.clerk_id),
  }),
);

export const videos = mysqlTable(
  "videos",
  {
    id: int("id").primaryKey().autoincrement(),
    user_id: int("user_id").notNull(),
    agent1: varchar("agent1", { length: 100 }).notNull(),
    agent2: varchar("agent2", { length: 100 }).notNull(),
    title: varchar("title", { length: 100 }).notNull(),
    url: varchar("url", { length: 1000 }).notNull(),
    videoId: varchar("video_id", { length: 100 }).notNull(),
  },
  (t) => ({
    userIdx: uniqueIndex("user_idx").on(t.user_id),
    videoIdx: uniqueIndex("video_idx").on(t.videoId),
  }),
);

export const videosRelations = relations(videos, ({ one }) => ({
  brainrotusers: one(brainrotusers, {
    fields: [videos.user_id],
    references: [brainrotusers.id],
  }),
}));

export const pendingVideos = mysqlTable(
  "pending-videos",
  {
    id: int("id").primaryKey().autoincrement(),
    user_id: int("user_id").notNull(),
    agent1: varchar("agent1", { length: 100 }).notNull(),
    agent2: varchar("agent2", { length: 100 }).notNull(),
    title: varchar("title", { length: 100 }).notNull(),
    videoId: varchar("video_id", { length: 100 }).notNull(),
    url: varchar("url", { length: 1000 }).default(""),
    timestamp: datetime("timestamp", { mode: "date" }),
  },
  (t) => ({
    userIdx: uniqueIndex("user_idx").on(t.user_id),
    videoIdx: uniqueIndex("video_idx").on(t.videoId),
    userIdxVideoIdx: uniqueIndex("user_idx_video_idx").on(t.user_id, t.videoId),
  }),
);
