import { defineConfig, env } from "prisma/config";
import "dotenv/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  // Used by Prisma CLI (migrate, generate, studio).
  // Direct (unpooled) connection is required for migrations.
  datasource: {
    url: env("DATABASE_URL_UNPOOLED"),
  },
});
