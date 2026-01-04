// server/routers/submissions.ts
import { router, studentProcedure, teacherProcedure } from "../_core/trpc";
import { z } from "zod";
import * as submissionService from "../services/submission.service";

export const submissionRouter = router({
  /**
   * 学生提交作业接口
   */
  submit: studentProcedure
    .input(
      z.object({
        assignmentId: z.number(),
        answers: z.array(
          z.object({
            questionId: z.number(),
            content: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 调用你刚才写的 Service 逻辑
      // ctx.user.id 是从中间件获取的当前登录学生 ID
      return await submissionService.submitAssignment(ctx.user.id, input);
    }),

  /**
   * 获取特定作业的提交记录
   * 用于前端判断“已完成”状态和显示客观题分数
   */
  getHistory: studentProcedure
    .input(z.object({ assignmentId: z.number() }))
    .query(async ({ ctx, input }) => {
      return await submissionService.getSubmissionStatus(
        ctx.user.id,
        input.assignmentId
      );
    }),

  /**
   * 教师端：获取特定作业的提交统计数据
   * 用于详情页看板显示：已提交、待批改、总人数等
   */
  getAssignmentStats: teacherProcedure
    .input(z.object({ assignmentId: z.number() }))
    .query(async ({ input }) => {
      return await submissionService.getAssignmentStats(input.assignmentId);
    }),

  // 教师获取提交名单
  getAssignmentSubmissions: teacherProcedure
    .input(z.object({ assignmentId: z.number() }))
    .query(async ({ input }) => {
      return await submissionService.getAssignmentSubmissions(
        input.assignmentId
      );
    }),

  // 获取答卷详情
  getDetail: teacherProcedure
    .input(z.object({ submissionId: z.number() }))
    .query(async ({ input }) => {
      return await submissionService.getSubmissionDetailForGrading(
        input.submissionId
      );
    }),

  // 保存评分结果
  saveGrades: teacherProcedure
    .input(
      z.object({
        submissionId: z.number(),
        grades: z.array(
          z.object({
            detailId: z.number(),
            score: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      return await submissionService.updateGrades(
        input.submissionId,
        input.grades
      );
    }),
});
