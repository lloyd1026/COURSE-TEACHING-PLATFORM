import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import * as db from "./db";
import { invokeLLM } from "./_core/llm";
import * as auth from "./auth";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    register: publicProcedure
      .input(
        z.object({
          username: z.string().min(3).max(50),
          password: z.string().min(6),
          name: z.string(),
          email: z.string().email().optional(),
          role: z.enum(["teacher", "student"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        // 检查用户名是否已存在
        const existing = await auth.getUserByUsername(input.username);
        if (existing) {
          throw new Error("用户名已存在");
        }

        // 如果提供了邮箱,检查邮箱是否已存在
        if (input.email) {
          const existingEmail = await auth.getUserByEmail(input.email);
          if (existingEmail) {
            throw new Error("邮箱已被使用");
          }
        }

        // 创建用户
        await auth.createUser({
          username: input.username,
          password: input.password,
          name: input.name,
          email: input.email,
          role: input.role || "student",
        });

        return { success: true };
      }),

    login: publicProcedure
      .input(
        z.object({
          username: z.string(),
          password: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // 验证用户
        const user = await auth.authenticateUser(
          input.username,
          input.password
        );
        if (!user) {
          throw new Error("用户名或密码错误");
        }

        // 生成session token
        // const openId = user.username || `user-${user.id}`;
        const token = await sdk.signSession(
          {
            id: user.id,
            // openId: user.username || `user-${user.id}`,
            appId: ENV.appId,
            name: user.name || user.username,
          },
          {
            expiresInMs: 365 * 24 * 60 * 60 * 1000,
          }
        );

        // 设置 cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, cookieOptions);

        return {
          success: true,
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        };
      }),
  }),

  // ==================== 统计数据 ====================
  stats: router({
    overview: protectedProcedure.query(async () => {
      return await db.getStatistics();
    }),
  }),

  // ==================== 用户管理 ====================
  users: router({
    list: protectedProcedure
      .input(z.object({ search: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return await db.getAllUsers(input?.search);
      }),

    // 批量创建学生
    createStudentsBatch: protectedProcedure
      .input(
        z.object({
          students: z.array(
            z.object({
              username: z.string(),
              password: z.string(),
              name: z.string(),
              studentId: z.string().optional(),
              email: z.string().optional(),
            })
          ),
          classId: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const results = await auth.createStudentsBatch(input.students);
        return results;
      }),

    // 修改密码
    changePassword: protectedProcedure
      .input(
        z.object({
          oldPassword: z.string(),
          newPassword: z.string().min(6),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("未登录");
        return await auth.changePassword(
          ctx.user.id,
          input.oldPassword,
          input.newPassword
        );
      }),

    // 更新个人信息
    updateProfile: protectedProcedure
      .input(
        z.object({
          name: z.string().optional(),
          email: z.string().email().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("未登录");
        return await auth.updateUserProfile(ctx.user.id, input);
      }),
  }),

  // ==================== 课程管理 ====================
  courses: router({
    list: protectedProcedure
      .input(z.object({ search: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return await db.getAllCourses(input?.search);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getCourseById(input.id);
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          code: z.string(),
          description: z.string(),
          semester: z.string(),
          credits: z.number(),
          teacherId: z.number(),
          status: z.enum(["draft", "active", "archived"]).default("draft"),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createCourse(input);
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          status: z.enum(["draft", "active", "archived"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateCourse(id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteCourse(input.id);
      }),
  }),

  // ==================== 班级管理 ====================
  classes: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllClasses();
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getClassById(input.id);
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          grade: z.number().optional(),
          major: z.string().optional(),
          headTeacherId: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createClass(input);
      }),
  }),

  // ==================== 作业管理 ====================
  assignments: router({
    list: protectedProcedure
      .input(z.object({ courseId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return await db.getAllAssignments(input?.courseId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getAssignmentById(input.id);
      }),

    create: protectedProcedure
      .input(
        z.object({
          title: z.string(),
          description: z.string().optional(),
          courseId: z.number(),
          classId: z.number(),
          dueDate: z.date(),
          createdBy: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createAssignment({
          ...input,
          status: "published",
        });
      }),
  }),

  // ==================== 题库管理 ====================
  questions: router({
    list: protectedProcedure
      .input(z.object({ courseId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return await db.getAllQuestions(input?.courseId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getQuestionById(input.id);
      }),

    create: protectedProcedure
      .input(
        z.object({
          questionTypeId: z.number(),
          courseId: z.number(),
          title: z.string(),
          content: z.string().optional(),
          options: z.any().optional(),
          answer: z.string().optional(),
          analysis: z.string().optional(),
          difficulty: z.enum(["easy", "medium", "hard"]),
          createdBy: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createQuestion(input);
      }),
  }),

  // ==================== 考试管理 ====================
  exams: router({
    list: protectedProcedure
      .input(z.object({ courseId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return await db.getAllExams(input?.courseId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getExamById(input.id);
      }),

    create: protectedProcedure
      .input(
        z.object({
          title: z.string(),
          description: z.string().optional(),
          courseId: z.number(),
          classId: z.number(),
          duration: z.number(),
          startTime: z.date(),
          endTime: z.date(),
          totalScore: z.number().optional(),
          createdBy: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createExam({
          ...input,
          status: "not_started",
        });
      }),
  }),

  // ==================== 知识图谱 ====================
  knowledge: router({
    chapters: protectedProcedure
      .input(z.object({ courseId: z.number() }))
      .query(async ({ input }) => {
        return await db.getChaptersByCourseId(input.courseId);
      }),

    points: protectedProcedure
      .input(z.object({ chapterId: z.number() }))
      .query(async ({ input }) => {
        return await db.getKnowledgePointsByChapterId(input.chapterId);
      }),
  }),

  // ==================== 实验管理 ====================
  experiments: router({
    list: protectedProcedure
      .input(z.object({ courseId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return await db.getAllExperiments(input?.courseId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getExperimentById(input.id);
      }),

    create: protectedProcedure
      .input(
        z.object({
          title: z.string(),
          description: z.string().optional(),
          courseId: z.number(),
          classId: z.number(),
          dueDate: z.date(),
          createdBy: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createExperiment({
          ...input,
          status: "draft",
        });
      }),
  }),

  // ==================== AI助教 ====================
  ai: router({
    chat: protectedProcedure
      .input(
        z.object({
          message: z.string(),
          conversationId: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "你是一个专业的教学助手,帮助学生理解课程内容和解答问题。请用简洁清晰的语言回答。",
            },
            {
              role: "user",
              content: input.message,
            },
          ],
        });

        const reply =
          response.choices[0]?.message?.content || "抱歉,我无法回答这个问题。";

        return {
          reply,
          conversationId: input.conversationId || `conv-${Date.now()}`,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
