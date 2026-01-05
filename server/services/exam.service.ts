import {
  getDb,
  exams,
  examClasses,
  courses,
  classes,
  students,
  users,
  examQuestions,
  questions,
  submissions,
  submissionDetails,
} from "../index";
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
  if (!db) return null;

  // 1. 获取考试主表信息 (保持不变)
  const examResult = await db
    .select({
      ...getTableColumns(exams),
      courseName: courses.name
    })
    .from(exams)
    .innerJoin(courses, eq(exams.courseId, courses.id))
    .where(eq(exams.id, id))
    .limit(1);
  
  if (examResult.length === 0) return null;
  const exam = examResult[0];

  // 2. 获取关联班级 ID (保持不变)
  const classRelations = await db
    .select({ classId: examClasses.classId })
    .from(examClasses)
    .where(eq(examClasses.examId, id));

  // 3. 获取关联题目信息
  const questionRelations = await db
    .select({
      id: questions.id,
      questionId: questions.id,
      title: questions.title,
      content: questions.content,
      type: questions.type,
      options: questions.options, // 这里拿到的可能是字符串
      score: examQuestions.score,
      order: examQuestions.questionOrder,
    })
    .from(examQuestions)
    .innerJoin(questions, eq(examQuestions.questionId, questions.id))
    .where(eq(examQuestions.examId, id))
    .orderBy(examQuestions.questionOrder);

  // 4. ✅ 核心修复：对返回的题目进行预处理，确保 options 是对象数组
  const processedQuestions = questionRelations.map(q => {
    let finalOptions = q.options;
    
    // 如果 options 是字符串类型，则进行解析
    if (typeof q.options === 'string') {
      try {
        finalOptions = JSON.parse(q.options);
      } catch (e) {
        console.error(`解析题目 ID ${q.id} 的 options 失败:`, e);
        finalOptions = []; // 解析失败则降级为空数组
      }
    }

    return {
      ...q,
      options: finalOptions
    };
  });

  // 5. 合并返回
  return {
    ...exam,
    classIds: classRelations.map(r => r.classId),
    questions: processedQuestions, // 使用处理后的题目列表
  };
}

/**
 * 创建或更新考试
 */
export async function upsertExam(
  teacherId: number,
  data: any,
  classIds: number[],
  selectedQuestions: { questionId: number; score: number; order?: number }[]
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  return await db.transaction(async (tx) => {
    let examId = data.id;

    // 1. 计算考试结束时间
    const start = new Date(data.startTime);
    const end = new Date(start.getTime() + data.duration * 60 * 1000);

    // 2. 准备主表数据
    const payload = {
      courseId: data.courseId,
      title: data.title,
      description: data.description,
      duration: data.duration,
      startTime: start,
      endTime: end,
      totalScore: data.totalScore || 100,
      createdBy: teacherId,
    };

    // 3. 执行主表更新或插入
    if (examId) {
      // 更新考试：需确保是创建者本人
      await tx.update(exams)
        .set({ ...payload, updatedAt: new Date() })
        .where(and(eq(exams.id, examId), eq(exams.createdBy, teacherId)));
      
      // 清理关联表 (借鉴作业逻辑：先删后增)
      await tx.delete(examClasses).where(eq(examClasses.examId, examId));
      await tx.delete(examQuestions).where(eq(examQuestions.examId, examId));
    } else {
      // 插入新考试
      const [result] = await tx.insert(exams).values(payload);
      examId = result.insertId;
    }

    // 4. 批量插入班级关联
    if (classIds?.length > 0) {
      const classValues = classIds.map(cid => ({
        examId: Number(examId),
        classId: cid
      }));
      await tx.insert(examClasses).values(classValues as any);
    }

    // 5. 批量插入题目关联 (参考 assignmentQuestions 的 int 类型处理)
    if (selectedQuestions?.length > 0) {
      const questionValues = selectedQuestions.map((q, idx) => ({
        examId: Number(examId),
        questionId: q.questionId,
        score: q.score, // 数据库定义为 int，保持 number 类型
        questionOrder: q.order ?? (idx + 1),
      }));

      // 使用 as any 解决 Drizzle TypeScript 重载报错问题
      await tx.insert(examQuestions).values(questionValues as any);
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

// --- 学生提交考试 ---
export async function submitExam(
  userId: number,
  input: {
    examId: number;
    answers: { questionId: number; content: string }[];
  }
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  // 1. 查询考试时间限制
  const exam = await db.query.exams.findFirst({
    where: eq(exams.id, input.examId),
  });

  if (!exam) throw new Error("考试不存在");

  // 2. 核心校验：必须在考试时间窗口内（可选：也可校验是否已结束）
  const now = new Date();
  if (exam.endTime && now > new Date(exam.endTime)) {
    throw new Error("考试已结束，无法提交。");
  }

  return await db.transaction(async tx => {
    // 1. 获取题目和标准答案
    const refQuestions = await tx
      .select({
        id: questions.id,
        type: questions.type,
        answer: questions.answer,
        maxScore: examQuestions.score,
      })
      .from(examQuestions)
      .innerJoin(questions, eq(examQuestions.questionId, questions.id))
      .where(eq(examQuestions.examId, input.examId));

    if (refQuestions.length === 0) throw new Error("该考试未关联题目");

    // 2. 插入主记录 (sourceType 设为 'exam')
    const [insertResult] = await tx.insert(submissions).values({
      studentId: userId,
      sourceId: input.examId,
      sourceType: "exam", // ✅ 关键区别
      status: "submitted",
      totalScore: "0.00",
      submittedAt: new Date(),
    });

    const submissionId = insertResult.insertId;
    let totalAutoScore = 0;

    // 3. 处理答题详情 (逻辑与作业一致)
    const detailValues = input.answers
      .map(ans => {
        const qRef = refQuestions.find(q => q.id === ans.questionId);
        if (!qRef) return null;

        let isCorrect = false;
        let earnedScore = 0;

        const objectiveTypes = [
          "single_choice",
          "multiple_choice",
          "true_false",
        ];
        if (objectiveTypes.includes(qRef.type) && qRef.answer) {
          const studentAns = (ans.content || "").trim().toUpperCase();
          const correctAns = (qRef.answer || "").trim().toUpperCase();
          isCorrect = studentAns === correctAns;
          earnedScore = isCorrect ? Number(qRef.maxScore || 0) : 0;
          totalAutoScore += earnedScore;
        }

        return {
          submissionId,
          questionId: ans.questionId,
          studentAnswer: ans.content,
          isCorrect,
          score: earnedScore.toFixed(2),
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);

    if (detailValues.length > 0) {
      await tx.insert(submissionDetails).values(detailValues);
    }

    // 4. 更新主表总分
    await tx
      .update(submissions)
      .set({
        totalScore: totalAutoScore.toFixed(2),
        status: "submitted",
      })
      .where(eq(submissions.id, submissionId));

    return { submissionId, score: totalAutoScore };
  });
}

// --- 查询学生提交状态 ---
export async function getExamSubmissionStatus(userId: number, examId: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  const [record] = await db
    .select()
    .from(submissions)
    .where(
      and(
        eq(submissions.studentId, userId),
        eq(submissions.sourceId, examId),
        eq(submissions.sourceType, "exam") // ✅ 关键区别
      )
    )
    .limit(1);

  return record || null;
}

// --- 考试统计情况 ---
export async function getExamStats(examId: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  const submissionStats = await db
    .select({
      status: submissions.status,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(submissions)
    .where(
      and(eq(submissions.sourceId, examId), eq(submissions.sourceType, "exam"))
    )
    .groupBy(submissions.status);

  let submitted = 0;
  let graded = 0;
  submissionStats.forEach(row => {
    submitted += row.count;
    if (row.status === "graded") graded += row.count;
  });

  const [totalResult] = await db
    .select({
      count: sql<number>`count(distinct ${students.id})`.mapWith(Number),
    })
    .from(examClasses)
    .innerJoin(students, eq(examClasses.classId, students.classId))
    .where(eq(examClasses.examId, examId));

  return {
    submitted,
    graded,
    pending: submitted - graded,
    totalStudents: totalResult?.count || 0,
  };
}

// --- 教师阅卷列表 ---
export async function getExamSubmissions(examId: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  return await db
    .select({
      studentId: students.userId,
      studentName: users.name,
      studentNumber: users.username,
      className: classes.name,
      submissionId: submissions.id,
      status: submissions.status,
      totalScore: submissions.totalScore,
      submittedAt: submissions.submittedAt,
    })
    .from(examClasses)
    .innerJoin(students, eq(examClasses.classId, students.classId))
    .innerJoin(users, eq(students.userId, users.id))
    .innerJoin(classes, eq(students.classId, classes.id))
    .leftJoin(
      submissions,
      and(
        eq(submissions.sourceId, examId),
        eq(submissions.sourceType, "exam"),
        eq(submissions.studentId, students.userId)
      )
    )
    .where(eq(examClasses.examId, examId))
    .orderBy(classes.name, users.username);
}

// --- 阅卷详情获取 (带题目) ---
export async function getExamSubmissionDetail(submissionId: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  const [submission] = await db
    .select({
      id: submissions.id,
      studentName: users.name,
      totalScore: submissions.totalScore,
      status: submissions.status,
      examTitle: exams.title,
      examId: exams.id,
    })
    .from(submissions)
    .innerJoin(users, eq(submissions.studentId, users.id))
    .innerJoin(exams, eq(submissions.sourceId, exams.id))
    .where(eq(submissions.id, submissionId))
    .limit(1);

  if (!submission) return null;

  const details = await db
    .select({
      detailId: submissionDetails.id,
      questionId: questions.id,
      content: questions.content,
      type: questions.type,
      options: questions.options,
      standardAnswer: questions.answer,
      studentAnswer: submissionDetails.studentAnswer,
      isCorrect: submissionDetails.isCorrect,
      score: submissionDetails.score,
      maxScore: examQuestions.score,
    })
    .from(submissionDetails)
    .innerJoin(questions, eq(submissionDetails.questionId, questions.id))
    .leftJoin(
      examQuestions,
      and(
        eq(examQuestions.examId, submission.examId),
        eq(examQuestions.questionId, questions.id)
      )
    )
    .where(eq(submissionDetails.submissionId, submissionId));

  return { submission, details };
}
