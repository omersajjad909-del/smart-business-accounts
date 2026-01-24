import { defineConfig } from "prisma/config";
import { config } from "dotenv";

// Load .env file
config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL || "postgresql://postgres:12345678@localhost:5432/smart_accounts",
  },
});
