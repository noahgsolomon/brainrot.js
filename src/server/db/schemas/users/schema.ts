import { relations } from "drizzle-orm";
import {
  boolean,
  datetime,
  index,
  int,
  mysqlTable,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const brainrotusers = mysqlTable(
  "brainrot-users",
  {
    id: int("id").primaryKey().autoincrement(),
    apiKey: varchar("api_key", { length: 255 }),
    name: varchar("name", { length: 200 }).notNull(),
    password: varchar("password", { length: 100 }),
    email: varchar("email", { length: 100 }).notNull().unique(),
    username: varchar("username", { length: 30 }).notNull().unique(),
    clerk_id: varchar("clerk_id", { length: 200 }).notNull().unique(),
    created_at: datetime("created_at", { mode: "date" })
      .notNull()
      .default(new Date()),
    pfp: varchar("pfp", { length: 255 }),
    credits: int("credits").default(0).notNull(),
    subscribed: boolean("subscribed").notNull().default(false),
    stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
    stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
    stripePriceId: varchar("stripe_price_id", { length: 255 }),
    stripeCurrentPeriodEnd: datetime("stripe_current_period_end", {
      mode: "date",
    }),
    twitter_handle: varchar("twitter_handle", { length: 255 }),
    twitter_id: varchar("twitter_id", { length: 255 }),
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
    agents: text("agents"),
    agent1: varchar("agent1", { length: 100 }).notNull(),
    agent2: varchar("agent2", { length: 100 }).notNull(),
    title: varchar("title", { length: 2000 }).notNull().default(""),
    url: varchar("url", { length: 1000 }).notNull(),
    thumbnail: varchar("thumbnail", { length: 1000 }),
    videoId: varchar("video_id", { length: 100 }).unique().notNull(),
  },
  (t) => ({
    userIdx: index("user_idx").on(t.user_id),
    videoIdx: uniqueIndex("video_idx").on(t.videoId),
  }),
);

export const rapAudio = mysqlTable(
  "rap_audio",
  {
    id: int("id").primaryKey().autoincrement(),
    user_id: int("user_id").notNull(),
    rapper: varchar("rapper", { length: 100 }).notNull(),
    song_name: varchar("song_name", { length: 100 }).notNull(),
    artist_name: varchar("artist_name", { length: 100 }).notNull(),
    url: varchar("url", { length: 1000 }).notNull(),
    video_id: varchar("video_id", { length: 100 }).unique().notNull(),
  },
  (t) => ({
    userIdx: index("user_idx").on(t.user_id),
    videoIdx: uniqueIndex("video_idx").on(t.video_id),
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
    agents: text("agents"),
    agent1: varchar("agent1", { length: 100 }),
    agent2: varchar("agent2", { length: 100 }),
    title: varchar("title", { length: 2000 }).default(""),
    videoId: varchar("video_id", { length: 100 }).unique().notNull(),
    url: varchar("url", { length: 1000 }).default(""),
    timestamp: datetime("timestamp", { mode: "date" }),
    music: varchar("music", { length: 100 }),
    // which process is processing this video (-1 if up for grabs)
    processId: int("process_id").notNull().default(-1),
    // in case we need to credit the user if errors out
    credits: int("credits").notNull(),
    // so user knows what is going on...
    status: varchar("status", { length: 500 }).notNull(),
    // 0 - 100 progress
    progress: int("progress").notNull().default(0),
    videoMode: varchar("video_mode", { length: 20 })
      .notNull()
      .default("brainrot"),
    audioUrl: varchar("audio_url", { length: 1000 }),
    lyrics: text("lyrics"),
    outputType: varchar("output_type", { length: 20 }),
    songName: varchar("song_name", { length: 255 }),
    artistName: varchar("artist_name", { length: 255 }),
    rapper: varchar("rapper", { length: 255 }),
    falRequestId: varchar("fal_request_id", { length: 255 }),
    falWebhookKeyHash: varchar("fal_webhook_key_hash", { length: 64 }),
    falLastWebhookAt: datetime("fal_last_webhook_at", { mode: "date" }),
    falError: text("fal_error"),
    phaseKey: varchar("phase_key", { length: 100 }),
    phaseStartedAt: datetime("phase_started_at", { mode: "date" }),
    timingState: text("timing_state"),
  },
  (t) => ({
    userIdx: index("user_idx").on(t.user_id),
    videoIdx: uniqueIndex("video_idx").on(t.videoId),
    falRequestIdx: index("fal_request_idx").on(t.falRequestId),
    userIdxVideoIdx: uniqueIndex("user_idx_video_idx").on(t.user_id, t.videoId),
  }),
);

export const generationTimingSamples = mysqlTable(
  "generation-timing-samples",
  {
    id: int("id").primaryKey().autoincrement(),
    user_id: int("user_id").notNull(),
    videoId: varchar("video_id", { length: 100 }).unique().notNull(),
    videoMode: varchar("video_mode", { length: 20 }).notNull(),
    outputType: varchar("output_type", { length: 20 }),
    startedAt: datetime("started_at", { mode: "date" }).notNull(),
    completedAt: datetime("completed_at", { mode: "date" }).notNull(),
    success: boolean("success").notNull().default(true),
    totalDurationMs: int("total_duration_ms").notNull(),
    queueDurationMs: int("queue_duration_ms").notNull().default(0),
    phaseTimings: text("phase_timings").notNull(),
  },
  (t) => ({
    userIdx: index("user_idx").on(t.user_id),
    videoIdx: uniqueIndex("video_idx").on(t.videoId),
    completedIdx: index("completed_idx").on(t.completedAt),
    modeIdx: index("mode_idx").on(t.videoMode, t.outputType),
  }),
);
