import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// 1. 加载主配置文件（包含 APP_ENV 字段）
dotenv.config({ path: ".env" });

// 2. 获取当前环境标识，默认为 'dev'
const appEnv = process.env.APP_ENV || "dev";

console.log(`Loading environment: ${appEnv}`);

// 3. 根据环境标识加载对应的环境文件（允许覆盖主配置）
// override: true 确保 .env.dev/.env.prod 中的变量覆盖 .env 中的同名变量
dotenv.config({ path: `.env.${appEnv}`, override: true });

export default defineConfig({
  schema: "./app/lib/schema.ts", // 下一步我们会创建这个文件
  out: "./drizzle", // 迁移文件输出目录
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.POSTGRES_URL_UNPOOLED || process.env.POSTGRES_URL!,
  },
});
