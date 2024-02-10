import {
  boolean,
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
