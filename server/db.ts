import {
  eq,
  desc,
  and,
  like,
  or,
  inArray,
  asc,
  sql,
  getTableColumns,
} from "drizzle-orm";
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
  assignmentClasses,
  submissions,
  submissionDetails,

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
export async function getCoursesByTeacher(
  teacherId: number,
  searchQuery?: string
) {
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
      description: courses.description,
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

  const rows = await query
    .where(and(...filters))
    .orderBy(desc(courses.createdAt));

  // 3. 数据聚合：由于 Join 会产生多行（一门课对应多个班级），需要按课程 ID 聚合
  const courseMap = new Map<number, any>();

  for (const row of rows) {
    if (!courseMap.has(row.id)) {
      const { classId, className, ...courseData } = row;
      courseMap.set(row.id, {
        ...courseData,
        linkedClasses: [],
      });
    }

    // 如果该课程有关联班级，则推入数组
    if (row.classId) {
      courseMap.get(row.id).linkedClasses.push({
        id: row.classId,
        name: row.className,
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

export async function upsertCourse(teacherId: number, input: any) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  const { id, ...data } = input;

  if (id) {
    // 编辑模式：确保只有创建者本人能修改
    await db.update(courses)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(courses.id, id), eq(courses.teacherId, teacherId)));
    return { id, action: "updated" };
  } else {
    // 新增模式
    const [result] = await db.insert(courses).values({
      ...data,
      teacherId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return { id: Number(result.insertId), action: "created" };
  }
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

  const [result] = await db.insert(classes).values(data);
  return { id: Number(result.insertId) };
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
      // 3. 如果不存在：说明没有学生档案，但账号可能已存在
      const existingUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, data.studentId))
        .limit(1);

      let newUserId: number;

      if (existingUsers[0]) {
        newUserId = existingUsers[0].id;
      } else {
        // 第一步：在 users 表创建账号
        const [userResult] = await db.insert(users).values({
          username: data.studentId, // 用户名默认为学号
          name: data.name,
          password: hashPassword("123456"),
          role: "student",
          loginMethod: "system",
          lastSignedIn: new Date(),
        });
        newUserId = Number(userResult.insertId);
      }

      // 第二步：在 students 业务表创建记录并关联班级
      await db.insert(students).values({
        userId: newUserId, // 关联 user.id
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


// ==================== 考试管理 ====================

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

const getExamStatusSql = () => {
  return sql<string>`
    CASE 
      WHEN UTC_TIMESTAMP() < ${exams.startTime} THEN 'not_started'
      WHEN UTC_TIMESTAMP() >= ${exams.startTime} AND UTC_TIMESTAMP() <= ${exams.endTime} THEN 'in_progress'
      ELSE 'ended'
    END
  `.as('status');
};

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
    .orderBy(desc(exams.startTime));

  return aggregateExams(rows);
}

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

  const examResult = await db.select().from(exams).where(eq(exams.id, id)).limit(1);
  if (examResult.length === 0) return null;

  const classRelations = await db
    .select({ classId: examClasses.classId })
    .from(examClasses)
    .where(eq(examClasses.examId, id));

  return {
    ...examResult[0],
    classIds: classRelations.map(r => r.classId),
  };
}

export async function upsertExam(
  teacherId: number,
  data: any,
  classIds: number[]
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  return await db.transaction(async (tx) => {
    let examId = data.id;

    const examPayload = {
      title: data.title,
      description: data.description,
      courseId: data.courseId,
      duration: data.duration,
      startTime: data.startTime,
      endTime: data.endTime,
      totalScore: data.totalScore,
      createdBy: teacherId,
    };

    if (examId) {
      await tx.update(exams)
        .set(examPayload)
        .where(and(eq(exams.id, examId), eq(exams.createdBy, teacherId)));

      await tx.delete(examClasses).where(eq(examClasses.examId, examId));
    } else {
      const [result] = await tx.insert(exams).values(examPayload);
      examId = result.insertId;
    }

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

export async function deleteExam(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(exams).where(eq(exams.id, id));
  return { success: true };
}


// ==================== 实验管理 ====================

export async function getAllExperiments(courseId?: number, teacherId?: number) {
  const db = await getDb();
  if (!db) return [];

  let query = db
    .select()
    .from(experiments)
    .orderBy(desc(experiments.createdAt));

  const conditions = [];
  if (courseId) {
    conditions.push(eq(experiments.courseId, courseId));
  }
  if (teacherId) {
    conditions.push(eq(experiments.createdBy, teacherId));
  }

  if (conditions.length > 0) {
    // @ts-ignore
    query = query.where(and(...conditions));
  }

  return await query;
}

export async function getExperimentsByStudent(userId: number, courseId?: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({ ...getTableColumns(experiments) })
    .from(experiments)
    .innerJoin(students, eq(experiments.classId, students.classId))
    .where(and(
      eq(students.userId, userId),
      eq(experiments.status, "published"),
      courseId ? eq(experiments.courseId, courseId) : undefined
    ))
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

  const [result] = await db.insert(experiments).values(data);
  return { id: Number(result.insertId) };
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

  const [result] = await db.insert(chapters).values(data);
  return { id: Number(result.insertId) };
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

  const [result] = await db.insert(knowledgePoints).values(data);
  return { id: Number(result.insertId) };
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
        like(knowledgePoints.name, `% ${query}% `)
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

  const [result] = await db.insert(knowledgePointRelations).values(data);
  return { id: Number(result.insertId) };
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

  const [result] = await db.insert(experimentSubmissions).values(insertData);
  return { id: Number(result.insertId), updated: false };
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
  if (!db) return {
    userCount: 0,
    courseCount: 0,
    classCount: 0,
    assignmentCount: 0,
    examCount: 0,
    questionCount: 0,
    experimentCount: 0,
    roleDistribution: { student: 0, teacher: 0, admin: 0 },
    recentUsers: [],
    recentCourses: [],
  };

  // Helper to get count
  const getCount = async (table: any) => {
    const res = await db.select({ count: sql<number>`count(*)` }).from(table);
    return res[0]?.count || 0;
  };

  const [
    userCount,
    courseCount,
    classCount,
    assignmentCount,
    examCount,
    questionCount,
    experimentCount
  ] = await Promise.all([
    getCount(users),
    getCount(courses),
    getCount(classes),
    getCount(assignments),
    getCount(exams),
    getCount(questions),
    getCount(experiments)
  ]);

  // Role distribution
  const roles = await db
    .select({ role: users.role, count: sql<number>`count(*)` })
    .from(users)
    .groupBy(users.role);

  const roleDistribution = { student: 0, teacher: 0, admin: 0 };
  roles.forEach(r => {
    if (r.role in roleDistribution) {
      // @ts-ignore
      roleDistribution[r.role] = r.count;
    }
  });

  // Recent Users
  const recentUsers = await db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      role: users.role,
      createdAt: users.createdAt
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(5);

  // Recent Courses
  const recentCourses = await db
    .select({
      id: courses.id,
      name: courses.name,
      code: courses.code,
      teacherId: courses.teacherId,
      createdAt: courses.createdAt
    })
    .from(courses)
    .orderBy(desc(courses.createdAt))
    .limit(5);

  return {
    userCount,
    courseCount,
    classCount,
    assignmentCount,
    examCount,
    questionCount,
    experimentCount,
    roleDistribution,
    recentUsers,
    recentCourses
  };
}

// ==================== User Management (Admin) ====================

export async function deleteUser(id: number) {
  const db = await getDb();
  if (!db) return;
  return await db.delete(users).where(eq(users.id, id));
}

export async function adminResetPassword(id: number, hashedPassword: string) {
  const db = await getDb();
  if (!db) return;
  return await db.update(users).set({ password: hashedPassword }).where(eq(users.id, id));
}
