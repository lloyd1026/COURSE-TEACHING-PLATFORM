import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { 
  BookOpen, Users, FileText, ClipboardList, 
  PlusCircle, ArrowUpRight, Clock, ChevronRight,
  LayoutGrid, Sparkles, GraduationCap
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";

export default function TeacherDashboard() {
  const { user } = useAuth();
  const { data: courses, isLoading: coursesLoading } = trpc.courses.list.useQuery();
  const { data: classes } = trpc.classes.list.useQuery();

  const stats = [
    {
      title: "执教课程",
      value: courses?.length || 0,
      icon: BookOpen,
      href: "/teacher/courses",
      color: "text-indigo-600",
      bgColor: "bg-indigo-50/50",
      desc: "本学期活跃课程"
    },
    {
      title: "管理班级",
      value: classes?.length || 0,
      icon: Users,
      href: "/teacher/classes",
      color: "text-emerald-600",
      bgColor: "bg-emerald-50/50",
      desc: "关联行政班级"
    },
    {
      title: "待阅作业",
      value: 0,
      icon: FileText,
      href: "/teacher/assignments",
      color: "text-amber-600",
      bgColor: "bg-amber-50/50",
      desc: "需在72小时内批改"
    },
    {
      title: "进行中考试",
      value: 0,
      icon: ClipboardList,
      href: "/teacher/exams",
      color: "text-rose-600",
      bgColor: "bg-rose-50/50",
      desc: "实时监考与评分"
    },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-10 pb-10 animate-in fade-in duration-700">
        
        {/* 1. 沉浸式欢迎区 */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 px-8 py-12 text-white shadow-2xl">
          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium backdrop-blur-md">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span>{new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}</span>
            </div>
            <h2 className="text-4xl font-black tracking-tight md:text-5xl">
              你好, {user?.name || "老师"} <span className="animate-wave inline-block">👋</span>
            </h2>
            <p className="max-w-xl text-slate-400 font-medium">
              欢迎回到智慧教学工作台。今天有新的作业提交待处理，您的课程《计算机组成原理》也有新的讨论。
            </p>
          </div>
          {/* 背景装饰 */}
          <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-indigo-600/20 blur-[100px]" />
          <div className="absolute -bottom-20 right-40 h-60 w-60 rounded-full bg-emerald-600/10 blur-[80px]" />
        </div>

        {/* 2. 数据概览网格 */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Link key={stat.title} href={stat.href}>
              <Card className="group relative overflow-hidden border-none shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl cursor-pointer bg-white">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <div className={`rounded-2xl p-3 ${stat.bgColor} ${stat.color} transition-colors group-hover:bg-opacity-100`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="text-3xl font-black tracking-tight text-slate-900">{stat.value}</div>
                  <p className="text-sm font-bold text-slate-500 mt-1">{stat.title}</p>
                  <p className="text-[10px] text-slate-400 mt-2 font-medium">{stat.desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* 3. 最近课程列表 (占2栏) */}
          <Card className="lg:col-span-2 border-none shadow-lg rounded-[2rem] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 px-8 py-6">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <LayoutGrid className="h-5 w-5 text-indigo-500" /> 最近的课程
                </CardTitle>
                <CardDescription>展示您最近管理和更新的教学档案</CardDescription>
              </div>
              <Link href="/teacher/courses">
                <Button variant="ghost" className="text-sm font-bold text-indigo-600">全部课程 <ChevronRight className="ml-1 h-4 w-4" /></Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {coursesLoading ? (
                <div className="flex flex-col items-center py-20 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-200" />
                  <p className="text-sm text-slate-400 font-medium">加载教学数据中...</p>
                </div>
              ) : courses && courses.length > 0 ? (
                <div className="divide-y divide-slate-50">
                  {courses.slice(0, 4).map((course) => (
                    <Link key={course.id} href={`/teacher/courses/${course.id}`}>
                      <div className="flex items-center justify-between px-8 py-6 transition-colors hover:bg-slate-50/80 cursor-pointer group">
                        <div className="flex items-center gap-5">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 font-mono text-sm font-black text-slate-400 transition-colors group-hover:bg-indigo-100 group-hover:text-indigo-600">
                            {course.code?.substring(0, 2)}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{course.name}</h3>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-tighter">
                                <GraduationCap className="h-3 w-3" /> {course.code}
                              </span>
                              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-tighter">
                                <Clock className="h-3 w-3" /> {course.semester || "本学期"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border-2 ${
                          course.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          course.status === 'draft' ? 'bg-slate-50 text-slate-400 border-slate-100' :
                          'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>
                          {course.status === 'active' ? '授课中' : course.status === 'draft' ? '草案' : '已归档'}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                   <div className="inline-flex p-4 rounded-full bg-slate-50 mb-4 text-slate-200">
                      <BookOpen className="h-10 w-10" />
                   </div>
                   <p className="text-slate-400 font-medium">暂无课程，开始创建您的第一门课吧</p>
                   <Link href="/teacher/courses/create">
                     <Button className="mt-4 rounded-xl">创建新课程</Button>
                   </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 4. 快捷操作磁贴 (占1栏) */}
          <div className="space-y-6">
            <Card className="border-none shadow-lg rounded-[2rem] bg-indigo-600 text-white">
              <CardHeader>
                <CardTitle className="text-white text-lg">快速发起</CardTitle>
                <CardDescription className="text-indigo-100">高频教学功能</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 pt-0">
                <Link href="/teacher/courses/create">
                  <button className="flex w-full items-center justify-between rounded-2xl bg-white/10 p-4 transition-all hover:bg-white/20">
                    <div className="flex items-center gap-3">
                      <PlusCircle className="h-5 w-5" />
                      <span className="font-bold text-sm">创建新课程</span>
                    </div>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </Link>
                <Link href="/teacher/assignments/create">
                  <button className="flex w-full items-center justify-between rounded-2xl bg-white/10 p-4 transition-all hover:bg-white/20">
                    <div className="flex items-center gap-3 text-sm">
                      <FileText className="h-5 w-5" />
                      <span className="font-bold">布置新作业</span>
                    </div>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg rounded-[2rem]">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">辅助工具</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <Link href="/teacher/questions">
                  <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 transition-all cursor-pointer group">
                    <BookOpen className="h-6 w-6 text-slate-400 group-hover:text-indigo-600" />
                    <span className="text-xs font-bold">题库</span>
                  </div>
                </Link>
                <Link href="/teacher/exams/create">
                   <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 transition-all cursor-pointer group">
                    <ClipboardList className="h-6 w-6 text-slate-400 group-hover:text-indigo-600" />
                    <span className="text-xs font-bold">考务</span>
                  </div>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes wave {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(20deg); }
          75% { transform: rotate(-15deg); }
        }
        .animate-wave { animation: wave 2.5s infinite; transform-origin: 70% 70%; }
      `}</style>
    </DashboardLayout>
  );
}

const Loader2 = ({ className }: { className?: string }) => (
  <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);