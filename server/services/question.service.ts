import { getDb } from "../db";
import { questions, courses, users, examQuestions, assignmentQuestions } from "../index";
import { eq, and, or, like, desc, getTableColumns, sql } from "drizzle-orm";

/**
 * --- 详情获取：核心修复 ---
 * 用于解决修改题目时的回显问题
 */
export async function getQuestionById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  const columns = getTableColumns(questions);
  const result = await db
    .select({
      ...columns,
      courseName: courses.name,
    })
    .from(questions)
    .leftJoin(courses, eq(questions.courseId, courses.id))
    .where(eq(questions.id, id))
    .limit(1);

  if (!result[0]) return null;

  const data = result[0];

  // ✅ 核心修复：处理 options 序列化问题
  // 确保返回给前端的是解析后的对象数组，而不是原始字符串
  let parsedOptions = data.options;
  if (typeof data.options === 'string') {
    try {
      parsedOptions = JSON.parse(data.options);
    } catch (e) {
      console.error(`题目 ID ${id} 选项解析失败:`, e);
      parsedOptions = [];
    }
  }

  return {
    ...data,
    options: parsedOptions,
    // 强制转换 courseId 为数字，防止前端 Select 匹配失败
    courseId: data.courseId ? Number(data.courseId) : 0,
  };
}

/**
 * --- 教师视角：获取我创建的题目 ---
 */
export async function getQuestionsByTeacher(
  teacherId: number,
  filters: { courseId?: number; search?: string } = {}
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  const whereConditions = [
    eq(questions.createdBy, teacherId),
    eq(questions.status, "active"),
  ];

  if (filters.courseId) {
    whereConditions.push(eq(questions.courseId, filters.courseId));
  }

  if (filters.search) {
    whereConditions.push(
      or(
        like(questions.content, `%${filters.search}%`),
        like(questions.title, `%${filters.search}%`)
      ) as any
    );
  }

  const list = await db
    .select({
      ...getTableColumns(questions),
      courseName: courses.name,
    })
    .from(questions)
    .leftJoin(courses, eq(questions.courseId, courses.id))
    .where(and(...whereConditions))
    .orderBy(desc(questions.createdAt));

  // 列表查询也进行简单的 JSON 处理，防止前端 map 报错
  return list.map(q => ({
    ...q,
    options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
  }));
}

/**
 * --- 管理员视角：监控全校题库 ---
 */
export async function getQuestionsForAdmin(filters: {
  courseId?: number;
  search?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  const whereConditions = [];
  if (filters.courseId) whereConditions.push(eq(questions.courseId, filters.courseId));
  if (filters.search) whereConditions.push(like(questions.content, `%${filters.search}%`));

  return await db
    .select({
      id: questions.id,
      type: questions.type,
      content: questions.content,
      difficulty: questions.difficulty,
      courseName: courses.name,
      creatorName: users.name,
    })
    .from(questions)
    .leftJoin(courses, eq(questions.courseId, courses.id))
    .leftJoin(users, eq(questions.createdBy, users.id))
    .where(whereConditions.length ? and(...whereConditions) : undefined)
    .orderBy(desc(questions.createdAt));
}

/**
 * --- 新增或更新题目 ---
 */
export async function upsertQuestion(teacherId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  const { id, ...payload } = data;

  // 整理入库数据
  const finalData = {
    ...payload,
    createdBy: teacherId,
    // ✅ 确保存储到数据库时是字符串格式，避免驱动兼容性问题
    options: payload.options ? JSON.stringify(payload.options) : null,
    updatedAt: new Date(),
  };

  if (id) {
    await db
      .update(questions)
      .set(finalData)
      .where(and(eq(questions.id, id), eq(questions.createdBy, teacherId)));
    return id;
  } else {
    const [result] = await db.insert(questions).values({
      ...finalData,
      status: "active",
      createdAt: new Date(),
    });
    return result.insertId;
  }
}

/**
 * --- 安全删除：引用检查逻辑 ---
 */
export async function deleteQuestionsBulk(ids: number[], teacherId: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  const results = { deleted: 0, archived: 0, failed: 0 };

  await db.transaction(async (tx) => {
    for (const id of ids) {
      try {
        // 检查考试引用和作业引用
        const [examRefs] = await tx.select({ count: sql<number>`count(*)` }).from(examQuestions).where(eq(examQuestions.questionId, id));
        const [assignRefs] = await tx.select({ count: sql<number>`count(*)` }).from(assignmentQuestions).where(eq(assignmentQuestions.questionId, id));

        const totalRefs = Number(examRefs?.count || 0) + Number(assignRefs?.count || 0);

        if (totalRefs > 0) {
          // 有引用则归档，不影响已有作业显示
          await tx
            .update(questions)
            .set({ status: "archived", updatedAt: new Date() })
            .where(and(eq(questions.id, id), eq(questions.createdBy, teacherId)));
          results.archived++;
        } else {
          // 无引用则物理删除
          await tx
            .delete(questions)
            .where(and(eq(questions.id, id), eq(questions.createdBy, teacherId)));
          results.deleted++;
        }
      } catch (err) {
        results.failed++;
      }
    }
  });

  return {
    success: true,
    message: `操作完成：彻底删除 ${results.deleted} 题，归档保存 ${results.archived} 题。`,
  };
}

/**
 * --- 批量导入逻辑 ---
 */

export async function importQuestionsBulk(teacherId: number, questionsData: any[]) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  return await db.transaction(async (tx) => {
    try {
      const values = questionsData.map((q, index) => {
        return {
          courseId: q.courseId,
          type: q.type,
          title: q.title || String(q.content).substring(0, 50),
          content: q.content,
          options: q.options ? (typeof q.options === 'string' ? q.options : JSON.stringify(q.options)) : null,
          answer: String(q.answer || ""),
          analysis: q.analysis || "",
          difficulty: q.difficulty || "medium",
          createdBy: teacherId,
          status: "active" as const,
        };
      });

      await tx.insert(questions).values(values);
      return { success: true, count: values.length };
    } catch (error: any) {
      // 捕获具体的数据库错误（如：Unknown column, Data too long 等）
      console.error("🔥 [Database Error] 写入失败:");
      console.error("错误消息:", error.message);
      console.error("错误代码:", error.code); // 比如 1054, 1366 等
      
      // 重新抛出错误，让前端 trpc 能捕获到消息
      throw error;
    }
  });
}