import postgres from "postgres";
import { config } from "dotenv";
import * as schema from "../db/schema";
import { drizzle } from "drizzle-orm/postgres-js";

config({ path: ".env.local" }); // or .env.local

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });
