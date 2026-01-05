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
import { getAssignmentById } from "./services/assignment.service";
import { invokeLLM } from "./_core/llm";
import * as auth from "./auth";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import * as path from 'path';
import * as os from 'os';
import { promisify } from 'util';

const execAsync = promisify(exec);

// 分割路由导入
import { submissionRouter } from "./routers/submissions";

// 考试路由
import { examRouter } from "./routers/exams";
import { assignmentRouter } from "./routers/assignments";

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

    // Admin: Create User
    create: adminProcedure
      .input(
        z.object({
          username: z.string().min(3),
          password: z.string().min(6),
          name: z.string(),
          role: z.enum(["admin", "teacher", "student"]),
          email: z.string().email().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await auth.createUser(input);
      }),

    // Admin: Delete User
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteUser(input.id);
      }),

    // Admin: Reset Password
    adminResetPassword: adminProcedure
      .input(
        z.object({
          userId: z.number(),
          newPassword: z.string().min(6),
        })
      )
      .mutation(async ({ input }) => {
        const hashedPassword = auth.hashPassword(input.newPassword);
        return await db.adminResetPassword(input.userId, hashedPassword);
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
  assignments: assignmentRouter,

  // ==================== 题库管理 ====================
  questions: router({
    /**
     * 列表查询：角色分流
     * 教师端现在会额外返回 questionCount 和 totalScore
     */
    list: protectedProcedure
      .input(
        z
          .object({
            courseId: z.number().optional(),
            search: z.string().optional(),
          })
          .optional()
      ) // 让 input 可选
      .query(async ({ ctx, input }) => {
        return await db.getQuestionsByTeacher(ctx.user.id, {
          courseId: input?.courseId,
          search: input?.search,
        });
      }),

    /**
     * 详情获取：
     * 返回值现在包含 classIds 数组和 questions 对象数组
     */
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const data = await getAssignmentById(input.id);
        if (!data) throw new Error("该作业记录不存在");
        return data;
      }),

    /**
     * 核心保存接口：新增或更新
     * 增加 selectedQuestions 校验
     */
    upsert: teacherProcedure
      .input(
        z.object({
          id: z.number().optional(),
          title: z.string().min(1, "题目简称不能为空"),
          content: z.string().min(1, "题干正文不能为空"),
          type: z.enum(["single_choice", "multiple_choice", "fill_blank", "true_false", "essay", "programming"]),
          difficulty: z.enum(["easy", "medium", "hard"]),
          answer: z.string().min(1, "正确答案不能为空"),
          analysis: z.string().optional(),
          courseId: z.number().min(1, "请选择所属课程"),
          options: z.any().optional().nullable(), // 这里接收选项数组
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await db.upsertQuestion(ctx.user.id, input);
      }),

    /**
     * 删除作业
     */
    delete: teacherProcedure
      .input(
        z.object({
          ids: z.array(z.number()),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // 这里的逻辑会去 DB 层执行引用检查
        return await db.deleteQuestionsBulk(input.ids, ctx.user.id);
      }),
  }),

  // ==================== 考试管理 ====================
  exams: examRouter,

  // ==================== 作业提交 ====================
  submissions: submissionRouter,

  // ==================== 知识图谱 ====================
  knowledge: router({
    // 获取课程章节列表
    chapters: protectedProcedure
      .input(z.object({ courseId: z.number() }))
      .query(async ({ input }) => {
        return await db.getChaptersByCourseId(input.courseId);
      }),

    // 创建章节
    createChapter: teacherProcedure
      .input(
        z.object({
          courseId: z.number(),
          title: z.string().min(1, "章节标题不能为空"),
          description: z.string().optional(),
          chapterOrder: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createChapter(input);
      }),

    // 更新章节
    updateChapter: teacherProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().optional(),
          description: z.string().optional(),
          chapterOrder: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateChapter(id, data);
      }),

    // 删除章节
    deleteChapter: teacherProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteChapter(input.id);
      }),

    // 获取章节下的知识点
    points: protectedProcedure
      .input(z.object({ chapterId: z.number() }))
      .query(async ({ input }) => {
        return await db.getKnowledgePointsByChapterId(input.chapterId);
      }),

    // 获取课程所有知识点（带章节信息）
    pointsByCourse: protectedProcedure
      .input(z.object({ courseId: z.number() }))
      .query(async ({ input }) => {
        return await db.getKnowledgePointsByCourseId(input.courseId);
      }),

    // 创建知识点
    createPoint: teacherProcedure
      .input(
        z.object({
          courseId: z.number(),
          chapterId: z.number().optional(),
          name: z.string().min(1, "知识点名称不能为空"),
          description: z.string().optional(),
          kpOrder: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createKnowledgePoint(input);
      }),

    // 更新知识点
    updatePoint: teacherProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          kpOrder: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateKnowledgePoint(id, data);
      }),

    // 删除知识点
    deletePoint: teacherProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteKnowledgePoint(input.id);
      }),

    // 搜索知识点
    searchPoints: protectedProcedure
      .input(z.object({ courseId: z.number(), query: z.string() }))
      .query(async ({ input }) => {
        return await db.searchKnowledgePoints(input.courseId, input.query);
      }),

    // 关联知识点到实体
    linkPoint: teacherProcedure
      .input(
        z.object({
          knowledgePointId: z.number(),
          assignmentId: z.number().optional(),
          examId: z.number().optional(),
          experimentId: z.number().optional(),
          questionId: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.linkKnowledgePoint(input);
      }),

    // 取消关联
    unlinkPoint: teacherProcedure
      .input(z.object({ relationId: z.number() }))
      .mutation(async ({ input }) => {
        return await db.unlinkKnowledgePoint(input.relationId);
      }),

    // 获取实体关联的知识点
    getLinkedPoints: protectedProcedure
      .input(
        z.object({
          entityType: z.enum(["assignment", "exam", "experiment", "question"]),
          entityId: z.number(),
        })
      )
      .query(async ({ input }) => {
        return await db.getKnowledgePointsByEntity(input.entityType, input.entityId);
      }),
  }),

  // ==================== 实验管理 ====================
  experiments: router({
    // 获取实验列表
    list: protectedProcedure
      .input(z.object({ courseId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return await db.getAllExperiments(input?.courseId);
      }),

    // 学生获取实验列表（包含提交状态）
    listWithStatus: protectedProcedure
      .input(z.object({ courseId: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const experiments = await db.getExperimentsByStudent(ctx.user.id, input?.courseId);

        // Get student record
        const dbInstance = await db.getDb();
        if (!dbInstance) return experiments.map((e: any) => ({ ...e, submissionStatus: null }));

        const { students, experimentSubmissions } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");

        const studentResult = await dbInstance
          .select({ id: students.id })
          .from(students)
          .where(eq(students.userId, ctx.user.id))
          .limit(1);

        if (!studentResult[0]) {
          return experiments.map((e: any) => ({ ...e, submissionStatus: null, submissionScore: null }));
        }

        const studentId = studentResult[0].id;

        // Get all submissions for this student
        const submissions = await dbInstance
          .select()
          .from(experimentSubmissions)
          .where(eq(experimentSubmissions.studentId, studentId));

        // Map submissions to experiments
        const submissionMap = new Map(submissions.map(s => [s.experimentId, s]));

        return experiments.map((e: any) => {
          const sub = submissionMap.get(e.id);
          return {
            ...e,
            submissionStatus: sub?.status || null,
            submissionScore: sub?.score || null,
            evaluationResult: sub?.evaluationResult || null,
          };
        });
      }),

    // 获取实验详情
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getExperimentById(input.id);
      }),

    // 创建实验
    create: teacherProcedure
      .input(
        z.object({
          title: z.string().min(1, "实验标题不能为空"),
          description: z.string().optional(),
          requirements: z.string().optional(),
          courseId: z.number(),
          classId: z.number(),
          dueDate: z.date(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await db.createExperiment({
          ...input,
          createdBy: ctx.user.id,
          status: "draft",
        });
      }),

    // 更新实验
    update: teacherProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().optional(),
          description: z.string().optional(),
          requirements: z.string().optional(),
          dueDate: z.date().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateExperiment(id, data);
      }),

    // 删除实验
    delete: teacherProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteExperiment(input.id);
      }),

    // 发布实验
    publish: teacherProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.publishExperiment(input.id);
      }),

    // 关闭实验
    close: teacherProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.closeExperiment(input.id);
      }),

    // 保存草稿 (Save Draft)
    saveDraft: protectedProcedure
      .input(
        z.object({
          experimentId: z.number(),
          code: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // 1. Get Student ID
        const studentRecord = await db.getDb().then(async (database) => {
          if (!database) throw new Error("Database not available");
          const { students } = await import("../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          const result = await database
            .select({ id: students.id })
            .from(students)
            .where(eq(students.userId, ctx.user.id))
            .limit(1);
          return result[0];
        });

        if (!studentRecord) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "学生记录不存在，无法保存草稿",
          });
        }

        // 2. Save as Draft
        const result = await db.submitExperiment({
          experimentId: input.experimentId,
          studentId: studentRecord.id,
          code: input.code,
          status: "draft",
        });

        return { success: true, id: result.id, updated: result.updated };
      }),

    // AI 预检查 (Pre-check)
    check: protectedProcedure
      .input(
        z.object({
          experimentId: z.number(),
          code: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // 1. Fetch Experiment Context
        const experiment = await db.getExperimentById(input.experimentId);
        if (!experiment) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Experiment not found" });
        }

        // 2. Invoke AI
        try {
          const { invokeLLM } = await import("./_core/llm");
          const language = "javascript";

          const prompt = `
Context: You are an expert Computer Science Professor helping a student check their code BEFORE submission.
Experiment Title: ${experiment.title}
Requirement: ${experiment.description || ""} 
${experiment.requirements || ""}

Student Code:
\`\`\`${language}
${input.code}
\`\`\`

Task:
1. Analyze the code for logic errors, potential bugs, and code style.
2. DO NOT give the full solution, but provide HINTS and SUGGESTIONS.
3. Provide a preliminary score estimation (0-100) just for reference.
4. Output JSON ONLY: { "score": number, "feedback": "markdown string (concise hints)", "suggestions": "string" }
`;

          const aiResult = await invokeLLM({
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }
          });

          const content = aiResult.choices[0].message.content;
          if (typeof content === 'string') {
            const parsed = JSON.parse(content);
            return {
              score: parsed.score || 0,
              feedback: parsed.feedback || "No feedback generated",
              suggestions: parsed.suggestions || ""
            };
          }
          throw new Error("Invalid AI response");
        } catch (error) {
          console.error("AI Check failed:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI Check service unavailable" });
        }
      }),

    // 学生提交代码 (Submit & AI Grade)
    submit: protectedProcedure
      .input(
        z.object({
          experimentId: z.number(),
          code: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // 1. Get Student ID
        const studentRecord = await db.getDb().then(async (database) => {
          if (!database) throw new Error("Database not available");
          const { students } = await import("../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          const result = await database
            .select({ id: students.id })
            .from(students)
            .where(eq(students.userId, ctx.user.id))
            .limit(1);
          return result[0];
        });

        if (!studentRecord) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "学生记录不存在",
          });
        }

        // 2. Fetch Experiment Details (for AI Context)
        const experiment = await db.getExperimentById(input.experimentId);
        if (!experiment) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Experiment not found" });
        }

        // 3. Submit Code (Status: submitted)
        const submission = await db.submitExperiment({
          experimentId: input.experimentId,
          studentId: studentRecord.id,
          code: input.code,
          status: "submitted",
        });

        // 4. Async AI Grading
        try {
          const { invokeLLM } = await import("./_core/llm");

          console.log("Analyzing code...");
          const language = "javascript"; // Default or detect

          const prompt = `
Context: You are an expert Computer Science Professor grading a student's code submission.
Experiment Title: ${experiment.title}
Requirement: ${experiment.description || ""} 
${experiment.requirements || ""}

Student Code:
\`\`\`${language}
${input.code}
\`\`\`

Task:
1. Analyze the code for correctness, efficiency, and style.
2. Provide a score (0-100).
3. Provide detailed feedback.
4. Output JSON ONLY: { "score": number, "feedback": "markdown string", "suggestions": "string" }
`;

          const aiResult = await invokeLLM({
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }
          });

          const content = aiResult.choices[0].message.content;
          if (typeof content === 'string') {
            const parsed = JSON.parse(content);

            // Update submission with AI result
            await db.evaluateSubmission(submission.id, {
              score: parsed.score || 0,
              feedback: parsed.feedback || "AI Evaluation Failed",
              evaluationResult: {
                ...parsed,
                aiScore: parsed.score, // Explicitly store for Teacher UI
                status: "evaluated"
              }
            });

            return { ...submission, status: 'evaluated', score: parsed.score, feedback: parsed.feedback };
          }
        } catch (error) {
          console.error("AI Grading process failed:", error);
          // Non-blocking: return submission implies success, but status stays 'submitted'
        }

        return submission;
      }),

    // 运行/调试代码 (Code Runner)
    run: protectedProcedure
      .input(z.object({
        code: z.string(),
        language: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { code, language } = input;

        // Setup temp file
        const tmpDir = os.tmpdir();
        const runId = Math.random().toString(36).substring(7);
        let cmd = '';
        let filePath = '';
        let outPath = '';

        try {
          if (language === 'javascript') {
            filePath = path.join(tmpDir, `${runId}.js`);
            await fs.writeFile(filePath, code);
            cmd = `node "${filePath}"`;
          } else if (language === 'python') {
            filePath = path.join(tmpDir, `${runId}.py`);
            await fs.writeFile(filePath, code);
            cmd = `python3 "${filePath}"`;
          } else if (language === 'cpp' || language === 'c++') {
            filePath = path.join(tmpDir, `${runId}.cpp`);
            outPath = path.join(tmpDir, `${runId}.out`);
            await fs.writeFile(filePath, code);
            // Compile and run
            cmd = `g++ "${filePath}" -o "${outPath}" && "${outPath}"`;
          } else {
            return { output: 'Unsupported language', error: true };
          }

          const { stdout, stderr } = await execAsync(cmd, { timeout: 5000 });
          return { output: stdout || stderr, error: false };

        } catch (error: any) {
          // Exec failed (compile error or runtime error)
          // Error object from exec usually contains stdout/stderr
          const output = error.stderr || error.stdout || error.message || 'Unknown error';
          return { output: output, error: true };
        } finally {
          // Cleanup type: fire and forget
          if (filePath) fs.unlink(filePath).catch(() => { });
          if (outPath) fs.unlink(outPath).catch(() => { });
        }
      }),

    // 获取实验的所有提交
    getSubmissions: teacherProcedure
      .input(z.object({ experimentId: z.number() }))
      .query(async ({ input }) => {
        return await db.getSubmissionsByExperiment(input.experimentId);
      }),

    // 获取班级所有学生的进度 (Grid View)
    getProgress: teacherProcedure
      .input(z.object({ experimentId: z.number() }))
      .query(async ({ input }) => {
        return await db.getExperimentProgress(input.experimentId);
      }),

    // 获取学生的提交记录 (Student Self)
    getMySubmission: protectedProcedure
      .input(z.object({ experimentId: z.number() }))
      .query(async ({ ctx, input }) => {
        // ... (existing logic)
        // 获取学生 ID
        const studentRecord = await db.getDb().then(async (database) => {
          if (!database) return null;
          const { students } = await import("../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          const result = await database
            .select({ id: students.id })
            .from(students)
            .where(eq(students.userId, ctx.user.id))
            .limit(1);
          return result[0];
        });

        if (!studentRecord) return null;

        return await db.getStudentSubmission(input.experimentId, studentRecord.id);
      }),

    // 获取特定学生的提交详情 (Teacher View - for Grading Dialog)
    getStudentSubmission: teacherProcedure
      .input(z.object({
        experimentId: z.number(),
        studentId: z.number() // This is the student.id (not userId)
      }))
      .query(async ({ input }) => {
        return await db.getStudentSubmission(input.experimentId, input.studentId);
      }),

    // 评测提交（模拟评测）
    evaluate: teacherProcedure
      .input(
        z.object({
          submissionId: z.number(),
          score: z.number().min(0).max(100),
          feedback: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        // 1. 获取现有提交以保留 AI 评分数据
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new Error("Database not available");
        const { experimentSubmissions } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");

        const existing = await dbInstance
          .select()
          .from(experimentSubmissions)
          .where(eq(experimentSubmissions.id, input.submissionId))
          .limit(1);

        const currentResult = (existing[0]?.evaluationResult as any) || {};

        // 2. 合并 AI 数据与人工评分数据
        return await db.evaluateSubmission(input.submissionId, {
          score: input.score,
          feedback: input.feedback,
          evaluationResult: {
            ...currentResult, // 保留现有的 AI 字段 (如 aiScore, suggestions)
            status: "graded", // 标记为已评分
            gradedAt: new Date().toISOString(),
            manualScore: input.score,
            manualFeedback: input.feedback,
          },
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

        if (!currentId) throw new Error("Failed to initialize conversation");

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

    // 4. 删除会话
    deleteConversation: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .mutation(async ({ input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new Error("Database not available");

        const { aiConversations, aiMessages } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");

        // Delete messages first (foreign key constraint)
        await dbInstance.delete(aiMessages).where(eq(aiMessages.conversationId, input.conversationId));
        // Delete conversation
        await dbInstance.delete(aiConversations).where(eq(aiConversations.id, input.conversationId));

        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
