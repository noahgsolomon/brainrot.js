import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

import * as userSchema from "./schemas/users/schema";

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  uri: process.env.DB_URL,
  database: process.env.DB_NAME,
});

export const db = drizzle(connection, {
  schema: {
    ...userSchema,
  },
  mode: "default",
});
