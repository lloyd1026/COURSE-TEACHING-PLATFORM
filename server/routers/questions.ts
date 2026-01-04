import { z } from "zod";
import { router, protectedProcedure, teacherProcedure } from "../_core/trpc";
import * as db from "../services/question.service"; // 确保指向你刚才保存的 Service 文件

export const questionsRouter = router({
  /**
   * 1. 列表查询
   * 支持按课程筛选和关键词搜索
   */
  list: protectedProcedure
    .input(
      z.object({
        courseId: z.number().optional(),
        search: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      // 教师默认只看自己出的题
      return await db.getQuestionsByTeacher(ctx.user.id, {
        courseId: input?.courseId,
        search: input?.search,
      });
    }),

  /**
   * 2. 详情获取 (核心修复点)
   * 之前这里误用了 getAssignmentById，现在改为 getQuestionById
   */
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const data = await db.getQuestionById(input.id);
      if (!data) {
        throw new Error("该题目记录不存在或已被移除");
      }
      console.log("获取题目详情：", data);
      return data;
    }),

  /**
   * 3. 核心保存接口 (新增或更新)
   * 严格校验输入，确保数据完整性
   */
  upsert: teacherProcedure
    .input(
      z.object({
        id: z.number().optional(),
        title: z.string().min(1, "题目简称不能为空"),
        content: z.string().min(1, "题干正文不能为空"),
        type: z.enum([
          "single_choice",
          "multiple_choice",
          "fill_blank",
          "true_false",
          "essay",
          "programming",
        ]),
        difficulty: z.enum(["easy", "medium", "hard"]),
        answer: z.string().min(1, "正确答案不能为空"),
        analysis: z.string().optional(),
        courseId: z.number().min(1, "请选择所属课程"),
        options: z.any().optional().nullable(), // 接收前端传来的选项数组/对象
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await db.upsertQuestion(ctx.user.id, input);
    }),

  /**
   * 4. 批量删除
   * 内部包含 Service 层的引用检查逻辑
   */
  delete: teacherProcedure
    .input(
      z.object({
        ids: z.array(z.number()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await db.deleteQuestionsBulk(input.ids, ctx.user.id);
    }),

  /**
   * 5. 批量导入题目
   * 优化了 input 的校验逻辑
   */
  import: teacherProcedure
    .input(
      z.object({
        questions: z.array(
          z.object({
            type: z.string(),
            courseId: z.number(),
            content: z.string(),
            title: z.string().optional(),
            options: z.any().optional(),
            answer: z.string(),
            analysis: z.string().optional(),
            difficulty: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await db.importQuestionsBulk(ctx.user.id, input.questions);
    }),
});