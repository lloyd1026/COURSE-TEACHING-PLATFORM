import { router, protectedProcedure, teacherProcedure, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import * as examService from "../services/exam.service";

export const examRouter = router({
  // 获取考试列表（根据角色分流）
  list: protectedProcedure
    .input(z.object({ search: z.string().optional() }).optional())
    .query(async ({ ctx }) => {
      if (ctx.user.role === "admin") return await examService.getExamsForAdmin();
      if (ctx.user.role === "teacher") return await examService.getExamsByTeacher(ctx.user.id);
      if (ctx.user.role === "student") return await examService.getExamsByStudent(ctx.user.id);
      return [];
    }),

  // 获取单场考试详情
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await examService.getExamById(input.id);
    }),

  // 创建/更新考试
  upsert: teacherProcedure
    .input(z.object({
      id: z.number().optional(),
      courseId: z.number(),
      classIds: z.array(z.number()),
      title: z.string().min(1),
      description: z.string().optional(),
      duration: z.number().min(1),
      startTime: z.coerce.date(), // 自动转换日期格式
      totalScore: z.number().default(100),
    }))
    .mutation(async ({ ctx, input }) => {
      const endTime = new Date(input.startTime.getTime() + input.duration * 60 * 1000);
      const { classIds, ...examData } = input;
      return await examService.upsertExam(ctx.user.id, { ...examData, endTime }, classIds);
    }),

  // 删除考试
  delete: teacherProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await examService.deleteExam(input.id);
    }),
});