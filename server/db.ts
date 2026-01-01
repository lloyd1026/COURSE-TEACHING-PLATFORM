import { eq, desc, and, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  courses,
  classes,
  assignments,
  students,
  teachers,
  questions,
  exams,
  experiments,
  knowledgePoints,
  chapters,
  courseClasses,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { hashPassword } from "./auth";
import { inArray } from "drizzle-orm";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ==================== 用户管理 ====================
export async function upsertUser(user: InsertUser): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  // 1. 如果既没有 openId 也没有 id，这才是真正的非法调用
  if (!user.openId && !user.id) {
    throw new Error("User openId or id is required for upsert");
  }

  try {
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;

    // 构造更新数据
    textFields.forEach(field => {
      if (user[field] !== undefined) {
        updateSet[field] = user[field] ?? null;
      }
    });

    if (user.lastSignedIn) updateSet.lastSignedIn = user.lastSignedIn;
    if (user.role) updateSet.role = user.role;

    // 2. 逻辑分叉
    if (user.openId) {
      // --- 情况 A: 有 openId (OAuth 流程) ---
      // 保持你原有的逻辑：插入或更新
      const values: InsertUser = { ...user, openId: user.openId };
      if (!values.lastSignedIn) values.lastSignedIn = new Date();

      // 处理管理员自动分配
      if (!user.role && user.openId === ENV.ownerOpenId) {
        values.role = "admin";
        updateSet.role = "admin";
      }

      await db.insert(users).values(values).onDuplicateKeyUpdate({
        set: updateSet,
      });
    } else if (user.id) {
      // --- 情况 B: 没有 openId 但有 id (本地用户流程) ---
      // 仅执行更新操作
      if (Object.keys(updateSet).length === 0) {
        updateSet.lastSignedIn = new Date();
      }
      await db.update(users).set(updateSet).where(eq(users.id, user.id));
    }
  } catch (error) {
    console.error("[Database] Failed to upsert/update user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user by ID: database not available");
    return undefined;
  }
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers(searchQuery?: string) {
  const db = await getDb();
  if (!db) return [];

  if (searchQuery) {
    return await db
      .select()
      .from(users)
      .where(
        or(
          like(users.name, `%${searchQuery}%`),
          like(users.email, `%${searchQuery}%`),
          like(users.username, `%${searchQuery}%`)
        )
      );
  }

  return await db.select().from(users);
}

// ==================== 课程管理 ====================

export async function getAllCourses(searchQuery?: string) {
  const db = await getDb();
  if (!db) return [];

  if (searchQuery) {
    return await db
      .select()
      .from(courses)
      .where(
        or(
          like(courses.name, `%${searchQuery}%`),
          like(courses.code, `%${searchQuery}%`)
        )
      )
      .orderBy(desc(courses.createdAt));
  }

  return await db.select().from(courses).orderBy(desc(courses.createdAt));
}

export async function getCoursesByTeacherId(
  teacherId: number,
  searchQuery?: string
) {
  const db = await getDb();
  if (!db) return [];

  if (searchQuery) {
    return await db
      .select()
      .from(courses)
      .where(
        and(
          eq(courses.teacherId, teacherId),
          or(
            like(courses.name, `%${searchQuery}%`),
            like(courses.code, `%${searchQuery}%`)
          )
        )
      )
      .orderBy(desc(courses.createdAt));
  }

  return await db
    .select()
    .from(courses)
    .where(eq(courses.teacherId, teacherId))
    .orderBy(desc(courses.createdAt));
}

export async function getCourseById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(courses)
    .where(eq(courses.id, id))
    .limit(1);
  return result[0] || null;
}

export async function createCourse(data: typeof courses.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(courses).values(data);
  return { id: Number((result as any).insertId) };
}

export async function updateCourse(
  id: number,
  data: Partial<typeof courses.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(courses).set(data).where(eq(courses.id, id));
  return { success: true };
}

export async function deleteCourse(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(courses).where(eq(courses.id, id));
  return { success: true };
}

// 1. 获取某个课程已经关联的所有班级
export async function getClassesByCourseId(courseId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .select({
      id: classes.id,
      name: classes.name,
      major: classes.major,
      grade: classes.grade,
      studentCount: classes.studentCount,
    })
    .from(courseClasses)
    .innerJoin(classes, eq(courseClasses.classId, classes.id))
    .where(eq(courseClasses.courseId, courseId));
}

/**
 * 将某个行政班级关联到特定课程
 * 约束：只有状态为 'active' 的课程允许关联
 */
export async function linkClassToCourse(
  courseId: number,
  classId: number,
  semester: string,
  year: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 1. 核心约束检查：查询课程状态
  const [courseInfo] = await db
    .select({ status: courses.status })
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1);

  if (!courseInfo) {
    throw new Error("找不到该课程信息");
  }

  if (courseInfo.status !== "active") {
    // 如果不是 active，抛出错误拦截关联
    throw new Error(
      `无法关联：当前课程状态为“${courseInfo.status}”，只有“授课中(active)”的课程可以关联班级。`
    );
  }

  // 2. 检查是否已经关联过，防止重复插入
  const existing = await db
    .select()
    .from(courseClasses)
    .where(
      and(
        eq(courseClasses.courseId, courseId),
        eq(courseClasses.classId, classId)
      )
    )
    .limit(1);

  if (existing.length === 0) {
    return await db.insert(courseClasses).values({
      courseId,
      classId,
      semester,
      year,
    });
  } else {
    throw new Error("该班级已关联此课程，请勿重复操作");
  }
}

/**
 * 解除班级与课程的关联
 */
export async function unlinkClassFromCourse(courseId: number, classId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .delete(courseClasses)
    .where(
      and(
        eq(courseClasses.courseId, courseId),
        eq(courseClasses.classId, classId)
      )
    );
}

// ==================== 班级管理 ====================

export async function getAllClasses() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(classes).orderBy(desc(classes.createdAt));
}

export async function getClassesByTeacherId(teacherId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(classes)
    .where(eq(classes.headTeacherId, teacherId))
    .orderBy(desc(classes.createdAt));
}

export async function getClassById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(classes)
    .where(eq(classes.id, id))
    .limit(1);
  return result[0] || null;
}

export async function createClass(data: typeof classes.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(classes).values(data);
  return { id: Number((result as any).insertId) };
}

// 获取班级下的所有学生（用于表格展示）
export async function getStudentsByClassId(classId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .select({
      id: students.id,
      studentId: students.studentId, // 学号
      name: users.name, // 姓名
      email: users.email,
    })
    .from(students)
    .innerJoin(users, eq(students.userId, users.id))
    .where(eq(students.classId, classId));
}

// 关联课程列表
export async function getLinkedCoursesByClassId(classId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .select({
      id: courses.id,
      name: courses.name,
      code: courses.code,
      semester: courseClasses.semester, // 从中间表获取该课程在该班级的开课学期
      year: courseClasses.year,
    })
    .from(courseClasses)
    .innerJoin(courses, eq(courseClasses.courseId, courses.id))
    .where(eq(courseClasses.classId, classId));
}

// 批量创建或关联学生
export async function upsertStudentsToClass(
  classId: number,
  studentData: { studentId: string; name: string }[]
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  for (const data of studentData) {
    // 1. 检查学生记录是否已经存在 (通过 students 表的 studentId)
    const existingResults = await db
      .select()
      .from(students)
      .where(eq(students.studentId, data.studentId))
      .limit(1);

    const existingStudent = existingResults[0];

    if (existingStudent) {
      // 2. 如果已存在：直接更新该学生的 classId 归属即可
      await db
        .update(students)
        .set({ classId: classId })
        .where(eq(students.studentId, data.studentId));
    } else {
      // 3. 如果不存在：说明是新学生，需要两步走

      // 第一步：在 users 表创建账号
      // 注意：MySQL 驱动下，insert 返回的是一个数组，第一个元素包含 insertId
      const [userResult] = await db.insert(users).values({
        username: data.studentId, // 用户名默认为学号
        name: data.name,
        password: hashPassword("123456"),
        role: "student",
        loginMethod: "system",
        lastSignedIn: new Date(),
      });

      const newUserId = userResult.insertId; // 获取刚才生成的自增 ID

      // 第二步：在 students 业务表创建记录并关联班级
      await db.insert(students).values({
        userId: newUserId, // 关联刚才创建的 user.id
        studentId: data.studentId,
        classId: classId, // 关联到当前班级
      });
    }
  }
}

/**
 * 将学生从班级中移除
 * 逻辑：将 students 表中的 classId 字段设为 null，解除行政归属
 * 注意：这不会删除学生账号或其学习记录
 */
export async function removeStudentsFromClassBatch(studentIds: string[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(students)
    .set({ classId: null }) // 设为 null 即代表该学生目前不属于任何行政班级
    .where(inArray(students.studentId, studentIds));
}

// ==================== 作业管理 ====================

export async function getAllAssignments(courseId?: number) {
  const db = await getDb();
  if (!db) return [];

  if (courseId) {
    return await db
      .select()
      .from(assignments)
      .where(eq(assignments.courseId, courseId))
      .orderBy(desc(assignments.createdAt));
  }

  return await db
    .select()
    .from(assignments)
    .orderBy(desc(assignments.createdAt));
}

export async function getAssignmentById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(assignments)
    .where(eq(assignments.id, id))
    .limit(1);
  return result[0] || null;
}

export async function createAssignment(data: typeof assignments.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(assignments).values(data);
  return { id: Number((result as any).insertId) };
}

// ==================== 题库管理 ====================

export async function getAllQuestions(courseId?: number) {
  const db = await getDb();
  if (!db) return [];

  if (courseId) {
    return await db
      .select()
      .from(questions)
      .where(eq(questions.courseId, courseId))
      .orderBy(desc(questions.createdAt));
  }

  return await db.select().from(questions).orderBy(desc(questions.createdAt));
}

export async function getQuestionById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(questions)
    .where(eq(questions.id, id))
    .limit(1);
  return result[0] || null;
}

export async function createQuestion(data: typeof questions.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(questions).values(data);
  return { id: Number((result as any).insertId) };
}

// ==================== 考试管理 ====================

export async function getAllExams(courseId?: number) {
  const db = await getDb();
  if (!db) return [];

  if (courseId) {
    return await db
      .select()
      .from(exams)
      .where(eq(exams.courseId, courseId))
      .orderBy(desc(exams.createdAt));
  }

  return await db.select().from(exams).orderBy(desc(exams.createdAt));
}

export async function getExamById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(exams).where(eq(exams.id, id)).limit(1);
  return result[0] || null;
}

export async function createExam(data: typeof exams.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(exams).values(data);
  return { id: Number((result as any).insertId) };
}

// ==================== 实验管理 ====================

export async function getAllExperiments(courseId?: number) {
  const db = await getDb();
  if (!db) return [];

  if (courseId) {
    return await db
      .select()
      .from(experiments)
      .where(eq(experiments.courseId, courseId))
      .orderBy(desc(experiments.createdAt));
  }

  return await db
    .select()
    .from(experiments)
    .orderBy(desc(experiments.createdAt));
}

export async function getExperimentById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(experiments)
    .where(eq(experiments.id, id))
    .limit(1);
  return result[0] || null;
}

export async function createExperiment(data: typeof experiments.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(experiments).values(data);
  return { id: Number((result as any).insertId) };
}

// ==================== 知识图谱 ====================

export async function getChaptersByCourseId(courseId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(chapters)
    .where(eq(chapters.courseId, courseId));
}

export async function getKnowledgePointsByChapterId(chapterId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(knowledgePoints)
    .where(eq(knowledgePoints.chapterId, chapterId));
}

// ==================== 统计数据 ====================

export async function getStatistics() {
  const db = await getDb();
  if (!db) return { userCount: 0, courseCount: 0, classCount: 0 };

  const [userCountResult] = await db.select({ count: users.id }).from(users);
  const [courseCountResult] = await db
    .select({ count: courses.id })
    .from(courses);
  const [classCountResult] = await db
    .select({ count: classes.id })
    .from(classes);

  return {
    userCount: userCountResult?.count || 0,
    courseCount: courseCountResult?.count || 0,
    classCount: classCountResult?.count || 0,
  };
}
