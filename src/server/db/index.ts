import { Client } from "@planetscale/database";
import { drizzle } from "drizzle-orm/planetscale-serverless";
import * as userSchema from "./schemas/users/schema";
export const db = drizzle(
  new Client({
    url: process.env.DATABASE_URL,
  }).connection(),
  {
    schema: {
      ...userSchema,
    },
  },
);
