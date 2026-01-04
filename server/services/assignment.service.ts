import { getDb, assignments, assignmentQuestions, assignmentClasses, questions, courses, classes, students } from "../index";
import { eq, desc, and, sql, inArray, getTableColumns } from "drizzle-orm";

// 基础字段
const assignmentColumns = { ...getTableColumns(assignments) };

// --- 辅助函数：将 Join 产生的扁平数据聚合为嵌套对象 ---
function aggregateAssignments(rows: any[]) {
  const assignmentMap = new Map();
  rows.forEach(row => {
    const aid = row.assignment.id;
    if (!assignmentMap.has(aid)) {
      assignmentMap.set(aid, {
        ...row.assignment,
        courseName: row.courseName,
        targetClasses: [],
        questionCount: 0,
        totalScore: 0,
      });
    }
    const current = assignmentMap.get(aid);
    if (row.classId && !current.targetClasses.some((c: any) => c.id === row.classId)) {
      current.targetClasses.push({ id: row.classId, name: row.className });
    }
  });
  return Array.from(assignmentMap.values());
}

/**
 * 教师视角：获取作业列表（带统计数据）
 */
export async function getAssignmentsByTeacher(teacherId: number, courseId?: number) {
  const db = await getDb();
  const filters = [eq(assignments.createdBy, teacherId)];
  if (courseId) filters.push(eq(assignments.courseId, courseId));

  const assignmentList = await db
    .select({
      ...assignmentColumns,
      courseName: courses.name,
      questionCount: sql<number>`(SELECT COUNT(*) FROM ${assignmentQuestions} WHERE ${assignmentQuestions.assignmentId} = ${assignments.id})`.mapWith(Number),
      totalScore: sql<number>`(SELECT SUM(${assignmentQuestions.score}) FROM ${assignmentQuestions} WHERE ${assignmentQuestions.assignmentId} = ${assignments.id})`.mapWith(Number),
    })
    .from(assignments)
    .innerJoin(courses, eq(assignments.courseId, courses.id))
    .where(and(...filters))
    .orderBy(desc(assignments.createdAt));

  if (assignmentList.length === 0) return [];

  const assignmentIds = assignmentList.map(a => a.id);
  const classRelations = await db.select({ assignmentId: assignmentClasses.assignmentId, id: classes.id, name: classes.name })
    .from(assignmentClasses).innerJoin(classes, eq(assignmentClasses.classId, classes.id))
    .where(inArray(assignmentClasses.assignmentId, assignmentIds));

  const questionRelations = await db.select({ assignmentId: assignmentQuestions.assignmentId, id: questions.id, title: questions.title, type: questions.type, score: assignmentQuestions.score })
    .from(assignmentQuestions).innerJoin(questions, eq(assignmentQuestions.questionId, questions.id))
    .where(inArray(assignmentQuestions.assignmentId, assignmentIds));

  return assignmentList.map(assignment => ({
    ...assignment,
    targetClasses: classRelations.filter(r => r.assignmentId === assignment.id).map(r => ({ id: r.id, name: r.name })),
    classIds: classRelations.filter(r => r.assignmentId === assignment.id).map(r => r.id),
    questions: questionRelations.filter(r => r.assignmentId === assignment.id).map(r => ({
      id: r.id, questionId: r.id, title: r.title, type: r.type, score: r.score
    })),
  }));
}

/**
 * 学生视角：获取发布的作业
 */
export async function getAssignmentsByStudent(userId: number, courseId?: number) {
  const db = await getDb();
  const rows = await db
    .select({ assignment: assignmentColumns, courseName: courses.name, classId: classes.id, className: classes.name })
    .from(students)
    .innerJoin(assignmentClasses, eq(students.classId, assignmentClasses.classId))
    .innerJoin(assignments, eq(assignmentClasses.assignmentId, assignments.id))
    .leftJoin(courses, eq(assignments.courseId, courses.id))
    .leftJoin(classes, eq(students.classId, classes.id))
    .where(and(eq(students.userId, userId), eq(assignments.status, "published"), courseId ? eq(assignments.courseId, courseId) : undefined))
    .orderBy(desc(assignments.createdAt));

  return aggregateAssignments(rows);
}

/**
 * 获取单条详情（带题目及分值）
 */
export async function getAssignmentById(id: number) {
  const db = await getDb();
  const result = await db.select().from(assignments).where(eq(assignments.id, id)).limit(1);
  if (result.length === 0) return null;

  const classRelations = await db.select({ classId: assignmentClasses.classId }).from(assignmentClasses).where(eq(assignmentClasses.assignmentId, id));
  const selectedQuestions = await db.select({
      id: questions.id, title: questions.title, content: questions.content, options: questions.options,
      type: questions.type, difficulty: questions.difficulty, score: assignmentQuestions.score, order: assignmentQuestions.questionOrder,
    })
    .from(assignmentQuestions).innerJoin(questions, eq(assignmentQuestions.questionId, questions.id))
    .where(eq(assignmentQuestions.assignmentId, id)).orderBy(assignmentQuestions.questionOrder);

  return { ...result[0], classIds: classRelations.map(r => r.classId), questions: selectedQuestions };
}

/**
 * 统一的 Upsert 逻辑 (事务处理)
 */
export async function upsertAssignment(
  teacherId: number,
  data: any,
  classIds: number[],
  selectedQuestions: { questionId: number; score: number; order?: number }[]
) {
  const db = await getDb();
  return await db.transaction(async tx => {
    let assignmentId = data.id;
    const payload = {
      courseId: data.courseId, title: data.title, description: data.description,
      requirements: data.requirements, dueDate: data.dueDate, status: data.status || "draft", createdBy: teacherId,
    };

    if (assignmentId) {
      await tx.update(assignments).set(payload).where(and(eq(assignments.id, assignmentId), eq(assignments.createdBy, teacherId)));
      await tx.delete(assignmentClasses).where(eq(assignmentClasses.assignmentId, assignmentId));
      await tx.delete(assignmentQuestions).where(eq(assignmentQuestions.assignmentId, assignmentId));
    } else {
      const [result] = await tx.insert(assignments).values(payload);
      assignmentId = result.insertId;
    }

    if (classIds?.length > 0) {
      await tx.insert(assignmentClasses).values(classIds.map(cid => ({ assignmentId, classId: cid })));
    }
    if (selectedQuestions?.length > 0) {
      await tx.insert(assignmentQuestions).values(selectedQuestions.map((q, idx) => ({
        assignmentId, questionId: q.questionId, score: q.score, questionOrder: q.order ?? idx + 1,
      })));
    }
    return assignmentId;
  });
}

export async function deleteAssignment(id: number) {
  const db = await getDb();
  await db.delete(assignments).where(eq(assignments.id, id));
  return { success: true };
}