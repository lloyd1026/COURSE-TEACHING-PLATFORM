import { useMemo } from "react";
import { useParams, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  BookOpen,
  FileCheck,
  ClipboardList,
  Loader2,
  Calendar,
  GraduationCap,
  LayoutDashboard,
  ChevronRight,
  Star,
  Clock,
  CheckCircle2
} from "lucide-react";

export default function StudentCourseDetail() {
  const { id } = useParams<{ id: string }>();
  const courseId = parseInt(id || "0");
  const [, setLocation] = useLocation();

  // 1. 获取数据
  const { data: course, isLoading: courseLoading } = trpc.courses.get.useQuery({ id: courseId });
  // 这里需要确保后端 list 接口已经处理了学生的权限，返回该班级的作业
  const { data: assignments, isLoading: assignLoading } = trpc.assignments.list.useQuery();

  // 2. 过滤当前课程的作业
  const courseAssignments = useMemo(
    () => assignments?.filter((a: any) => a.courseId === courseId) || [],
    [assignments, courseId]
  );

  if (courseLoading) return (
    <div className="h-screen flex items-center justify-center bg-white/50 backdrop-blur-md">
      <Loader2 className="h-6 w-6 animate-spin text-zinc-300" />
    </div>
  );

  if (!course) return (
    <DashboardLayout>
      <div className="h-full flex flex-col items-center justify-center py-32 text-center">
        <h2 className="text-xl font-semibold text-zinc-900">未找到课程信息</h2>
        <Button variant="link" onClick={() => setLocation("/student/courses")} className="mt-4 text-zinc-400">返回课程列表</Button>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      {/* 玻璃背景背景 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-blue-50/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[5%] left-[-10%] w-[500px] h-[500px] bg-indigo-50/20 rounded-full blur-[100px]" />
      </div>

      <div className="relative h-[calc(100vh-4rem)] flex flex-col max-w-6xl mx-auto px-8 py-10 overflow-hidden">
        
        {/* 页头区 */}
        <header className="flex-shrink-0 mb-12">
          <button
            onClick={() => setLocation("/student/courses")}
            className="group flex items-center gap-2 text-zinc-400 hover:text-zinc-900 transition-all text-[11px] font-bold uppercase tracking-[0.2em] mb-6"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
            Back to My Courses
          </button>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{course.name}</h1>
                <Badge className="bg-zinc-900 text-white border-none rounded-full px-4 py-0.5 text-[10px] uppercase font-bold tracking-wider">
                  STUDYING
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-6 text-zinc-400">
                <span className="flex items-center gap-2 bg-white/80 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-tighter border border-white/60 shadow-sm">
                  CODE: {course.code}
                </span>
                <span className="flex items-center gap-1.5 text-[12px] font-medium text-zinc-500">
                  <Calendar className="h-4 w-4 text-zinc-300" /> {course.semester}
                </span>
                <span className="flex items-center gap-1.5 text-[12px] font-medium text-zinc-500">
                  <Star className="h-4 w-4 text-zinc-300" /> {course.credits} Credits
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* 内容 Tabs */}
        <Tabs defaultValue="outline" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="flex-shrink-0 bg-white/40 backdrop-blur-xl p-1.5 rounded-2xl border border-white/60 self-start mb-8">
            <TabsTrigger value="outline" className="rounded-xl px-10 py-2.5 text-[12px] font-bold data-[state=active]:bg-zinc-900 data-[state=active]:text-white">课程大纲</TabsTrigger>
            <TabsTrigger value="assignments" className="rounded-xl px-10 py-2.5 text-[12px] font-bold data-[state=active]:bg-zinc-900 data-[state=active]:text-white">作业任务</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-20">
            {/* 1. 课程大纲（同步 TipTap 渲染样式） */}
            <TabsContent value="outline" className="mt-0">
              <div className="bg-white/40 backdrop-blur-2xl border border-white/70 rounded-[2.5rem] p-10 shadow-sm min-h-[500px]">
                <div className="flex items-center gap-3 mb-10 border-b border-zinc-200/50 pb-6">
                  <div className="h-9 w-9 rounded-xl bg-zinc-900 flex items-center justify-center text-white shadow-lg">
                    <LayoutDashboard className="h-4.5 w-4.5" />
                  </div>
                  <h3 className="text-[16px] font-bold text-zinc-900 tracking-tight">教学详细说明 / Syllabus</h3>
                </div>

                <article className="prose prose-zinc max-w-none">
                  {course.description ? (
                    <div
                      className="editor-content-view animate-in fade-in duration-700"
                      dangerouslySetInnerHTML={{ __html: course.description }}
                    />
                  ) : (
                    <div className="text-center py-20 opacity-20 italic">暂无教学大纲内容</div>
                  )}
                </article>
              </div>
            </TabsContent>

            {/* 2. 作业列表 */}
            <TabsContent value="assignments" className="mt-0">
              <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2.5rem] p-10 shadow-sm">
                <div className="flex items-center justify-between mb-10">
                  <h3 className="text-[16px] font-bold text-zinc-900">本课程待办任务</h3>
                  <Badge variant="outline" className="rounded-full border-zinc-200 text-zinc-400 text-[10px] uppercase font-bold">
                    {courseAssignments.length} Assignments
                  </Badge>
                </div>

                <div className="grid gap-4">
                  {courseAssignments.length > 0 ? (
                    courseAssignments.map((a: any) => (
                      <div key={a.id} className="group flex items-center justify-between p-6 bg-white/60 border border-white rounded-[2rem] hover:bg-white hover:shadow-lg transition-all">
                        <div className="flex items-center gap-5">
                          <div className="h-12 w-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white transition-all shadow-inner">
                            <FileCheck className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="text-[15px] font-bold text-zinc-800">{a.title}</p>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                                <Clock className="h-3 w-3" /> 截止: {new Date(a.dueDate).toLocaleDateString()}
                              </span>
                              {/* 状态逻辑可以后续结合提交表扩展 */}
                              <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> 进行中
                              </span>
                            </div>
                          </div>
                        </div>
                        <Link href={`/student/assignments/${a.id}`}>
                          <Button className="rounded-full bg-zinc-900 text-white h-10 px-6 text-[11px] font-bold hover:scale-105 active:scale-95 transition-all">
                            立即提交 <ChevronRight className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </div>
                    ))
                  ) : (
                    <div className="py-20 text-center text-zinc-300 text-[11px] uppercase tracking-[0.2em] font-black">
                      目前没有待处理的作业
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
        
        /* 复用 TipTap 渲染样式 */
        .editor-content-view { line-height: 1.8; color: #3f3f46; font-size: 15px; }
        .editor-content-view h1 { font-size: 2em; font-weight: 800; margin: 1.5em 0 0.8em; color: #18181b; }
        .editor-content-view h2 { font-size: 1.5em; font-weight: 700; margin: 1.4em 0 0.6em; color: #27272a; border-bottom: 1px solid rgba(0,0,0,0.05); padding-bottom: 0.3em; }
        .editor-content-view ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1.2em; }
        .editor-content-view ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 1.2em; }
        .editor-content-view blockquote { border-left: 4px solid #18181b; background: rgba(0,0,0,0.02); padding: 1.5rem 2rem; border-radius: 0 1.5rem 1.5rem 0; font-style: italic; margin: 1.5em 0; }
        .editor-content-view ul[data-type="taskList"] { list-style: none; padding: 0; }
        .editor-content-view ul[data-type="taskList"] li { display: flex; align-items: flex-start; gap: 0.5rem; }
      `}</style>
    </DashboardLayout>
  );
}