import { getDb, exams, examClasses, courses, classes, students } from "../index";
import { eq, desc, and, sql, getTableColumns } from "drizzle-orm";

// --- 辅助函数：将 Join 产生的扁平数据聚合为嵌套对象 ---
function aggregateExams(rows: any[]) {
  const examMap = new Map();
  rows.forEach(row => {
    if (!examMap.has(row.exam.id)) {
      examMap.set(row.exam.id, {
        ...row.exam,
        courseName: row.courseName,
        targetClasses: [],
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

// 通用的状态计算 SQL
const getExamStatusSql = () => {
  return sql<string>`
    CASE 
      WHEN UTC_TIMESTAMP() < ${exams.startTime} THEN 'not_started'
      WHEN UTC_TIMESTAMP() >= ${exams.startTime} AND UTC_TIMESTAMP() <= ${exams.endTime} THEN 'in_progress'
      ELSE 'ended'
    END
  `.as("status");
};

const examColumns = { ...getTableColumns(exams) };

/**
 * 教师视角：获取创建的考试
 */
export async function getExamsByTeacher(teacherId: number) {
  const db = await getDb();
  const rows = await db
    .select({
      exam: { ...examColumns, status: getExamStatusSql() },
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

/**
 * 学生视角：获取所在班级的考试
 */
export async function getExamsByStudent(userId: number) {
  const db = await getDb();
  const rows = await db
    .select({
      exam: { ...examColumns, status: getExamStatusSql() },
      courseName: courses.name,
      className: classes.name,
      classId: classes.id,
    })
    .from(students)
    .innerJoin(examClasses, eq(students.classId, examClasses.classId))
    .innerJoin(exams, eq(examClasses.examId, exams.id))
    .leftJoin(courses, eq(exams.courseId, courses.id))
    .leftJoin(classes, eq(students.classId, classes.id))
    .where(eq(students.userId, userId))
    .orderBy(desc(exams.startTime));

  return aggregateExams(rows);
}

/**
 * 管理员视角：获取所有考试
 */
export async function getExamsForAdmin() {
  const db = await getDb();
  const rows = await db
    .select({
      exam: { ...examColumns, status: getExamStatusSql() },
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

/**
 * 获取单场考试详情
 */
export async function getExamById(id: number) {
  const db = await getDb();
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

/**
 * 创建或更新考试
 */
export async function upsertExam(teacherId: number, data: any, classIds: number[]) {
  const db = await getDb();
  return await db.transaction(async tx => {
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
      await tx.update(exams).set(examPayload).where(and(eq(exams.id, examId), eq(exams.createdBy, teacherId)));
      await tx.delete(examClasses).where(eq(examClasses.examId, examId));
    } else {
      const [result] = await tx.insert(exams).values(examPayload);
      examId = result.insertId;
    }

    if (classIds?.length > 0) {
      await tx.insert(examClasses).values(classIds.map(cid => ({ examId, classId: cid })));
    }
    return examId;
  });
}

/**
 * 删除考试
 */
export async function deleteExam(id: number) {
  const db = await getDb();
  await db.delete(exams).where(eq(exams.id, id));
  return { success: true };
}