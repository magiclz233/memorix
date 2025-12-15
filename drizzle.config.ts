import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./app/lib/schema.ts", // 下一步我们会创建这个文件
  out: "./drizzle", // 迁移文件输出目录
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.POSTGRES_URL!,
  },
});
