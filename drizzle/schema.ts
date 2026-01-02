import { relations } from "drizzle-orm";
import { boolean, decimal, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * 用户表 - 支持三种角色: admin, teacher, student
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(),
  username: varchar("username", { length: 50 }).unique(),
  password: varchar("password", { length: 255 }),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["admin", "teacher", "student"]).default("student").notNull(),
  avatar: text("avatar"),  // 减少访问
  phone: varchar("phone", { length: 20 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/**
 * 教师表 - 扩展教师信息
 */
export const teachers = mysqlTable("teachers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  department: varchar("department", { length: 100 }),
  title: varchar("title", { length: 50 }),
  bio: text("bio"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * 学生表 - 扩展学生信息
 */
export const students = mysqlTable("students", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  studentId: varchar("studentId", { length: 50 }).notNull().unique(),
  classId: int("classId"),
  major: varchar("major", { length: 100 }),
  enrollmentYear: int("enrollmentYear"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * 班级表
 */
export const classes = mysqlTable("classes", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  grade: int("grade"),
  major: varchar("major", { length: 100 }),
  headTeacherId: int("headTeacherId"),
  studentCount: int("studentCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * 课程表
 */
export const courses = mysqlTable("courses", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  description: text("description"),
  teacherId: int("teacherId").notNull(),
  // syllabus: text("syllabus"),
  semester: varchar("semester", { length: 20 }).notNull(),
  credits: int("credits"),
  status: mysqlEnum("status", ["draft", "active", "archived"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * 课程班级关联表
 */
export const courseClasses = mysqlTable("courseClasses", {
  id: int("id").autoincrement().primaryKey(),
  courseId: int("courseId").notNull(),
  classId: int("classId").notNull(),
  semester: varchar("semester", { length: 20 }),
  year: int("year"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * 章节表
 */
export const chapters = mysqlTable("chapters", {
  id: int("id").autoincrement().primaryKey(),
  courseId: int("courseId").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  chapterOrder: int("chapterOrder"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * 知识点表
 */
export const knowledgePoints = mysqlTable("knowledgePoints", {
  id: int("id").autoincrement().primaryKey(),
  courseId: int("courseId").notNull(),
  chapterId: int("chapterId"),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  kpOrder: int("kpOrder"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * 作业表
 */
export const assignments = mysqlTable("assignments", {
  id: int("id").autoincrement().primaryKey(),
  courseId: int("courseId").notNull(),
  classId: int("classId").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  requirements: text("requirements"),
  dueDate: timestamp("dueDate").notNull(),
  createdBy: int("createdBy").notNull(),
  status: mysqlEnum("status", ["draft", "published", "closed"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * 作业提交表
 */
export const assignmentSubmissions = mysqlTable("assignmentSubmissions", {
  id: int("id").autoincrement().primaryKey(),
  assignmentId: int("assignmentId").notNull(),
  studentId: int("studentId").notNull(),
  content: text("content"),
  fileUrl: text("fileUrl"),
  submittedAt: timestamp("submittedAt"),
  score: decimal("score", { precision: 5, scale: 2 }),
  feedback: text("feedback"),
  gradedAt: timestamp("gradedAt"),
  gradedBy: int("gradedBy"),
  status: mysqlEnum("status", ["not_submitted", "submitted", "graded"]).default("not_submitted").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * 题库表
 */
export const questions = mysqlTable("questions", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["single_choice", "multiple_choice", "fill_blank", "true_false", "essay", "programming"]).notNull(),
  courseId: int("courseId").notNull(),
  title: text("title").notNull(),
  content: text("content"),
  options: json("options"),
  answer: text("answer"),
  analysis: text("analysis"),
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]).default("medium").notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * 考试表
 */
export const exams = mysqlTable("exams", {
  id: int("id").autoincrement().primaryKey(),
  courseId: int("courseId").notNull(),
  classId: int("classId").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  duration: int("duration").notNull(),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime").notNull(),
  status: mysqlEnum("status", ["not_started", "in_progress", "ended"]).default("not_started").notNull(),
  totalScore: int("totalScore").default(100),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * 考试题目关联表
 */
export const examQuestions = mysqlTable("examQuestions", {
  id: int("id").autoincrement().primaryKey(),
  examId: int("examId").notNull(),
  questionId: int("questionId").notNull(),
  score: int("score").default(1),
  questionOrder: int("questionOrder"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * 考试答卷表
 */
export const examAnswers = mysqlTable("examAnswers", {
  id: int("id").autoincrement().primaryKey(),
  examId: int("examId").notNull(),
  studentId: int("studentId").notNull(),
  submittedAt: timestamp("submittedAt"),
  score: decimal("score", { precision: 5, scale: 2 }),
  status: mysqlEnum("status", ["in_progress", "submitted", "graded"]).default("in_progress").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * 考试答题详情表
 */
export const examAnswerDetails = mysqlTable("examAnswerDetails", {
  id: int("id").autoincrement().primaryKey(),
  examAnswerId: int("examAnswerId").notNull(),
  questionId: int("questionId").notNull(),
  studentAnswer: text("studentAnswer"),
  isCorrect: boolean("isCorrect"),
  score: decimal("score", { precision: 5, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * 实验表
 */
export const experiments = mysqlTable("experiments", {
  id: int("id").autoincrement().primaryKey(),
  courseId: int("courseId").notNull(),
  classId: int("classId").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  requirements: text("requirements"),
  dueDate: timestamp("dueDate").notNull(),
  createdBy: int("createdBy").notNull(),
  status: mysqlEnum("status", ["draft", "published", "closed"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * 实验提交表
 */
export const experimentSubmissions = mysqlTable("experimentSubmissions", {
  id: int("id").autoincrement().primaryKey(),
  experimentId: int("experimentId").notNull(),
  studentId: int("studentId").notNull(),
  code: text("code"),
  submittedAt: timestamp("submittedAt"),
  status: mysqlEnum("status", ["submitted", "evaluated"]).default("submitted").notNull(),
  evaluationResult: json("evaluationResult"),
  score: decimal("score", { precision: 5, scale: 2 }),
  feedback: text("feedback"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * 知识点关联表
 */
export const knowledgePointRelations = mysqlTable("knowledgePointRelations", {
  id: int("id").autoincrement().primaryKey(),
  assignmentId: int("assignmentId"),
  examId: int("examId"),
  experimentId: int("experimentId"),
  questionId: int("questionId"),
  knowledgePointId: int("knowledgePointId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * AI会话表
 */
export const aiConversations = mysqlTable("aiConversations", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull(),
  assignmentId: int("assignmentId"),
  questionId: int("questionId"),
  title: varchar("title", { length: 200 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * AI消息表
 */
export const aiMessages = mysqlTable("aiMessages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// 类型导出
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Teacher = typeof teachers.$inferSelect;
export type Student = typeof students.$inferSelect;
export type Class = typeof classes.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type AssignmentSubmission = typeof assignmentSubmissions.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type Exam = typeof exams.$inferSelect;
export type ExamAnswer = typeof examAnswers.$inferSelect;
export type Experiment = typeof experiments.$inferSelect;
export type ExperimentSubmission = typeof experimentSubmissions.$inferSelect;
export type KnowledgePoint = typeof knowledgePoints.$inferSelect;
export type Chapter = typeof chapters.$inferSelect;
export type AiConversation = typeof aiConversations.$inferSelect;
export type AiMessage = typeof aiMessages.$inferSelect;
