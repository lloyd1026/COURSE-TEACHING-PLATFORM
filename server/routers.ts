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

  // ==================== 认证相关 ====================
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
        // 1. 管理员：看全部
        if (ctx.user.role === "admin") {
          return await db.getAllCourses(input?.search);
        }

        // 2. 教师：看自己教的课
        if (ctx.user.role === "teacher") {
          return await db.getCoursesByTeacher(ctx.user.id, input?.search);
        }

        // 3. 学生：看自己班级的课
        if (ctx.user.role === "student") {
          return await db.getCoursesByStudentId(ctx.user.id, input?.search);
        }

        return [];
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
        z
          .object({
            courseId: z.number().optional(),
            teacherId: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ ctx, input }) => {
        // 1. 如果是学生，直接调用连表查询
        if (ctx.user.role === "student") {
          return await db.getAssignmentsByStudentId(
            ctx.user.id,
            input?.courseId
          );
        }

        // 2. 如果是教师/管理员，调用你之前的老方法
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
    list: protectedProcedure
      .input(
        z
          .object({
            courseId: z.number().optional(),
            search: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ ctx, input }) => {
        const { role, id: userId } = ctx.user;
        const filters = input || {};

        switch (role) {
          case "teacher":
            return await db.getQuestionsByTeacher(userId, filters);

          case "admin":
            return await db.getQuestionsForAdmin(filters);

          // case "student":
          //   return await db.getQuestionsByStudent(userId, filters.courseId);

          default:
            throw new Error("未知的用户角色");
        }
      }),

    // --- 统一 Upsert (创建或更新) ---
    upsert: teacherProcedure
      .input(
        z.object({
          id: z.number().optional(), // 有 ID 则更新，无 ID 则创建
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
          options: z.any().optional(), // 接收数组，后端自动 JSON 序列化
          answer: z.string().optional(),
          analysis: z.string().optional(),
          difficulty: z.enum(["easy", "medium", "hard"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await db.upsertQuestion(ctx.user.id, input);
      }),

    // --- 批量安全删除 ---
    // 逻辑：检查引用，有关联则归档，无关联则彻底删除
    deleteBulk: teacherProcedure
      .input(z.object({ ids: z.array(z.number()) }))
      .mutation(async ({ ctx, input }) => {
        return await db.deleteQuestionsBulk(input.ids, ctx.user.id);
      }),

    // --- 批量安全删除 ---
    import: teacherProcedure
      .input(
        z.object({
          questions: z.array(
            z.object({
              type: z.string(),
              courseId: z.number(),
              content: z.string(),
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
  }),

  // ==================== 考试管理 ====================
  exams: router({
    list: protectedProcedure
      .input(z.object({ search: z.string().optional() }).optional())
      .query(async ({ ctx }) => {
        if (ctx.user.role === "admin") {
          return await db.getExamsForAdmin();
        }
        if (ctx.user.role === "teacher") {
          return await db.getExamsByTeacher(ctx.user.id);
        }
        if (ctx.user.role === "student") {
          return await db.getExamsByStudent(ctx.user.id);
        }
        return [];
      }),

    // 2. 获取单场考试详情 (用于编辑回填)
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getExamById(input.id);
      }),

    // 3. 核心：创建与更新合一 (Upsert)
    // 教师视角：支持同时分发给多个班级
    upsert: teacherProcedure
      .input(
        z.object({
          id: z.number().optional(),
          courseId: z.number(),
          classIds: z.array(z.number()), // 接收班级 ID 数组
          title: z.string().min(1, "标题不能为空"),
          description: z.string().optional(),
          duration: z.number().min(1, "时长需大于0"),
          startTime: z.date(),
          totalScore: z.number().default(100),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // 自动计算结束时间
        const endTime = new Date(
          input.startTime.getTime() + input.duration * 60 * 1000
        );

        const { classIds, ...examData } = input;

        return await db.upsertExam(
          ctx.user.id,
          { ...examData, endTime },
          classIds
        );
      }),

    // 4. 删除考试
    // 依靠数据库 onDelete: "cascade" 自动清理关联的 exam_classes
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteExam(input.id);
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
    // 1. 获取会话列表
    listConversations: protectedProcedure.query(async ({ ctx }) => {
      return await db.getAIConversationsByStudent(ctx.user.id);
    }),

    // 2. 获取特定会话的消息详情
    getMessages: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ input }) => {
        return await db.getAIMessagesByConversation(input.conversationId);
      }),

    // 3. 智能对话接口 (增强持久化逻辑)
    chat: protectedProcedure
      .input(
        z.object({
          message: z.string(),
          conversationId: z.number().optional(),
          assignmentId: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        let currentId = input.conversationId;

        // 如果没有会话ID，则视为新开启的对话，创建会话记录
        if (!currentId) {
          const [newConv] = await db.createAIConversation({
            studentId: ctx.user.id,
            assignmentId: input.assignmentId,
            title: input.message.slice(0, 30), // 取首句前30字作为标题
          });
          currentId = newConv.id;
        }

        // 获取历史上下文 (最近 10 条消息) 供 AI 参考
        const history = await db.getAIMessagesByConversation(currentId, 10);
        const contextMessages = history.map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

        // 调用适配了硅基流动的 invokeLLM
        const response = await invokeLLM({
          messages: [
            ...contextMessages,
            { role: "user", content: input.message },
          ],
        });

        const reply =
          response.choices[0]?.message?.content ||
          "抱歉，我目前无法处理这个请求。";

        // 持久化：存入数据库
        await db.saveAIMessage(currentId, "user", input.message);
        await db.saveAIMessage(currentId, "assistant", reply);

        return {
          reply,
          conversationId: currentId,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
