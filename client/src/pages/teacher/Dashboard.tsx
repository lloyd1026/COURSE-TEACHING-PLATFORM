import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { 
  BookOpen, Users, FileText, ClipboardList, 
  PlusCircle, ArrowUpRight, ChevronRight,
  LayoutGrid, Sparkles, GraduationCap, Loader2,
  Calendar, Zap, Star
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";

// 引入统一的表单组件
import { Dialog, DialogContent } from "@/components/ui/dialog";
import CourseForm from "@/components/teacher/courses/CourseForm";
import ClassForm from "@/components/teacher/classes/ClassForm";
import AssignmentForm from "@/components/teacher/assignments/AssignmentForm";

export default function TeacherDashboard() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  // 弹窗状态管理
  const [activeDialog, setActiveDialog] = useState<"course" | "class" | "assignment" | null>(null);

  // 真实数据获取
  const { data: courses, isLoading: coursesLoading } = trpc.courses.list.useQuery();
  const { data: classes } = trpc.classes.list.useQuery();

  const stats = [
    { 
      title: "执教课程", 
      value: courses?.length || 0, 
      icon: BookOpen, 
      href: "/teacher/courses", 
      color: "text-blue-500", 
      bg: "bg-blue-50/50" 
    },
    { 
      title: "管理班级", 
      value: classes?.length || 0, 
      icon: GraduationCap, 
      href: "/teacher/classes", 
      color: "text-indigo-500", 
      bg: "bg-indigo-50/50" 
    },
    { 
      title: "待阅作业", 
      value: 0, 
      icon: FileText, 
      href: "/teacher/assignments", 
      color: "text-emerald-500", 
      bg: "bg-emerald-50/50" 
    },
    { 
      title: "考试监控", 
      value: 0, 
      icon: ClipboardList, 
      href: "/teacher/exams", 
      color: "text-rose-500", 
      bg: "bg-rose-50/50" 
    },
  ];

  return (
    <DashboardLayout>
      {/* 玻璃感背景装饰 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-5%] right-[-5%] w-[400px] h-[400px] bg-emerald-50/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[10%] left-[-5%] w-[300px] h-[300px] bg-blue-50/20 rounded-full blur-[80px]" />
      </div>

      <div className="relative h-[calc(100vh-4rem)] flex flex-col max-w-6xl mx-auto px-6 py-8 overflow-hidden">
        
        {/* Header */}
        <header className="flex-shrink-0 flex justify-between items-center mb-10">
          <div className="flex items-center gap-3">
            <div className="bg-zinc-900 p-2 rounded-xl shadow-lg">
              <LayoutGrid className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900">工作台概览</h1>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-medium text-zinc-400 uppercase tracking-widest">
            <Calendar className="h-3.5 w-3.5" />
            {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-10 pb-10">
          
          {/* 1. 欢迎卡片 */}
          <section className="relative group p-8 bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2.5rem] overflow-hidden shadow-sm">
            <div className="relative z-10 space-y-4">
              <Badge className="bg-zinc-900 text-white border-none px-4 py-1 text-[10px] font-medium rounded-full uppercase tracking-tighter">
                <Sparkles className="h-3 w-3 mr-1.5" /> Smart Education System
              </Badge>
              <h2 className="text-4xl font-semibold tracking-tight text-zinc-900">
                你好, {user?.name || "老师"} <span className="animate-wave inline-block ml-2">👋</span>
              </h2>
              <p className="max-w-xl text-zinc-500 text-[14px] leading-relaxed">
                欢迎回来。在这里您可以快速管理课程进度、批阅学生作业或监控考务动态。
              </p>
            </div>
            {/* 背景装饰球 */}
            <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-emerald-100/20 blur-[80px]" />
          </section>

          {/* 2. 数据指标网格 */}
          <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <Link key={stat.title} href={stat.href}>
                <div className="group p-6 bg-white/40 backdrop-blur-md border border-white/60 rounded-[2rem] hover:bg-white/80 hover:scale-[1.02] transition-all duration-300 shadow-sm cursor-pointer">
                  <div className="flex justify-between items-start mb-6">
                    <div className={`rounded-2xl p-3 ${stat.bg} ${stat.color} transition-all group-hover:scale-110`}>
                      <stat.icon className="h-5 w-5" />
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-zinc-200 group-hover:text-zinc-900 transition-all" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-3xl font-semibold tracking-tight text-zinc-900">{stat.value}</div>
                    <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-widest leading-none">{stat.title}</p>
                  </div>
                </div>
              </Link>
            ))}
          </section>

          <section className="grid gap-8 lg:grid-cols-3 items-start">
            {/* 3. 活跃课程列表 */}
            <div className="lg:col-span-2 bg-white/40 backdrop-blur-md border border-white/60 rounded-[2.5rem] overflow-hidden flex flex-col shadow-sm">
              <div className="flex items-center justify-between px-8 py-6 border-b border-zinc-100/50">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-50/50 p-2 rounded-xl"><Star className="h-4 w-4 text-blue-500" /></div>
                  <h3 className="text-[15px] font-medium text-zinc-900">活跃教学课程</h3>
                </div>
                <Link href="/teacher/courses">
                  <Button variant="ghost" className="text-[11px] font-medium text-zinc-400 hover:text-zinc-900 rounded-full px-4">
                    查看全部 <ChevronRight className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              </div>
              
              <div className="divide-y divide-zinc-100/50">
                {coursesLoading ? (
                  <div className="flex justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-zinc-300" /></div>
                ) : courses && courses.length > 0 ? (
                  courses.slice(0, 4).map((course) => (
                    <Link key={course.id} href={`/teacher/courses/${course.id}`}>
                      <div className="flex items-center justify-between px-8 py-5 transition-all hover:bg-white/60 cursor-pointer group">
                        <div className="flex items-center gap-5">
                          <div className="h-10 w-10 rounded-2xl bg-white flex items-center justify-center text-[10px] font-mono font-bold text-zinc-300 group-hover:bg-zinc-900 group-hover:text-white transition-all shadow-sm">
                            {course.code?.substring(0, 2)}
                          </div>
                          <div>
                            <h3 className="text-[14px] font-medium text-zinc-800 group-hover:text-zinc-900">{course.name}</h3>
                            <div className="flex items-center gap-3 mt-1 opacity-50">
                              <span className="text-[10px] flex items-center gap-1 uppercase tracking-tight font-bold"><GraduationCap className="h-3 w-3" /> {course.code}</span>
                            </div>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 border-none text-[9px] px-2.5 py-0 rounded-full">进行中</Badge>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="text-center py-20">
                     <BookOpen className="h-10 w-10 text-zinc-100 mx-auto mb-3" />
                     <p className="text-[11px] text-zinc-300 uppercase tracking-widest font-medium">暂无活跃课程记录</p>
                  </div>
                )}
              </div>
            </div>

            {/* 4. 快速发起面板 */}
            <div className="space-y-6">
              <div className="bg-zinc-900 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden group">
                <div className="absolute -right-6 -top-6 h-32 w-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all" />
                <h4 className="font-medium text-[15px] mb-8 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-emerald-400 fill-emerald-400" /> 快速发起
                </h4>
                <div className="space-y-3">
                  <button 
                    onClick={() => setActiveDialog("course")}
                    className="w-full flex items-center justify-between rounded-2xl bg-white/10 p-4 transition-all hover:bg-white/15 cursor-pointer backdrop-blur-md"
                  >
                    <div className="flex items-center gap-3">
                      <PlusCircle className="h-4 w-4 text-emerald-400" />
                      <span className="text-[12px] font-medium">开设新课程</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 opacity-30" />
                  </button>
                  {/* <button 
                    onClick={() => setActiveDialog("assignment")}
                    className="w-full flex items-center justify-between rounded-2xl bg-white/10 p-4 transition-all hover:bg-white/15 cursor-pointer backdrop-blur-md"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-blue-400" />
                      <span className="text-[12px] font-medium">布置新作业</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 opacity-30" />
                  </button> */}
                  <button 
                    onClick={() => setActiveDialog("class")}
                    className="w-full flex items-center justify-between rounded-2xl bg-white/10 p-4 transition-all hover:bg-white/15 cursor-pointer backdrop-blur-md"
                  >
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 text-indigo-400" />
                      <span className="text-[12px] font-medium">新建行政班级</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 opacity-30" />
                  </button>
                </div>
              </div>

              {/* 常用资源链接 */}
              <div className="bg-white/40 backdrop-blur-md border border-white/60 rounded-[2.5rem] p-8 shadow-sm">
                <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                  <LayoutGrid className="h-3.5 w-3.5" /> 常用资源
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <Link href="/teacher/questions">
                    <div className="flex flex-col items-center gap-3 p-5 rounded-[2rem] bg-white/60 hover:bg-zinc-900 hover:text-white transition-all duration-300 cursor-pointer shadow-sm group">
                      <BookOpen className="h-5 w-5 text-zinc-400 group-hover:text-white" />
                      <span className="text-[11px] font-medium">题库管理</span>
                    </div>
                  </Link>
                  <Link href="/teacher/exams">
                    <div className="flex flex-col items-center gap-3 p-5 rounded-[2rem] bg-white/60 hover:bg-zinc-900 hover:text-white transition-all duration-300 cursor-pointer shadow-sm group">
                      <ClipboardList className="h-5 w-5 text-zinc-400 group-hover:text-white" />
                      <span className="text-[11px] font-medium">在线考试</span>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* 统一弹窗容器 */}
      <Dialog open={!!activeDialog} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="max-w-3xl p-0 rounded-[2.5rem] overflow-hidden border-white/60 bg-white/80 backdrop-blur-2xl shadow-2xl h-[80vh] focus:outline-none">
          <div className="h-full overflow-y-auto p-10 custom-scrollbar">
            {activeDialog === "course" && (
              <CourseForm onSuccess={() => { setActiveDialog(null); utils.courses.list.invalidate(); }} />
            )}
            {activeDialog === "class" && (
              <ClassForm onSuccess={() => { setActiveDialog(null); utils.classes.list.invalidate(); }} />
            )}
            {/* {activeDialog === "assignment" && (
              <AssignmentForm onSuccess={() => { setActiveDialog(null); utils.assignments.list.invalidate(); }} />
            )} */}
          </div>
        </DialogContent>
      </Dialog>

      <style>{`
        @keyframes wave {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(20deg); }
          75% { transform: rotate(-15deg); }
        }
        .animate-wave { animation: wave 2.5s infinite; transform-origin: 70% 70%; }
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
      `}</style>
    </DashboardLayout>
  );
}