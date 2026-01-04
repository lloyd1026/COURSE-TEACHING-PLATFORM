import {
  getDb,
  submissions,
  submissionDetails,
  questions,
  assignmentQuestions,
  assignments,
  assignmentClasses,
  students,
  users,
  classes,
} from "../index";
import { eq, and, sql } from "drizzle-orm";

// 学生提交作业
export async function submitAssignment(
  userId: number,
  input: {
    assignmentId: number;
    answers: { questionId: number; content: string }[];
  }
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  // 1. 先查询作业的截止日期
  const assignment = await db.query.assignments.findFirst({
    where: eq(assignments.id, input.assignmentId),
  });

  if (!assignment) throw new Error("作业不存在");

  // 2. 核心校验：对比当前服务器时间与截止日期
  if (assignment.dueDate && new Date() > new Date(assignment.dueDate)) {
    throw new Error("作业提交已截止，无法处理您的请求。");
  }

  return await db.transaction(async tx => {
    // 1. 获取题目和标准答案
    const refQuestions = await tx
      .select({
        id: questions.id,
        type: questions.type,
        answer: questions.answer,
        maxScore: assignmentQuestions.score,
      })
      .from(assignmentQuestions)
      .innerJoin(questions, eq(assignmentQuestions.questionId, questions.id))
      .where(eq(assignmentQuestions.assignmentId, input.assignmentId));

    if (refQuestions.length === 0) throw new Error("该作业未关联题目");

    // 2. 插入主记录
    // 这里的 totalScore 必须是 string，例如 "0.00"
    const [insertResult] = await tx.insert(submissions).values({
      studentId: userId,
      sourceId: input.assignmentId,
      sourceType: "assignment",
      status: "submitted",
      totalScore: "0.00",
      submittedAt: new Date(),
    });

    const submissionId = insertResult.insertId;
    let totalAutoScore = 0;

    // 3. 处理答题详情
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
          studentAnswer: ans.content, // ✅ 修正字段名：从 content 改为 studentAnswer
          isCorrect,
          score: earnedScore.toFixed(2), // ✅ 修正类型：decimal 需要 string
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
        totalScore: totalAutoScore.toFixed(2), // ✅ 修正类型：decimal 需要 string
        status: "submitted",
      })
      .where(eq(submissions.id, submissionId));

    return { submissionId, score: totalAutoScore };
  });
}

// 查询某个学生对某个作业的提交状态
export async function getSubmissionStatus(
  userId: number,
  assignmentId: number
) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  const [record] = await db
    .select()
    .from(submissions)
    .where(
      and(
        eq(submissions.studentId, userId),
        eq(submissions.sourceId, assignmentId),
        eq(submissions.sourceType, "assignment")
      )
    )
    .limit(1);

  return record || null;
}

/**
 * 获取某个作业的提交统计情况（教师端详情页看板使用）
 */
export async function getAssignmentStats(assignmentId: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  // 1. 统计已提交和已批阅的人数
  // submittedCount: 只要在 submissions 表里有记录，就代表已提交
  // gradedCount: 状态为 'graded' 的记录数
  const submissionStats = await db
    .select({
      status: submissions.status,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(submissions)
    .where(
      and(
        eq(submissions.sourceId, assignmentId),
        eq(submissions.sourceType, "assignment")
      )
    )
    .groupBy(submissions.status);

  // 初始化汇总变量
  let submitted = 0;
  let graded = 0;

  submissionStats.forEach(row => {
    submitted += row.count;
    if (row.status === "graded") {
      graded += row.count;
    }
  });

  // 2. 统计分发范围内的总学生人数 (分母)
  // 通过 assignmentClasses 找到关联的班级，再计算这些班级的学生总数
  const [totalResult] = await db
    .select({
      count: sql<number>`count(distinct ${students.id})`.mapWith(Number),
    })
    .from(assignmentClasses)
    .innerJoin(students, eq(assignmentClasses.classId, students.classId))
    .where(eq(assignmentClasses.assignmentId, assignmentId));

  return {
    submitted, // 已提交人数
    graded, // 已批改人数
    pending: submitted - graded, // 待批改人数 (核心逻辑)
    totalStudents: totalResult?.count || 0, // 应当提交的总人数
  };
}

/**
 * 获取某个作业的所有学生提交明细（批阅列表）
 */
export async function getAssignmentSubmissions(assignmentId: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  // 查询该作业分发到的班级里的所有学生，并关联他们的提交记录
  return await db
    .select({
      studentId: students.userId,
      studentName: users.name,
      studentNumber: users.username, // 学号
      className: classes.name,
      submissionId: submissions.id,
      status: submissions.status,
      totalScore: submissions.totalScore,
      submittedAt: submissions.submittedAt,
    })
    .from(assignmentClasses)
    .innerJoin(students, eq(assignmentClasses.classId, students.classId))
    .innerJoin(users, eq(students.userId, users.id))
    .innerJoin(classes, eq(students.classId, classes.id))
    // 左连接提交表：没交的学生也能搜出来，但 submissionId 为空
    .leftJoin(
      submissions, 
      and(
        eq(submissions.sourceId, assignmentId),
        eq(submissions.sourceType, "assignment"),
        eq(submissions.studentId, students.userId)
      )
    )
    .where(eq(assignmentClasses.assignmentId, assignmentId))
    .orderBy(classes.name, users.username);
}

/**
 * 获取单份答卷的详细内容（包含题目、学生答案、自动评分结果）
 */
export async function getSubmissionDetailForGrading(submissionId: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  // 1. 获取主表信息
  const [submission] = await db
    .select({
      id: submissions.id,
      studentName: users.name,
      totalScore: submissions.totalScore,
      status: submissions.status,
      assignmentTitle: assignments.title,
      assignmentId: assignments.id, // 拿一下 ID 给下面用
    })
    .from(submissions)
    .innerJoin(users, eq(submissions.studentId, users.id))
    .innerJoin(assignments, eq(submissions.sourceId, assignments.id))
    .where(eq(submissions.id, submissionId))
    .limit(1);

  if (!submission) return null;

  // 2. 获取详情
  // 💡 注意：将 innerJoin 改为 leftJoin 排查是否是关联表没数据导致的“全盘皆空”
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
      maxScore: assignmentQuestions.score,
    })
    .from(submissionDetails)
    .innerJoin(questions, eq(submissionDetails.questionId, questions.id))
    // 这里非常关键：确保 assignmentId 匹配
    .leftJoin(assignmentQuestions, and(
      eq(assignmentQuestions.assignmentId, submission.assignmentId),
      eq(assignmentQuestions.questionId, questions.id)
    ))
    .where(eq(submissionDetails.submissionId, submissionId));

  return { submission, details };
}

/**
 * 教师提交评分
 */
export async function updateGrades(submissionId: number, grades: { detailId: number, score: number }[]) {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  return await db.transaction(async (tx) => {
    // 1. 更新每一道的得分
    for (const item of grades) {
      await tx.update(submissionDetails)
        .set({ score: item.score.toFixed(2) })
        .where(eq(submissionDetails.id, item.detailId));
    }

    // 2. 重新计算总分
    const allDetails = await tx
      .select({ score: submissionDetails.score })
      .from(submissionDetails)
      .where(eq(submissionDetails.submissionId, submissionId));
    
    const newTotalScore = allDetails.reduce((sum, d) => sum + Number(d.score || 0), 0);

    // 3. 更新主表状态为 'graded' 并更新总分
    await tx.update(submissions)
      .set({ 
        totalScore: newTotalScore.toFixed(2),
        status: 'graded',
        gradedAt: new Date()
      })
      .where(eq(submissions.id, submissionId));

    return { success: true, newTotalScore };
  });
}
