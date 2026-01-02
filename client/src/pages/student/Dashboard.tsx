import { useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { 
  BookOpen, FileText, ClipboardList, Brain, 
  ChevronRight, Sparkles, Clock, LayoutGrid 
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function StudentDashboard() {
  // 1. 获取真实数据
  const { data: courses, isLoading: coursesLoading } = trpc.courses.list.useQuery();
  const { data: assignments, isLoading: assignmentsLoading } = trpc.assignments.list.useQuery();
  // 假设你还有考试列表接口，如果没有可以先给空数组
  const { data: exams } = trpc.exams.list.useQuery();

  // 2. 计算统计数值
  const stats = useMemo(() => [
    {
      title: "我的课程",
      value: courses?.length || 0,
      sub: "Active Courses",
      icon: BookOpen,
      href: "/student/courses",
      color: "text-blue-500",
      bg: "bg-blue-50/50",
    },
    {
      title: "待交作业",
      value: assignments?.length || 0, // 后续可以过滤未完成的状态
      sub: "Pending Tasks",
      icon: FileText,
      href: "/student/assignments",
      color: "text-orange-500",
      bg: "bg-orange-50/50",
    },
    {
      title: "即将考试",
      value: exams?.length || 0,
      sub: "Upcoming Exams",
      icon: ClipboardList,
      href: "/student/exams",
      color: "text-purple-500",
      bg: "bg-purple-50/50",
    },
    {
      title: "AI 导师",
      value: "AI",
      sub: "Always Online",
      icon: Brain,
      href: "/student/ai-assistant",
      color: "text-emerald-500",
      bg: "bg-emerald-50/50",
    },
  ], [courses, assignments, exams]);

  return (
    <DashboardLayout>
      {/* 极光背景装饰 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-50/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-[5%] right-[-5%] w-[500px] h-[500px] bg-indigo-50/20 rounded-full blur-[100px]" />
      </div>

      <div className="relative space-y-10 max-w-7xl mx-auto px-4 py-6">
        {/* 欢迎头部 */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-zinc-400">
              <Sparkles className="h-4 w-4" />
              <span className="text-[11px] font-bold uppercase tracking-widest">Student Portal</span>
            </div>
            <h2 className="text-4xl font-semibold tracking-tight text-zinc-900">
              工作台 <span className="text-zinc-400 font-normal">Dashboard</span>
            </h2>
            <p className="text-zinc-500 text-sm">欢迎回来，今天也要开启高效学习的一天。</p>
          </div>
          <div className="bg-white/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/60 shadow-sm flex items-center gap-3">
             <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[11px] font-bold text-zinc-600 uppercase tracking-tight">Academic Year 2026</span>
          </div>
        </header>

        {/* 统计网格：Liquid Glass 风格 */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link key={stat.title} href={stat.href}>
                <div className="group relative bg-white/40 backdrop-blur-xl border border-white/80 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl hover:bg-white transition-all duration-500 cursor-pointer">
                  <div className="flex justify-between items-start mb-6">
                    <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} transition-transform group-hover:scale-110`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <ChevronRight className="h-5 w-5 text-zinc-300 transition-transform group-hover:translate-x-1" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold tracking-tighter text-zinc-900 mb-1">
                      {coursesLoading || assignmentsLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin text-zinc-200" />
                      ) : stat.value}
                    </div>
                    <p className="text-[13px] font-semibold text-zinc-600">{stat.title}</p>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tighter mt-1">{stat.sub}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* 最近活动 / 学习进度 */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white/40 backdrop-blur-xl border border-white/80 rounded-[2.5rem] p-8 min-h-[400px]">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-zinc-900 flex items-center justify-center text-white">
                    <Clock className="h-5 w-5" />
                  </div>
                  <h3 className="text-[16px] font-bold text-zinc-900">最近的学习活动</h3>
                </div>
                <Button variant="ghost" className="text-[11px] font-bold uppercase text-zinc-400 tracking-wider">查看全部</Button>
              </div>
              
              {/* 模拟最近活动列表 */}
              <div className="space-y-4">
                {assignments && assignments.length > 0 ? (
                  assignments.slice(0, 3).map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between p-5 bg-white/60 rounded-[1.5rem] border border-white transition-all hover:bg-white">
                       <div className="flex items-center gap-4">
                         <div className="h-10 w-10 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-400">
                           <FileText className="h-5 w-5" />
                         </div>
                         <div>
                            <p className="text-sm font-semibold text-zinc-800">{a.title}</p>
                            <p className="text-[10px] text-zinc-400">截止日期: {new Date(a.dueDate).toLocaleDateString()}</p>
                         </div>
                       </div>
                       <Link href={`/student/assignments/${a.id}`}>
                         <Button variant="outline" size="sm" className="rounded-full h-8 text-[11px] border-zinc-200 px-4">去完成</Button>
                       </Link>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 opacity-20 text-zinc-500">
                    <LayoutGrid className="h-12 w-12 mb-4" />
                    <p className="text-[12px] font-bold uppercase tracking-widest">暂无活跃任务</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 快速操作侧边栏 */}
          <div className="space-y-6">
            <div className="bg-zinc-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 transition-transform group-hover:scale-125">
                <Brain className="h-32 w-32" />
              </div>
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-2">需要学习帮助？</h3>
                <p className="text-zinc-400 text-sm mb-6">向 AI 助手询问有关课程内容、作业解析或知识点总结的问题。</p>
                <Link href="/student/ai-assistant">
                  <Button className="w-full rounded-full bg-white text-zinc-900 h-12 font-bold hover:bg-zinc-100">
                    立即发起对话
                  </Button>
                </Link>
              </div>
            </div>

            <div className="bg-white/40 backdrop-blur-xl border border-white/80 rounded-[2.5rem] p-8">
              <h3 className="text-[15px] font-bold text-zinc-900 mb-6">快捷入口</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: BookOpen, label: "找课程", href: "/student/courses" },
                  { icon: FileText, label: "交作业", href: "/student/assignments" },
                  { icon: ClipboardList, label: "考查课", href: "/student/exams" },
                  { icon: LayoutGrid, label: "设置", href: "/student/settings" },
                ].map(action => (
                  <Link key={action.label} href={action.href}>
                    <button className="flex flex-col items-center justify-center p-4 bg-white/60 rounded-2xl border border-white hover:bg-white hover:shadow-sm transition-all gap-2">
                      <action.icon className="h-5 w-5 text-zinc-400" />
                      <span className="text-[11px] font-bold text-zinc-600">{action.label}</span>
                    </button>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}