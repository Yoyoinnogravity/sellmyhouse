import "dotenv/config";
import { defineConfig } from "@prisma/prisma7/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npm run seed",
  },
  datasource: {
    // CLI tasks (db push, migrations) must use the direct URL;
    // the app runtime uses pooled DATABASE_URL via the pg adapter.
    url: process.env["DATABASE_URL_UNPOOLED"] ?? process.env["DATABASE_URL"],
  },
});
