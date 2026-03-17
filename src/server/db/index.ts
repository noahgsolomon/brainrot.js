import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

import * as userSchema from "./schemas/users/schema";

const globalForDb = globalThis as typeof globalThis & {
  mysqlPool?: mysql.Pool;
};

const pool =
  globalForDb.mysqlPool ??
  mysql.createPool({
    uri: process.env.DB_URL,
    waitForConnections: true,
    connectionLimit: Number.parseInt(
      process.env.DB_CONNECTION_LIMIT ?? "2",
      10,
    ),
    maxIdle: Number.parseInt(process.env.DB_MAX_IDLE ?? "2", 10),
    idleTimeout: Number.parseInt(process.env.DB_IDLE_TIMEOUT_MS ?? "60000", 10),
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  });

globalForDb.mysqlPool = pool;

export const db = drizzle(pool, {
  schema: {
    ...userSchema,
  },
  mode: "default",
});
