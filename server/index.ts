// server/db/index.ts
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "../drizzle/schema";

// 1. 导出所有表定义
export * from "../drizzle/schema";
// 2. 导出整个 schema 对象供查询使用
export { schema };

// 3. 定义并导出数据库实例类型 (供 Service 层事务使用)
export type Database = ReturnType<typeof drizzle<typeof schema>>;

let _db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // 这里的配置很棒，保持不变
      _db = drizzle(process.env.DATABASE_URL, { schema, mode: "default" });
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      throw new Error("数据库初始化失败"); // 建议抛出，让启动逻辑感知到
    }
  }
  
  if (!_db) throw new Error("数据库未连接");
  return _db;
}