import {
  router,
  protectedProcedure,
  teacherProcedure,
  adminProcedure,
  studentProcedure,
} from "../_core/trpc";
import { z } from "zod";
import * as examService from "../services/exam.service";

export const examRouter = router({
  // 获取考试列表（根据角色分流）
  list: protectedProcedure
    .input(z.object({ search: z.string().optional() }).optional())
    .query(async ({ ctx }) => {
      if (ctx.user.role === "admin")
        return await examService.getExamsForAdmin();
      if (ctx.user.role === "teacher")
        return await examService.getExamsByTeacher(ctx.user.id);
      if (ctx.user.role === "student")
        return await examService.getExamsByStudent(ctx.user.id);
      return [];
    }),

  // 获取单场考试详情（学生答题面板）
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await examService.getExamById(input.id);
    }),

  // 创建/更新考试
  upsert: teacherProcedure
    .input(
      z.object({
        id: z.number().optional(),
        courseId: z.number(),
        classIds: z.array(z.number()), // 目标班级 ID 数组
        // ✅ 新增：题目关联数组，包含题目 ID 和该题在考试中的分值
        questions: z.array(
          z.object({
            questionId: z.number(),
            score: z.number(),
            order: z.number().optional(),
          })
        ),
        title: z.string().min(1, "考试标题不能为空"),
        description: z.string().optional(),
        duration: z.number().min(1, "考试时长至少为 1 分钟"),
        startTime: z.coerce.date(),
        totalScore: z.number().default(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 1. 拆分数据：将 classIds 和 questions 提取出来
      const { classIds, questions, ...examData } = input;

      // 2. 调用 Service：透传 teacherId, 考试主数据, 班级数组, 以及题目数组
      // 注意：Service 内部会根据 startTime 和 duration 自动处理内容
      return await examService.upsertExam(
        ctx.user.id,
        examData,
        classIds,
        questions
      );
    }),

  // 删除考试
  delete: teacherProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await examService.deleteExam(input.id);
    }),

  // 学生提交考试
  submit: studentProcedure
    .input(
      z.object({
        examId: z.number(),
        answers: z.array(
          z.object({
            questionId: z.number(),
            content: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await examService.submitExam(ctx.user.id, input);
    }),

  // 获取学生考试提交状态
  getHistory: studentProcedure
    .input(z.object({ examId: z.number() }))
    .query(async ({ ctx, input }) => {
      return await examService.getExamSubmissionStatus(
        ctx.user.id,
        input.examId
      );
    }),

  // 获取考试统计数据（仅教师）
  getStats: teacherProcedure
    .input(z.object({ examId: z.number() }))
    .query(async ({ input }) => {
      return await examService.getExamStats(input.examId);
    }),

  // 获取考试提交详情（仅教师）
  getSubmissions: teacherProcedure
    .input(z.object({ examId: z.number() }))
    .query(async ({ input }) => {
      return await examService.getExamSubmissions(input.examId);
    }),
  // 获取单个提交的详细内容（仅教师）
  getSubmissionDetail: teacherProcedure
    .input(z.object({ submissionId: z.number() }))
    .query(async ({ input }) => {
      return await examService.getExamSubmissionDetail(input.submissionId);
    }),
});
