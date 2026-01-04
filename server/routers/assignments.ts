import { router, protectedProcedure, teacherProcedure } from "../_core/trpc";
import { z } from "zod";
import * as assignmentService from "../services/assignment.service";

export const assignmentRouter = router({
  // 获取作业列表
  list: protectedProcedure
    .input(z.object({ courseId: z.number().optional(), teacherId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      if (ctx.user.role === "student") {
        return await assignmentService.getAssignmentsByStudent(ctx.user.id, input?.courseId);
      }
      const targetId = input?.teacherId ?? ctx.user.id;
      return await assignmentService.getAssignmentsByTeacher(targetId, input?.courseId);
    }),

  // 获取作业详情
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const data = await assignmentService.getAssignmentById(input.id);
      if (!data) throw new Error("该作业记录不存在");
      return data;
    }),

  // 创建/更新作业
  upsert: teacherProcedure
    .input(z.object({
      id: z.number().optional(),
      title: z.string().min(1, "作业标题不能为空"),
      description: z.string().optional(),
      requirements: z.string().optional(),
      courseId: z.number(),
      classIds: z.array(z.number()).min(1, "请至少选择一个分发班级"),
      selectedQuestions: z.array(z.object({
        questionId: z.number(),
        score: z.number(),
        order: z.number().optional(),
      })).default([]),
      dueDate: z.coerce.date(),
      status: z.enum(["draft", "published", "closed"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const { classIds, selectedQuestions, ...data } = input;
      return await assignmentService.upsertAssignment(
        ctx.user.id,
        data,
        classIds,
        selectedQuestions
      );
    }),

  // 删除作业
  delete: teacherProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await assignmentService.deleteAssignment(input.id);
    }),
});