import { eq, desc, and, like, or, inArray, asc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "../drizzle/schema";
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
  experimentSubmissions,
  knowledgePoints,
  knowledgePointRelations,
  chapters,
  courseClasses,
  aiConversations,
  aiMessages,
  examClasses,
  examQuestions,
  assignmentQuestions,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { hashPassword } from "./auth";

let _db: ReturnType<typeof drizzle> | null = null;
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL, { schema, mode: "default" });
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

// tobe deleted
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

/**
 * 获取教师课程及其关联班级
 * 逻辑：courses -> courseClasses -> classes
 */
export async function getCoursesByTeacher(teacherId: number, searchQuery?: string) {
  const db = await getDb();
  if (!db) return [];

  // 1. 构建基础查询，拉取课程、班级 ID 和班级名称
  const query = db
    .select({
      id: courses.id,
      name: courses.name,
      code: courses.code,
      status: courses.status,
      credits: courses.credits,
      semester: courses.semester,
      // 联查字段
      classId: classes.id,
      className: classes.name,
    })
    .from(courses)
    .leftJoin(courseClasses, eq(courses.id, courseClasses.courseId))
    .leftJoin(classes, eq(courseClasses.classId, classes.id));

  // 2. 准备过滤条件（必须是当前老师）
  const filters = [eq(courses.teacherId, teacherId)];
  if (searchQuery) {
    filters.push(
      or(
        like(courses.name, `%${searchQuery}%`),
        like(courses.code, `%${searchQuery}%`)
      ) as any
    );
  }

  const rows = await query.where(and(...filters)).orderBy(desc(courses.createdAt));

  // 3. 数据聚合：由于 Join 会产生多行（一门课对应多个班级），需要按课程 ID 聚合
  const courseMap = new Map<number, any>();

  for (const row of rows) {
    if (!courseMap.has(row.id)) {
      courseMap.set(row.id, {
        id: row.id,
        name: row.name,
        code: row.code,
        status: row.status,
        credits: row.credits,
        semester: row.semester,
        linkedClasses: [] // 用于存放班级列表
      });
    }

    // 如果该课程有关联班级，则推入数组
    if (row.classId) {
      courseMap.get(row.id).linkedClasses.push({
        id: row.classId,
        name: row.className
      });
    }
  }

  return Array.from(courseMap.values());
}

/**
 * 根据学生（用户）ID 获取其所属班级关联的所有课程
 * 逻辑：users.id -> students.userId -> students.classId -> courseClasses.classId -> courses
 */
export async function getCoursesByStudentId(
  userId: number,
  searchQuery?: string
) {
  const db = await getDb();
  if (!db) return [];

  const studentCourses = await db
    .select({
      id: courses.id,
      name: courses.name,
      code: courses.code,
      credits: courses.credits,
      status: courses.status,
      description: courses.description,
      semester: courses.semester,
    })
    .from(courses)
    // 1. 连中间表：找课程对应的班级
    .innerJoin(courseClasses, eq(courses.id, courseClasses.courseId))
    // 2. 连学生扩展表：通过班级 ID 匹配
    .innerJoin(students, eq(courseClasses.classId, students.classId))
    // 3. 过滤条件：匹配当前登录用户的 ID
    .where(
      and(
        eq(students.userId, userId), // 这里的 userId 是从 ctx.user.id 传进来的
        eq(courses.status, "active"), // 学生通常只看激活状态的课
        searchQuery
          ? or(
            like(courses.name, `%${searchQuery}%`),
            like(courses.code, `%${searchQuery}%`)
          )
          : undefined
      )
    )
    .orderBy(desc(courses.createdAt));

  return studentCourses;
}

// 根据课程 ID 获取课程详情
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
  if (!db) throw new Error("数据库连接失败");

  // 1. 拦截检查：是否有发布的作业
  const [linkedAssignment] = await db
    .select({ id: assignments.id })
    .from(assignments)
    .where(eq(assignments.courseId, id))
    .limit(1);
  if (linkedAssignment) throw new Error("无法删除：该课程已有发布的作业。");

  // 2. 拦截检查：题库是否为空
  const [linkedQuestion] = await db
    .select({ id: questions.id })
    .from(questions)
    .where(eq(questions.courseId, id))
    .limit(1);
  if (linkedQuestion) throw new Error("无法删除：该课程题库中仍有题目。");

  // 3. 【新增】拦截检查：是否仍有关联的班级
  // 如果课程还挂在某个班级的课表里，直接删除会导致班级教学计划错乱
  const linkedClassesCount = await db
    .select({ id: courseClasses.classId })
    .from(courseClasses)
    .where(eq(courseClasses.courseId, id));

  if (linkedClassesCount.length > 0) {
    throw new Error(
      `无法删除：仍有 ${linkedClassesCount.length} 个班级关联此课程，请先在班级管理中解除关联。`
    );
  }

  // 4. 执行物理删除
  // 虽然上面检查了 count，但为了冗余安全，还是保留清理中间表的动作
  await db.delete(courseClasses).where(eq(courseClasses.courseId, id));
  await db.delete(courses).where(eq(courses.id, id));

  return { success: true };
}

// 获取某个课程已经关联的所有班级
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

// 约束：将某个行政班级关联到状态为 'active' 的课程
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

// 解除班级与课程的关联
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
// 更新班级信息
export async function updateClass(
  id: number,
  data: Partial<typeof classes.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");
  return await db.update(classes).set(data).where(eq(classes.id, id));
}

/**
 * 安全删除班级
 * 拦截规则：1. 班级内有学生不可删  2. 班级已关联课程不可删
 */
export async function deleteClass(id: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  // 1. 检查是否有学生
  const linkedStudents = await db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.classId, id))
    .limit(1);

  if (linkedStudents.length > 0) {
    throw new Error("无法删除：该班级内尚有学生，请先迁移学生档案。");
  }

  // 2. 检查是否有关联课程（教学计划）
  const linkedCourseClasses = await db
    .select({ courseId: courseClasses.courseId })
    .from(courseClasses)
    .where(eq(courseClasses.classId, id))
    .limit(1);

  if (linkedCourseClasses.length > 0) {
    throw new Error(
      "无法删除：该班级已有教学计划（关联课程），请先解除课程关联。"
    );
  }

  // 3. 执行删除
  await db.delete(classes).where(eq(classes.id, id));
  return { success: true };
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

// 根据课程 ID 获取作业列表，支持联查课程和班级名称
export async function getAllAssignments(teacherId?: number, courseId?: number) {
  const db = await getDb();
  if (!db) return [];

  const filters = [];

  // 如果传了教师 ID，则按教师过滤
  if (teacherId) {
    filters.push(eq(assignments.createdBy, teacherId));
  }

  // 如果传了课程 ID，则按课程过滤
  if (courseId) {
    filters.push(eq(assignments.courseId, courseId));
  }

  return await db
    .select({
      id: assignments.id,
      title: assignments.title,
      description: assignments.description,
      status: assignments.status,
      dueDate: assignments.dueDate,
      createdAt: assignments.createdAt,
      courseId: assignments.courseId,
      classId: assignments.classId,
      courseName: courses.name,
      className: classes.name,
    })
    .from(assignments)
    .leftJoin(courses, eq(assignments.courseId, courses.id))
    .leftJoin(classes, eq(assignments.classId, classes.id))
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(assignments.createdAt));
}

/**
 * 根据学生（用户）ID 获取其所属班级的所有作业
 * 逻辑：assignments.classId -> students.classId (通过 students.userId 过滤)
 */
export async function getAssignmentsByStudentId(
  userId: number,
  courseId?: number
) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      id: assignments.id,
      title: assignments.title,
      description: assignments.description,
      status: assignments.status,
      dueDate: assignments.dueDate,
      createdAt: assignments.createdAt,
      courseId: assignments.courseId,
      courseName: courses.name, // 连表拿课程名
    })
    .from(assignments)
    // 1. 连课程表：为了拿课程名字展示
    .innerJoin(courses, eq(assignments.courseId, courses.id))
    // 2. 核心：连学生表，通过班级 ID 匹配
    .innerJoin(students, eq(assignments.classId, students.classId))
    .where(
      and(
        eq(students.userId, userId), // 匹配当前学生
        eq(assignments.status, "published"), // 学生只看已发布的
        courseId ? eq(assignments.courseId, courseId) : undefined // 如果传了 ID 则精准过滤
      )
    )
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

// 更新作业信息
export async function updateAssignment(
  id: number,
  data: Partial<typeof assignments.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(assignments).set(data).where(eq(assignments.id, id));
}

// 删除（撤回）作业
export async function deleteAssignment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(assignments).where(eq(assignments.id, id));
}

// ==================== 题库管理 ====================

// --- 教师视角：管理我创建的题目 ---
export async function getQuestionsByTeacher(
  teacherId: number,
  filters: { courseId?: number; search?: string }
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  const whereConditions = [eq(questions.createdBy, teacherId), eq(questions.status, "active")];
  if (filters.courseId) whereConditions.push(eq(questions.courseId, filters.courseId));
  if (filters.search) whereConditions.push(like(questions.content, `%${filters.search}%`));

  return await db
    .select({
      id: questions.id,
      type: questions.type,
      content: questions.content,
      difficulty: questions.difficulty,
      courseName: courses.name,
      createdAt: questions.createdAt,
    })
    .from(questions)
    .leftJoin(courses, eq(questions.courseId, courses.id))
    .where(and(...whereConditions))
    .orderBy(desc(questions.createdAt));
}

// --- 管理员视角：监控全校题库分布 ---
export async function getQuestionsForAdmin(filters: { courseId?: number; search?: string }) {
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
      creatorName: users.name, // 管理员额外看是谁出的题
    })
    .from(questions)
    .leftJoin(courses, eq(questions.courseId, courses.id))
    .leftJoin(users, eq(questions.createdBy, users.id))
    .where(whereConditions.length ? and(...whereConditions) : undefined)
    .orderBy(desc(questions.createdAt));
}

// --- 学生视角：练习模式（仅限已选课程的题目） ---
export async function getQuestionsByStudent(userId: number, courseId?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  // 逻辑：通过 student 表找到学生所在的班级，再找到班级关联的课程
  return await db
    .select({
      id: questions.id,
      type: questions.type,
      content: questions.content,
      // 注意：学生端通常不返回 answer 和 analysis，除非是练习模式或已提交
    })
    .from(students)
    .innerJoin(classes, eq(students.classId, classes.id))
    // 此处假设有一个 course_classes 表记录班级和课程的关联
    .innerJoin(questions, eq(questions.courseId, courseId))
    .where(and(
      eq(students.userId, userId),
      courseId ? eq(questions.courseId, courseId) : undefined
    ));
}

// 获取单条题目详情
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

// 创建或更新
export async function upsertQuestion(teacherId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  const { id, ...payload } = data;
  const finalData = {
    ...payload,
    createdBy: teacherId,
    // 如果前端传的是选项数组，转为 JSON 存入
    options: payload.options ? JSON.stringify(payload.options) : null,
  };

  if (id) {
    // 只有本人能改本人的题
    await db.update(questions)
      .set(finalData)
      .where(and(eq(questions.id, id), eq(questions.createdBy, teacherId)));
    return id;
  } else {
    const [result] = await db.insert(questions).values(finalData);
    return result.insertId;
  }
}

// 安全删除题目（可批量）
// 规则：
// 1. 先检查题目是否被任何考试或作业引用过
// 2. 如果有引用，执行“软删除”，标记为归档（archived）
// 3. 如果无引用，直接物理删除或标记为 deleted
export async function deleteQuestionsBulk(ids: number[], teacherId: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  const results = {
    deleted: 0,
    archived: 0,
    failed: 0
  };

  // 使用事务确保批量操作的原子性
  await db.transaction(async (tx) => {
    for (const id of ids) {
      try {
        // 1. 检查引用情况
        const [usage] = await tx.select({
          examRefCount: sql<number>`(SELECT COUNT(*) FROM examQuestions WHERE questionId = ${id})`,
          assignRefCount: sql<number>`(SELECT COUNT(*) FROM assignmentQuestions WHERE questionId = ${id})`
        })
          .from(questions)
          .where(eq(questions.id, id));

        const totalRefs = Number(usage?.examRefCount || 0) + Number(usage?.assignRefCount || 0);

        if (totalRefs > 0) {
          // 2. 有引用 -> 归档
          await tx.update(questions)
            .set({ status: "archived", updatedAt: new Date() })
            .where(and(eq(questions.id, id), eq(questions.createdBy, teacherId)));
          results.archived++;
        } else {
          // 3. 无引用 -> 物理删除
          await tx.delete(questions)
            .where(and(eq(questions.id, id), eq(questions.createdBy, teacherId)));
          results.deleted++;
        }
      } catch (err) {
        console.error(`题目 ID ${id} 删除失败:`, err);
        results.failed++;
      }
    }
  });

  return {
    success: true,
    ...results,
    message: `操作完成：${results.deleted} 题已彻底删除，${results.archived} 题因有关联而已转入归档${results.failed > 0 ? `，${results.failed} 题操作失败` : ''}。`
  };
}

// ==================== 考试管理（**模版**） ====================

// --- 辅助函数：将 Join 产生的扁平数据聚合为嵌套对象 ---
function aggregateExams(rows: any[]) {
  const examMap = new Map();
  rows.forEach((row) => {
    if (!examMap.has(row.exam.id)) {
      examMap.set(row.exam.id, {
        ...row.exam,
        courseName: row.courseName,
        targetClasses: [], // 存储班级数组
      });
    }
    if (row.classId) {
      examMap.get(row.exam.id).targetClasses.push({
        id: row.classId,
        name: row.className,
      });
    }
  });
  return Array.from(examMap.values());
}

/**
 * 通用的考试状态计算 SQL 片段
 * 统一标准：未开始 (not_started) -> 进行中 (in_progress) -> 已结束 (ended)
 */
const getExamStatusSql = () => {
  return sql<string>`
    CASE 
      WHEN UTC_TIMESTAMP() < ${exams.startTime} THEN 'not_started'
      WHEN UTC_TIMESTAMP() >= ${exams.startTime} AND UTC_TIMESTAMP() <= ${exams.endTime} THEN 'in_progress'
      ELSE 'ended'
    END
  `.as('status');
};

// 辅助：定义需要查询的 Exam 基础字段，避免重复写
const examColumns = {
  id: exams.id,
  courseId: exams.courseId,
  title: exams.title,
  description: exams.description,
  duration: exams.duration,
  startTime: exams.startTime,
  endTime: exams.endTime,
  totalScore: exams.totalScore,
  createdBy: exams.createdBy,
  createdAt: exams.createdAt,
};

// --- 教师视角：获取我创建的考试，并带出关联的所有班级 ---
export async function getExamsByTeacher(teacherId: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  const rows = await db
    .select({
      exam: {
        ...examColumns,
        status: getExamStatusSql(),
      },
      courseName: courses.name,
      classId: classes.id,
      className: classes.name,
    })
    .from(exams)
    .innerJoin(courses, eq(exams.courseId, courses.id))
    .leftJoin(examClasses, eq(exams.id, examClasses.examId))
    .leftJoin(classes, eq(examClasses.classId, classes.id))
    .where(eq(exams.createdBy, teacherId))
    .orderBy(desc(exams.createdAt));

  return aggregateExams(rows);
}

// --- 学生视角 ---
export async function getExamsByStudent(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  const currentStatusSql = getExamStatusSql();

  const rows = await db
    .select({
      exam: {
        ...examColumns,
        status: currentStatusSql,
      },
      courseName: courses.name,
      className: classes.name,
      classId: classes.id,
    })
    .from(students)
    .innerJoin(examClasses, eq(students.classId, examClasses.classId))
    .innerJoin(exams, eq(examClasses.examId, exams.id))
    .leftJoin(courses, eq(exams.courseId, courses.id))
    .leftJoin(classes, eq(students.classId, classes.id))
    .where(
      and(
        eq(students.userId, userId),
      )
    )
    .orderBy(desc(exams.startTime)); // 按考试时间倒序排列

  return aggregateExams(rows);
}

// --- 管理员视角 ---
export async function getExamsForAdmin() {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  const rows = await db
    .select({
      exam: {
        ...examColumns,
        status: getExamStatusSql(),
      },
      courseName: courses.name,
      classId: classes.id,
      className: classes.name,
    })
    .from(exams)
    .leftJoin(courses, eq(exams.courseId, courses.id))
    .leftJoin(examClasses, eq(exams.id, examClasses.examId))
    .leftJoin(classes, eq(examClasses.classId, classes.id))
    .orderBy(desc(exams.createdAt));

  return aggregateExams(rows);
}

export async function getExamById(id: number) {
  const db = await getDb();
  if (!db) return null;

  // 1. 查主表
  const examResult = await db.select().from(exams).where(eq(exams.id, id)).limit(1);
  if (examResult.length === 0) return null;

  // 2. 查关联的班级 ID 列表
  const classRelations = await db
    .select({ classId: examClasses.classId })
    .from(examClasses)
    .where(eq(examClasses.examId, id));

  return {
    ...examResult[0],
    classIds: classRelations.map(r => r.classId), // 给前端回填用
  };
}

export async function upsertExam(
  teacherId: number,
  data: any,
  classIds: number[]
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  // 开启事务：确保考试主表和班级关联表同步更新
  return await db.transaction(async (tx) => {
    let examId = data.id;

    // 1. 处理考试主表 (exams)
    const examPayload = {
      title: data.title,
      description: data.description,
      courseId: data.courseId,
      duration: data.duration,
      startTime: data.startTime,
      endTime: data.endTime,
      totalScore: data.totalScore,
      createdBy: teacherId,
      // 如果是创建，status 默认为 not_started
    };

    if (examId) {
      // --- 编辑模式 ---
      await tx.update(exams)
        .set(examPayload)
        .where(and(eq(exams.id, examId), eq(exams.createdBy, teacherId)));

      // --- 同步班级关联 (核心逻辑) ---
      // 先彻底物理删除该考试所有的旧班级关联
      await tx.delete(examClasses).where(eq(examClasses.examId, examId));
    } else {
      // --- 创建模式 ---
      const [result] = await tx.insert(exams).values(examPayload);
      examId = result.insertId;
    }

    // 2. 统一插入最新的班级关联
    if (classIds && classIds.length > 0) {
      const relationValues = classIds.map((cid) => ({
        examId: examId,
        classId: cid,
      }));
      await tx.insert(examClasses).values(relationValues);
    }

    return examId;
  });
}

// 删除考试， schema中实现了级联删除
export async function deleteExam(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(exams).where(eq(exams.id, id));
  return { success: true };
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
    .where(eq(chapters.courseId, courseId))
    .orderBy(asc(chapters.chapterOrder));
}

export async function createChapter(data: {
  courseId: number;
  title: string;
  description?: string;
  chapterOrder?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Auto-assign order if not provided
  if (!data.chapterOrder) {
    const existingChapters = await db
      .select({ maxOrder: sql<number>`MAX(${chapters.chapterOrder})` })
      .from(chapters)
      .where(eq(chapters.courseId, data.courseId));
    data.chapterOrder = (existingChapters[0]?.maxOrder || 0) + 1;
  }

  const result = await db.insert(chapters).values(data);
  return { id: Number((result as any).insertId) };
}

export async function updateChapter(
  id: number,
  data: { title?: string; description?: string; chapterOrder?: number }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(chapters).set(data).where(eq(chapters.id, id));
  return { success: true };
}

export async function deleteChapter(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if chapter has knowledge points
  const linkedKPs = await db
    .select({ id: knowledgePoints.id })
    .from(knowledgePoints)
    .where(eq(knowledgePoints.chapterId, id))
    .limit(1);

  if (linkedKPs.length > 0) {
    throw new Error("无法删除：该章节下仍有知识点，请先删除知识点。");
  }

  await db.delete(chapters).where(eq(chapters.id, id));
  return { success: true };
}

export async function getKnowledgePointsByChapterId(chapterId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(knowledgePoints)
    .where(eq(knowledgePoints.chapterId, chapterId))
    .orderBy(asc(knowledgePoints.kpOrder));
}

export async function getKnowledgePointsByCourseId(courseId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      id: knowledgePoints.id,
      name: knowledgePoints.name,
      description: knowledgePoints.description,
      chapterId: knowledgePoints.chapterId,
      chapterTitle: chapters.title,
    })
    .from(knowledgePoints)
    .leftJoin(chapters, eq(knowledgePoints.chapterId, chapters.id))
    .where(eq(knowledgePoints.courseId, courseId))
    .orderBy(asc(chapters.chapterOrder), asc(knowledgePoints.kpOrder));
}

export async function createKnowledgePoint(data: {
  courseId: number;
  chapterId?: number;
  name: string;
  description?: string;
  kpOrder?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Auto-assign order if not provided
  if (!data.kpOrder && data.chapterId) {
    const existingKPs = await db
      .select({ maxOrder: sql<number>`MAX(${knowledgePoints.kpOrder})` })
      .from(knowledgePoints)
      .where(eq(knowledgePoints.chapterId, data.chapterId));
    data.kpOrder = (existingKPs[0]?.maxOrder || 0) + 1;
  }

  const result = await db.insert(knowledgePoints).values(data);
  return { id: Number((result as any).insertId) };
}

export async function updateKnowledgePoint(
  id: number,
  data: { name?: string; description?: string; kpOrder?: number }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(knowledgePoints).set(data).where(eq(knowledgePoints.id, id));
  return { success: true };
}

export async function deleteKnowledgePoint(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete related knowledge point relations first
  await db
    .delete(knowledgePointRelations)
    .where(eq(knowledgePointRelations.knowledgePointId, id));

  await db.delete(knowledgePoints).where(eq(knowledgePoints.id, id));
  return { success: true };
}

export async function searchKnowledgePoints(courseId: number, query: string) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      id: knowledgePoints.id,
      name: knowledgePoints.name,
      description: knowledgePoints.description,
      chapterId: knowledgePoints.chapterId,
      chapterTitle: chapters.title,
    })
    .from(knowledgePoints)
    .leftJoin(chapters, eq(knowledgePoints.chapterId, chapters.id))
    .where(
      and(
        eq(knowledgePoints.courseId, courseId),
        like(knowledgePoints.name, `%${query}%`)
      )
    )
    .orderBy(asc(chapters.chapterOrder), asc(knowledgePoints.kpOrder));
}

// Knowledge Point Relations
export async function linkKnowledgePoint(data: {
  knowledgePointId: number;
  assignmentId?: number;
  examId?: number;
  experimentId?: number;
  questionId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if already linked
  const filters = [eq(knowledgePointRelations.knowledgePointId, data.knowledgePointId)];
  if (data.assignmentId) filters.push(eq(knowledgePointRelations.assignmentId, data.assignmentId));
  if (data.examId) filters.push(eq(knowledgePointRelations.examId, data.examId));
  if (data.experimentId) filters.push(eq(knowledgePointRelations.experimentId, data.experimentId));
  if (data.questionId) filters.push(eq(knowledgePointRelations.questionId, data.questionId));

  const existing = await db
    .select()
    .from(knowledgePointRelations)
    .where(and(...filters))
    .limit(1);

  if (existing.length > 0) {
    return { success: true, message: "已关联" };
  }

  const result = await db.insert(knowledgePointRelations).values(data);
  return { id: Number((result as any).insertId) };
}

export async function unlinkKnowledgePoint(relationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(knowledgePointRelations).where(eq(knowledgePointRelations.id, relationId));
  return { success: true };
}

export async function getKnowledgePointsByEntity(
  entityType: "assignment" | "exam" | "experiment" | "question",
  entityId: number
) {
  const db = await getDb();
  if (!db) return [];

  const entityColumn = {
    assignment: knowledgePointRelations.assignmentId,
    exam: knowledgePointRelations.examId,
    experiment: knowledgePointRelations.experimentId,
    question: knowledgePointRelations.questionId,
  }[entityType];

  return await db
    .select({
      relationId: knowledgePointRelations.id,
      id: knowledgePoints.id,
      name: knowledgePoints.name,
      description: knowledgePoints.description,
    })
    .from(knowledgePointRelations)
    .innerJoin(knowledgePoints, eq(knowledgePointRelations.knowledgePointId, knowledgePoints.id))
    .where(eq(entityColumn, entityId));
}

// ==================== 实验管理增强 ====================

export async function updateExperiment(
  id: number,
  data: Partial<typeof experiments.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(experiments).set(data).where(eq(experiments.id, id));
  return { success: true };
}

export async function deleteExperiment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if has submissions
  const submissions = await db
    .select({ id: experimentSubmissions.id })
    .from(experimentSubmissions)
    .where(eq(experimentSubmissions.experimentId, id))
    .limit(1);

  if (submissions.length > 0) {
    throw new Error("无法删除：该实验已有学生提交记录。");
  }

  // Delete knowledge point relations
  await db
    .delete(knowledgePointRelations)
    .where(eq(knowledgePointRelations.experimentId, id));

  await db.delete(experiments).where(eq(experiments.id, id));
  return { success: true };
}

export async function publishExperiment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(experiments)
    .set({ status: "published" })
    .where(eq(experiments.id, id));
  return { success: true };
}

export async function closeExperiment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(experiments)
    .set({ status: "closed" })
    .where(eq(experiments.id, id));
  return { success: true };
}

// Experiment Submissions
export async function submitExperiment(data: {
  experimentId: number;
  studentId: number;
  code: string;
  status?: "draft" | "submitted";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const status = data.status || "submitted";
  const now = new Date();

  // Check if already submitted
  const existing = await db
    .select()
    .from(experimentSubmissions)
    .where(
      and(
        eq(experimentSubmissions.experimentId, data.experimentId),
        eq(experimentSubmissions.studentId, data.studentId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    const updateData: any = {
      code: data.code,
      lastActionAt: now,
      status: status,
    };

    // Only update submittedAt if explicitly submitting
    if (status === "submitted") {
      updateData.submittedAt = now;
    }

    // Update existing submission
    await db
      .update(experimentSubmissions)
      .set(updateData)
      .where(eq(experimentSubmissions.id, existing[0].id));
    return { id: existing[0].id, updated: true };
  }

  // Create new submission
  const insertData: any = {
    ...data,
    status: status,
    lastActionAt: now,
  };

  if (status === "submitted") {
    insertData.submittedAt = now;
  }

  const result = await db.insert(experimentSubmissions).values(insertData);
  return { id: Number((result as any).insertId), updated: false };
}

export async function getSubmissionsByExperiment(experimentId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      id: experimentSubmissions.id,
      code: experimentSubmissions.code,
      status: experimentSubmissions.status,
      score: experimentSubmissions.score,
      feedback: experimentSubmissions.feedback,
      submittedAt: experimentSubmissions.submittedAt,
      lastActionAt: experimentSubmissions.lastActionAt,
      evaluationResult: experimentSubmissions.evaluationResult,
      studentId: students.studentId,
      studentName: users.name,
    })
    .from(experimentSubmissions)
    .innerJoin(students, eq(experimentSubmissions.studentId, students.id))
    .innerJoin(users, eq(students.userId, users.id))
    .where(eq(experimentSubmissions.experimentId, experimentId))
    .orderBy(desc(experimentSubmissions.submittedAt));
}

// Get Progress for ALL students in class
export async function getExperimentProgress(experimentId: number) {
  const db = await getDb();
  if (!db) return [];

  // 1. Get Experiment to find classId
  const experiment = await db
    .select({ classId: experiments.classId })
    .from(experiments)
    .where(eq(experiments.id, experimentId))
    .limit(1);

  if (experiment.length === 0) return [];
  const classId = experiment[0].classId;

  // 2. Get All Students left join Submissions
  return await db
    .select({
      studentId: students.studentId,
      name: users.name,
      // Submission fields (nullable)
      submissionId: experimentSubmissions.id,
      status: experimentSubmissions.status, // null means not started
      score: experimentSubmissions.score,
      lastActionAt: experimentSubmissions.lastActionAt,
      submittedAt: experimentSubmissions.submittedAt
    })
    .from(students)
    .innerJoin(users, eq(students.userId, users.id))
    .leftJoin(
      experimentSubmissions,
      and(
        eq(students.id, experimentSubmissions.studentId),
        eq(experimentSubmissions.experimentId, experimentId)
      )
    )
    .where(eq(students.classId, classId));
}

export async function getStudentSubmission(experimentId: number, studentId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(experimentSubmissions)
    .where(
      and(
        eq(experimentSubmissions.experimentId, experimentId),
        eq(experimentSubmissions.studentId, studentId)
      )
    )
    .limit(1);

  return result[0] || null;
}

export async function evaluateSubmission(
  submissionId: number,
  result: {
    score: number;
    feedback?: string;
    evaluationResult?: any;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(experimentSubmissions)
    .set({
      status: "evaluated",
      score: result.score.toString(),
      feedback: result.feedback,
      evaluationResult: result.evaluationResult,
    })
    .where(eq(experimentSubmissions.id, submissionId));
  return { success: true };
}

// ==================== AI 助教 ====================
// 获取学生的会话列表
export async function getAIConversationsByStudent(studentId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(aiConversations)
    .where(eq(aiConversations.studentId, studentId))
    .orderBy(desc(aiConversations.updatedAt));
}

// 创建新会话
export async function createAIConversation(data: {
  studentId: number;
  assignmentId?: number;
  title: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const [result] = await db.insert(aiConversations).values(data);

  const newId = result.insertId;

  const newConv = await db
    .select()
    .from(aiConversations)
    .where(eq(aiConversations.id, newId))
    .limit(1);

  return newConv; // 返回包含新创建会话的数组
}

// 获取会话内的消息
export async function getAIMessagesByConversation(
  conversationId: number,
  limitCount?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  let query = db
    .select()
    .from(aiMessages)
    .where(eq(aiMessages.conversationId, conversationId))
    .orderBy(asc(aiMessages.createdAt));

  if (limitCount) {
    // 如果是用于上下文，通常取最近的消息，这里逻辑根据需求可调整
    // 此处简单起见直接取全部，或根据 limitCount 截取
  }

  return await query;
}

// 保存单条消息
export async function saveAIMessage(
  conversationId: number,
  role: "user" | "assistant",
  content: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  return await db.insert(aiMessages).values({
    conversationId,
    role,
    content,
  });
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
