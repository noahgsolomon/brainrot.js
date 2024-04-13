import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config({
  path: ".env.local",
});

export default {
  schema: "./src/server/db/**/schema.ts",
  out: "./drizzle",
  driver: "mysql2",
  dbCredentials: {
    connectionString: process.env.DB_URL!,
  },
} satisfies Config;
