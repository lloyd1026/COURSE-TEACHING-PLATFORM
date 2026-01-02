import { useMemo } from "react";
import { useParams, Link, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  BookOpen,
  Users,
  FileText,
  ClipboardList,
  Loader2,
  Edit3,
  Calendar,
  GraduationCap,
  LayoutDashboard,
  ExternalLink,
  ChevronRight,
  FileCheck,
} from "lucide-react";

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const courseId = parseInt(id || "0");
  const [, setLocation] = useLocation();

  // 1. 数据获取
  const { data: course, isLoading } = trpc.courses.get.useQuery({ id: courseId });
  const { data: assignments } = trpc.assignments.list.useQuery();
  const { data: exams } = trpc.exams.list.useQuery();
  const { data: linkedClasses, isLoading: classesLoading } = trpc.courses.getLinkedClasses.useQuery({ courseId });

  // 2. 数据过滤
  const courseAssignments = useMemo(
    () => assignments?.filter((a: any) => a.courseId === courseId) || [],
    [assignments, courseId]
  );
  const courseExams = useMemo(
    () => exams?.filter((e: any) => e.courseId === courseId) || [],
    [exams, courseId]
  );

  if (isLoading) return (
    <div className="h-screen flex items-center justify-center bg-white/50 backdrop-blur-md">
      <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
    </div>
  );

  if (!course) return (
    <DashboardLayout>
      <div className="h-full flex flex-col items-center justify-center py-32 text-center">
        <div className="h-24 w-24 bg-zinc-50 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-inner">
          <BookOpen className="h-10 w-10 text-zinc-200" />
        </div>
        <h2 className="text-2xl font-semibold text-zinc-900 tracking-tight">课程档案不存在</h2>
        <Button variant="link" onClick={() => setLocation("/teacher/courses")} className="mt-4 text-zinc-400 font-medium">
          返回课程中心
        </Button>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      {/* 玻璃背景装饰 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-blue-50/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[5%] left-[-10%] w-[500px] h-[500px] bg-indigo-50/20 rounded-full blur-[100px]" />
      </div>

      <div className="relative h-[calc(100vh-4rem)] flex flex-col max-w-6xl mx-auto px-8 py-10 overflow-hidden">
        
        {/* 页头区 */}
        <header className="flex-shrink-0 mb-12">
          <button
            onClick={() => setLocation("/teacher/courses")}
            className="group flex items-center gap-2 text-zinc-400 hover:text-zinc-900 transition-all text-[11px] font-bold uppercase tracking-[0.2em] mb-8"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
            Back to Course Hub
          </button>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div className="space-y-5">
              <div className="flex items-center gap-5">
                <h1 className="text-4xl font-bold tracking-tight text-zinc-900">
                  {course.name}
                </h1>
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 border-none rounded-full px-4 py-1 text-[10px] font-bold uppercase tracking-wider shadow-sm">
                  {course.status === "active" ? "● 在读课程" : "○ 草稿中"}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-8 text-zinc-400">
                <span className="flex items-center gap-2 bg-white/80 px-4 py-1.5 rounded-2xl text-[11px] font-mono font-bold tracking-tighter border border-white/60 shadow-sm text-zinc-500">
                  REF: {course.code}
                </span>
                <span className="flex items-center gap-2 text-[13px] font-medium text-zinc-500">
                  <Calendar className="h-4 w-4 text-zinc-300" /> {course.semester}
                </span>
                <span className="flex items-center gap-2 text-[13px] font-medium text-zinc-500">
                  <GraduationCap className="h-4 w-4 text-zinc-300" /> {course.credits} Credits
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* 核心统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 flex-shrink-0">
          {[
            { icon: Users, label: "已关联班级", value: linkedClasses?.length || 0, color: "text-blue-500", bg: "bg-blue-50/50" },
            { icon: FileCheck, label: "作业任务", value: courseAssignments.length, color: "text-emerald-500", bg: "bg-emerald-50/50" },
            { icon: ClipboardList, label: "发布考试", value: courseExams.length, color: "text-rose-500", bg: "bg-rose-50/50" },
          ].map((stat, i) => (
            <div key={i} className="p-7 bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2.25rem] shadow-sm flex items-center gap-6 group hover:bg-white transition-all">
              <div className={`p-4.5 rounded-2xl ${stat.bg} ${stat.color} transition-transform group-hover:scale-110`}>
                <stat.icon className="h-6.5 w-6.5" />
              </div>
              <div>
                <p className="text-3xl font-bold text-zinc-900 leading-none tracking-tight">{stat.value}</p>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-2">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs 内容切换区 */}
        <Tabs defaultValue="outline" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="flex-shrink-0 bg-white/40 backdrop-blur-xl p-1.5 rounded-[1.25rem] border border-white/60 self-start mb-8 shadow-sm">
            <TabsTrigger value="outline" className="rounded-xl px-10 py-2.5 text-[12px] font-semibold data-[state=active]:bg-zinc-900 data-[state=active]:text-white transition-all">
              课程大纲
            </TabsTrigger>
            <TabsTrigger value="classes" className="rounded-xl px-10 py-2.5 text-[12px] font-semibold data-[state=active]:bg-zinc-900 data-[state=active]:text-white transition-all">
              关联班级
            </TabsTrigger>
            <TabsTrigger value="assignments" className="rounded-xl px-10 py-2.5 text-[12px] font-semibold data-[state=active]:bg-zinc-900 data-[state=active]:text-white transition-all">
              作业任务
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-20">
            {/* 课程大纲：高质量 TipTap 渲染 */}
            <TabsContent value="outline" className="mt-0 focus-visible:outline-none">
              <div className="bg-white/40 backdrop-blur-2xl border border-white/70 rounded-[2.5rem] p-12 shadow-sm min-h-[500px]">
                <div className="flex justify-between items-center mb-12 border-b border-zinc-200/50 pb-8">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-2xl bg-zinc-900 flex items-center justify-center text-white shadow-xl">
                      <LayoutDashboard className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-zinc-900 tracking-tight">教学详细说明</h3>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Syllabus Details</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-zinc-200 text-zinc-400 rounded-full px-4 py-1 bg-white/50 font-bold uppercase tracking-tighter">
                    Read-Only Mode
                  </Badge>
                </div>

                <article className="prose prose-zinc max-w-none">
                  {course.description ? (
                    <div
                      className="editor-content-view animate-in fade-in slide-in-from-bottom-4 duration-1000"
                      dangerouslySetInnerHTML={{ __html: course.description }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-32 opacity-20">
                      <BookOpen className="h-16 w-16 mb-6 stroke-[1px]" />
                      <p className="text-[11px] font-black uppercase tracking-[0.3em]">暂无详细教学内容</p>
                    </div>
                  )}
                </article>
              </div>
            </TabsContent>

            {/* 关联班级视图 */}
            <TabsContent value="classes" className="mt-0">
              <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2.5rem] p-10 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                  <div className="space-y-1.5">
                    <h3 className="text-[16px] font-bold text-zinc-900">当前授课班级</h3>
                    <p className="text-[11px] text-zinc-400 font-medium">只有关联班级内的学生才有权访问此课程资源</p>
                  </div>
                  <Link href="/teacher/classes">
                    <Button variant="outline" className="rounded-full border-zinc-200 text-[11px] font-bold hover:bg-white px-6 h-10 shadow-sm transition-all active:scale-95">
                      管理关联班级 <ExternalLink className="ml-2 h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {linkedClasses && linkedClasses.length > 0 ? (
                    linkedClasses.map((cls: any) => (
                      <div key={cls.id} className="group p-6 bg-white/60 border border-white rounded-[2rem] flex items-center justify-between hover:bg-white hover:shadow-lg hover:scale-[1.01] transition-all">
                        <div className="flex items-center gap-5">
                          <div className="h-12 w-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white transition-all shadow-inner">
                            <Users className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="text-[15px] font-bold text-zinc-800 tracking-tight">{cls.name}</p>
                            <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-black mt-1">{cls.major} · {cls.grade}级</p>
                          </div>
                        </div>
                        <Link href={`/teacher/classes/${cls.id}`}>
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-zinc-100 text-zinc-300 hover:text-zinc-900 transition-colors">
                            <ChevronRight className="h-5 w-5" />
                          </Button>
                        </Link>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 py-20 text-center text-zinc-300 text-[11px] uppercase tracking-[0.2em] font-black">
                      目前没有关联任何行政班级
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* 作业记录视图 */}
            <TabsContent value="assignments" className="mt-0">
              <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2.5rem] p-10 shadow-sm">
                <h3 className="text-[16px] font-bold text-zinc-900 mb-10">发布的作业任务</h3>
                <div className="space-y-4">
                  {courseAssignments.length > 0 ? (
                    courseAssignments.map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between p-6 bg-white/60 border border-white rounded-[2rem] hover:bg-white hover:shadow-lg transition-all">
                        <div className="flex items-center gap-5">
                          <div className="h-12 w-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400 transition-colors group-hover:text-zinc-900 shadow-inner">
                            <FileCheck className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="text-[15px] font-bold text-zinc-800 tracking-tight">{a.title}</p>
                            <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-black mt-1">
                              Due: {new Date(a.dueDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Link href={`/teacher/assignments/${a.id}`}>
                          <Button className="rounded-full bg-zinc-900 text-white h-10 px-6 text-[12px] font-bold hover:scale-105 active:scale-95 shadow-lg transition-all">
                            进入批改
                          </Button>
                        </Link>
                      </div>
                    ))
                  ) : (
                    <div className="py-20 text-center text-zinc-300 text-[11px] uppercase tracking-[0.2em] font-black">
                      暂无发布的作业任务
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.06); border-radius: 10px; }
        
        /* TipTap 渲染美化逻辑 */
        .editor-content-view { line-height: 1.8; color: #3f3f46; font-size: 15px; }
        .editor-content-view h1 { font-size: 2.25em; font-weight: 800; margin-top: 1.5em; margin-bottom: 0.8em; color: #18181b; letter-spacing: -0.03em; }
        .editor-content-view h2 { font-size: 1.65em; font-weight: 700; margin-top: 1.4em; margin-bottom: 0.6em; color: #27272a; border-bottom: 1px solid rgba(0,0,0,0.05); padding-bottom: 0.3em; }
        .editor-content-view h3 { font-size: 1.35em; font-weight: 700; margin-top: 1.2em; color: #3f3f46; }
        .editor-content-view p { margin-bottom: 1.25em; }

        /* 任务列表 (TaskList) 专门样式 */
        .editor-content-view ul[data-type="taskList"] { list-style: none; padding: 0; margin-top: 1.5em; }
        .editor-content-view ul[data-type="taskList"] li { display: flex; align-items: flex-start; gap: 0.75rem; margin-bottom: 0.6rem; }
        .editor-content-view ul[data-type="taskList"] input[type="checkbox"] { 
          appearance: none; width: 18px; height: 18px; border: 2.5px solid #e4e4e7; border-radius: 6px; 
          margin-top: 5px; cursor: default; position: relative; background: white; transition: all 0.2s;
        }
        .editor-content-view ul[data-type="taskList"] input[type="checkbox"]:checked { background-color: #18181b; border-color: #18181b; }
        .editor-content-view ul[data-type="taskList"] input[type="checkbox"]:checked::after {
          content: "✓"; position: absolute; color: white; font-size: 11px; font-weight: 900; left: 2.5px; top: -1.5px;
        }

        /* 引用块美化 */
        .editor-content-view blockquote {
          border-left: 4px solid #18181b; background: rgba(0,0,0,0.02); padding: 1.5rem 2.5rem; 
          border-radius: 0 1.5rem 1.5rem 0; margin: 2.5rem 0; font-style: italic; color: #52525b; font-size: 1.1em;
        }

        /* 列表 */
        .editor-content-view ul:not([data-type="taskList"]) { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1.5rem; }
        .editor-content-view ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 1.5rem; }
        
        /* 代码显示 */
        .editor-content-view code { background: #f4f4f5; padding: 0.25em 0.5em; border-radius: 8px; font-size: 0.85em; color: #be185d; font-family: ui-monospace, monospace; }
        .editor-content-view pre { background: #18181b; color: #f4f4f5; padding: 1.5rem; border-radius: 1.5rem; overflow-x: auto; margin: 2rem 0; font-size: 0.9em; line-height: 1.6; }
      `}</style>
    </DashboardLayout>
  );
}