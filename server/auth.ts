import { eq } from "drizzle-orm";
import { users } from "../drizzle/schema";
import { getDb } from "./db";
import crypto from "crypto";

/**
 * 密码哈希函数
 */
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * 验证密码
 */
export function verifyPassword(password: string, hashedPassword: string): boolean {
  return hashPassword(password) === hashedPassword;
}

/**
 * 通过用户名查找用户
 */
export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * 通过邮箱查找用户
 */
export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * 创建新用户(系统注册)
 */
export async function createUser(data: {
  username: string;
  password: string;
  name: string;
  email?: string;
  role?: 'admin' | 'teacher' | 'student';
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const hashedPassword = hashPassword(data.password);
  
  const result = await db.insert(users).values({
    username: data.username,
    password: hashedPassword,
    name: data.name,
    email: data.email || null,
    loginMethod: 'system',
    role: data.role || 'student',
    lastSignedIn: new Date(),
  });

  return result;
}

/**
 * 验证用户登录
 */
export async function authenticateUser(username: string, password: string) {
  const user = await getUserByUsername(username);
  
  if (!user || !user.password) {
    return null;
  }
  
  if (!verifyPassword(password, user.password)) {
    return null;
  }
  
  // 更新最后登录时间
  const db = await getDb();
  if (db) {
    await db.update(users)
      .set({ lastSignedIn: new Date() })
      .where(eq(users.id, user.id));
  }
  
  return user;
}


/**
 * 批量创建学生用户
 */
export async function createStudentsBatch(students: Array<{
  username: string;
  password: string;
  name: string;
  studentId?: string;
  email?: string;
}>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const results: Array<{ success: boolean; username: string; error?: string }> = [];

  for (const student of students) {
    try {
      // 检查用户名是否已存在
      const existing = await getUserByUsername(student.username);
      if (existing) {
        results.push({ success: false, username: student.username, error: '用户名已存在' });
        continue;
      }

      const hashedPassword = hashPassword(student.password);
      
      await db.insert(users).values({
        username: student.username,
        password: hashedPassword,
        name: student.name,
        email: student.email || null,
        loginMethod: 'system',
        role: 'student',
        lastSignedIn: new Date(),
      });

      results.push({ success: true, username: student.username });
    } catch (error) {
      results.push({ 
        success: false, 
        username: student.username, 
        error: error instanceof Error ? error.message : '创建失败' 
      });
    }
  }

  return results;
}

/**
 * 修改密码
 */
export async function changePassword(userId: number, oldPassword: string, newPassword: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // 获取用户
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (result.length === 0) {
    throw new Error('用户不存在');
  }

  const user = result[0];

  // 验证旧密码
  if (user.password && !verifyPassword(oldPassword, user.password)) {
    throw new Error('原密码错误');
  }

  // 更新密码
  const hashedPassword = hashPassword(newPassword);
  await db.update(users)
    .set({ password: hashedPassword })
    .where(eq(users.id, userId));

  return { success: true };
}

/**
 * 更新用户信息
 */
export async function updateUserProfile(userId: number, data: {
  name?: string;
  email?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db.update(users)
    .set(data)
    .where(eq(users.id, userId));

  return { success: true };
}
