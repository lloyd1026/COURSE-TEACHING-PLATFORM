import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import {
  publicProcedure,
  router,
  protectedProcedure,
  teacherProcedure,
  adminProcedure,
} from "./_core/trpc";
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
    // 获取用户列表 管理员权限
    list: adminProcedure
      .input(z.object({ search: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return await db.getAllUsers(input?.search);
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
          email: z.string().email().optional().or(z.literal("")),
          avatar: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return await auth.updateUserProfile(ctx.user.id, input);
      }),
  }),

  // ==================== 课程管理 ====================
  courses: router({
    list: protectedProcedure
      .input(z.object({ search: z.string().optional() }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.role === "admin") {
          return await db.getAllCourses(input?.search);
        }
        return await db.getCoursesByTeacherId(ctx.user.id, input?.search);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getCourseById(input.id);
      }),

    create: teacherProcedure
      .input(
        z.object({
          name: z.string(),
          code: z.string(),
          description: z.string(),
          semester: z.string(),
          credits: z.number(),
          // teacherId: z.number(),  // 使用session中的用户ID，防止其他教师冒用
          status: z.enum(["draft", "active", "archived"]).default("draft"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await db.createCourse({
          ...input,
          teacherId: ctx.user.id,
        });
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          semester: z.string().optional(),
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

    // 获取已关联的班级
    getLinkedClasses: teacherProcedure
      .input(z.object({ courseId: z.number() }))
      .query(async ({ input }) => {
        return await db.getClassesByCourseId(input.courseId);
      }),

    // 关联班级
    linkClass: teacherProcedure
      .input(
        z.object({
          courseId: z.number(),
          classId: z.number(),
          semester: z.string(),
          year: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.linkClassToCourse(
          input.courseId,
          input.classId,
          input.semester,
          input.year
        );
      }),
    // 取消关联班级
    unlinkClass: teacherProcedure
      .input(z.object({ courseId: z.number(), classId: z.number() }))
      .mutation(async ({ input }) => {
        return await db.unlinkClassFromCourse(input.courseId, input.classId);
      }),
  }),

  // ==================== 班级管理 ====================
  classes: router({
    // 获取班级列表 管理员查看所有班级，教师只查看自己负责的班级
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role === "admin") {
        return await db.getAllClasses();
      }
      return await db.getClassesByTeacherId(ctx.user.id);
    }),
    // 获取班级详情
    get: teacherProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getClassById(input.id);
      }),
    // 创建班级
    create: teacherProcedure
      .input(
        z.object({
          name: z.string(),
          grade: z.number().optional(),
          major: z.string().optional(),
          semester: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await db.createClass({
          ...input,
          headTeacherId: ctx.user.id,
        });
      }),
    // 更新班级
    update: teacherProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          grade: z.number().optional(),
          major: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateClass(id, data);
      }),

    // 删除班级
    delete: teacherProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteClass(input.id);
      }),
    // 获取班级学生名单
    getStudents: teacherProcedure
      .input(z.object({ classId: z.number() }))
      .query(async ({ input }) => {
        return await db.getStudentsByClassId(input.classId);
      }),
    // 关联课程列表
    listCourses: teacherProcedure
      .input(z.object({ classId: z.number() }))
      .query(async ({ input }) => {
        return await db.getLinkedCoursesByClassId(input.classId);
      }),
    // 批量创建学生 教师权限
    createStudentsBatch: teacherProcedure
      .input(
        z.object({
          classId: z.number(), // 强制要求传入班级ID，因为这是在班级详情页操作
          students: z.array(
            z.object({
              studentId: z.string(), // 这里的学号同时作为 username
              name: z.string(),
            })
          ),
        })
      )
      .mutation(async ({ input }) => {
        // 调用我们在 db.ts 中重写的那个“既开号又关联班级”的函数
        // 确保你的 db.ts 里的函数名是 upsertStudentsToClass
        const results = await db.upsertStudentsToClass(
          input.classId,
          input.students
        );
        return results;
      }),

    removeStudentsFromClassBatch: teacherProcedure
      .input(
        z.object({
          // 使用 z.array 接收多个学号
          studentIds: z.array(z.string()),
        })
      )
      .mutation(async ({ input }) => {
        // 调用 db 层的批量移除函数
        return await db.removeStudentsFromClassBatch(input.studentIds);
      }),
  }),

  // ==================== 作业管理 ====================
  assignments: router({
    // 获取作业列表, teacher查看自己创建的作业，学生查看自己班级的作业
    list: protectedProcedure
      .input(
      z.object({ 
        courseId: z.number().optional(),
        teacherId: z.number().optional() 
      }).optional()
    )
    .query(async ({ input }) => {
      // 直接解构透传，逻辑完全由 db 层处理
      return await db.getAllAssignments(input?.teacherId, input?.courseId);
    }),
    
    // 获取作业详情
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getAssignmentById(input.id);
      }),
    // 增删改，教师权限
    create: teacherProcedure
      .input(
        z.object({
          title: z.string(),
          description: z.string().optional(),
          courseId: z.number(),
          classId: z.number(),
          dueDate: z.date(),
          status: z.enum(["draft", "published", "closed"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await db.createAssignment({
          ...input,
          status: input.status ?? "published",
          createdBy: ctx.user.id, // 自动使用当前登录教师ID
        });
      }),

    update: teacherProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().optional(),
          description: z.string().optional(),
          courseId: z.number().optional(),
          classId: z.number().optional(),
          dueDate: z.date().optional(),
          status: z.enum(["draft", "published", "closed"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateAssignment(id, data);
      }),

    delete: teacherProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteAssignment(input.id);
      }),
  }),

  // ==================== 题库管理 ====================
  questions: router({
    list: teacherProcedure
      .input(
        z
          .object({
            courseId: z.number().optional(),
            search: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ ctx, input }) => {
        return await db.getQuestionsByTeacherId(
          ctx.user.id,
          input?.courseId,
          input?.search
        );
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getQuestionById(input.id);
      }),

    create: teacherProcedure
      .input(
        z.object({
          type: z.enum([
            "single_choice",
            "multiple_choice",
            "fill_blank",
            "true_false",
            "essay",
            "programming",
          ]),
          courseId: z.number(),
          title: z.string(),
          content: z.string().optional(),
          options: z.any().optional(),
          answer: z.string().optional(),
          analysis: z.string().optional(),
          difficulty: z.enum(["easy", "medium", "hard"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await db.createQuestion({
          ...input,
          createdBy: ctx.user.id, // 自动取当前登录教师的 ID，不再依赖前端传
        });
      }),

    update: teacherProcedure
      .input(
        z.object({
          id: z.number(),
          type: z
            .enum([
              "single_choice",
              "multiple_choice",
              "fill_blank",
              "true_false",
              "essay",
              "programming",
            ])
            .optional(),
          courseId: z.number().optional(),
          title: z.string().optional(),
          content: z.string().optional(),
          options: z.any().optional(),
          answer: z.string().optional(),
          analysis: z.string().optional(),
          difficulty: z.enum(["easy", "medium", "hard"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateQuestion(id, data);
      }),

    delete: teacherProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteQuestion(input.id);
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
