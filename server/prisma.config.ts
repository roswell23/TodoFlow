import { defineConfig } from "prisma/config";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";
import "dotenv/config";

// Provide WebSocket support for Neon serverless in Node.js
neonConfig.webSocketConstructor = ws;

export default defineConfig({
  // Used by Prisma CLI (migrate, generate, studio).
  // Must be the DIRECT (unpooled) connection — PgBouncer breaks migrations.
  datasourceUrl: process.env.DATABASE_URL_UNPOOLED,

  // Used by PrismaClient at runtime via the Neon serverless driver.
  adapter: () => {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    return new PrismaNeon(pool);
  },
});
