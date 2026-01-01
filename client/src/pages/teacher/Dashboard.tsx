import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { 
  BookOpen, Users, FileText, ClipboardList, 
  PlusCircle, ArrowUpRight, Clock, ChevronRight,
  LayoutGrid, Sparkles, GraduationCap, Loader2,
  Calendar, Zap, Star
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";

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
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      desc: "活跃教学任务"
    },
    {
      title: "管理班级",
      value: classes?.length || 0,
      icon: Users,
      href: "/teacher/classes",
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      desc: "关联行政班级"
    },
    {
      title: "待阅作业",
      value: 0,
      icon: FileText,
      href: "/teacher/assignments",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      desc: "近期提交待批改"
    },
    {
      title: "进行中考试",
      value: 0,
      icon: ClipboardList,
      href: "/teacher/exams",
      color: "text-rose-600",
      bgColor: "bg-rose-50",
      desc: "实时考务监控"
    },
  ];

  return (
    <DashboardLayout>
      {/* 核心布局：页面锁定，局部滚动 */}
      <div className="h-screen flex flex-col bg-[#F5F5F7] font-sans antialiased text-[#1D1D1F] overflow-hidden">
        
        {/* 固定顶部 Header */}
        <header className="flex-none z-30 w-full bg-[#F5F5F7]/80 backdrop-blur-xl border-b border-gray-200/50">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-black p-1.5 rounded-lg shadow-sm">
                <LayoutGrid className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-lg font-bold tracking-tight leading-none">工作台概览</h1>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
              <Calendar className="h-3.5 w-3.5" />
              {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
            </div>
          </div>
        </header>

        {/* 独立滑动的内容区域 */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth">
          <div className="max-w-7xl mx-auto px-6 py-8 space-y-10 pb-20">
            
            {/* 1. 欢迎区：更高级的玻璃质感卡片 */}
            <section className="relative overflow-hidden rounded-[32px] bg-white border border-white shadow-xl shadow-gray-200/50 px-8 py-10">
              <div className="relative z-10 space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-[11px] font-bold text-blue-600 uppercase tracking-widest">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>智慧教学系统 · 2026 Spring</span>
                </div>
                <h2 className="text-4xl font-extrabold tracking-tight md:text-5xl text-[#1D1D1F]">
                  你好, {user?.name || "老师"} <span className="animate-wave inline-block ml-2">👋</span>
                </h2>
                <p className="max-w-xl text-gray-500 font-medium leading-relaxed">
                  欢迎回来。今天有新的作业提交待处理，您的课程《计算机组成原理》也有新的讨论动态。保持高效，享受教学。
                </p>
              </div>
              {/* Apple 典型的柔和渐变球背景 */}
              <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-blue-400/10 blur-[80px]" />
              <div className="absolute -bottom-10 right-20 h-48 w-48 rounded-full bg-purple-400/10 blur-[60px]" />
            </section>

            {/* 2. 数据指标：Apple 风格的 Tile */}
            <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat) => (
                <Link key={stat.title} href={stat.href}>
                  <div className="group relative bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer overflow-hidden">
                    <div className="flex justify-between items-start mb-6">
                      <div className={`rounded-2xl p-3 ${stat.bgColor} ${stat.color} transition-all group-hover:scale-110 duration-500`}>
                        <stat.icon className="h-6 w-6" />
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-gray-300 transition-all group-hover:text-blue-500 group-hover:translate-x-1 group-hover:-translate-y-1" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-3xl font-extrabold tracking-tight text-[#1D1D1F]">{stat.value}</div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider leading-none">{stat.title}</p>
                      <p className="text-[10px] text-gray-400 mt-2 font-medium opacity-0 group-hover:opacity-100 transition-opacity">{stat.desc}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </section>

            <section className="grid gap-8 lg:grid-cols-3">
              {/* 3. 最近课程列表 (占2栏) */}
              <div className="lg:col-span-2 bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-8 py-6 border-b border-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-50 p-2 rounded-xl">
                      <Star className="h-5 w-5 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-bold tracking-tight">活跃教学课程</h3>
                  </div>
                  <Link href="/teacher/courses">
                    <Button variant="ghost" className="text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-full px-4">
                      查看全部 <ChevronRight className="ml-1 h-3 w-3" />
                    </Button>
                  </Link>
                </div>
                
                <div className="divide-y divide-gray-50">
                  {coursesLoading ? (
                    <div className="flex flex-col items-center py-20 gap-3">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-500 opacity-20" />
                    </div>
                  ) : courses && courses.length > 0 ? (
                    courses.slice(0, 4).map((course) => (
                      <Link key={course.id} href={`/teacher/courses/${course.id}`}>
                        <div className="flex items-center justify-between px-8 py-6 transition-all hover:bg-gray-50/50 cursor-pointer group">
                          <div className="flex items-center gap-5">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 font-mono text-xs font-bold text-gray-400 transition-all group-hover:bg-white group-hover:shadow-md group-hover:text-blue-600">
                              {course.code?.substring(0, 2)}
                            </div>
                            <div>
                              <h3 className="font-bold text-[15px] text-[#1D1D1F] group-hover:text-blue-600 transition-colors">{course.name}</h3>
                              <div className="flex items-center gap-3 mt-1.5">
                                <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1 uppercase tracking-tight">
                                  <GraduationCap className="h-3 w-3" /> {course.code}
                                </span>
                                <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1 uppercase tracking-tight">
                                  <Clock className="h-3 w-3" /> {course.semester || "2026 Spring"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline" className={`rounded-full px-3 py-0.5 text-[9px] font-bold uppercase tracking-widest border-none ${
                            course.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'
                          }`}>
                            {course.status === 'active' ? '● 授课中' : '已归档'}
                          </Badge>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="text-center py-24">
                       <BookOpen className="h-12 w-12 text-gray-100 mx-auto mb-4" />
                       <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">暂无活跃课程</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. 快捷操作 & 辅助工具 (占1栏) */}
              <div className="space-y-6 flex flex-col h-full">
                {/* 快速发起卡片 */}
                <div className="bg-black rounded-[32px] p-7 text-white shadow-xl shadow-gray-300 relative overflow-hidden group">
                  <div className="absolute -right-6 -top-6 h-32 w-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all" />
                  <h4 className="font-bold text-lg mb-6 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-400 fill-yellow-400" /> 快速发起
                  </h4>
                  <div className="space-y-3">
                    <Link href="/teacher/courses/create">
                      <div className="flex items-center justify-between rounded-2xl bg-white/10 p-4 transition-all hover:bg-white/15 cursor-pointer backdrop-blur-md">
                        <div className="flex items-center gap-3">
                          <PlusCircle className="h-4 w-4" />
                          <span className="font-bold text-xs tracking-tight">创建新课程</span>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 opacity-50" />
                      </div>
                    </Link>
                    <Link href="/teacher/assignments/create">
                      <div className="flex items-center justify-between rounded-2xl bg-white/10 p-4 transition-all hover:bg-white/15 cursor-pointer backdrop-blur-md">
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4" />
                          <span className="font-bold text-xs tracking-tight">布置新作业</span>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 opacity-50" />
                      </div>
                    </Link>
                  </div>
                </div>

                {/* 辅助工具网格 */}
                <div className="bg-white rounded-[32px] p-7 border border-gray-100 shadow-sm flex-1">
                  <h4 className="font-bold text-sm text-[#1D1D1F] mb-6 uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                    <LayoutGrid className="h-3.5 w-3.5" /> 辅助工具
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <Link href="/teacher/questions">
                      <div className="flex flex-col items-start gap-4 p-5 rounded-[22px] bg-gray-50 hover:bg-blue-50 transition-all cursor-pointer group">
                        <div className="h-10 w-10 rounded-xl bg-white shadow-sm flex items-center justify-center group-hover:text-blue-600 transition-all">
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-800 tracking-tight">教学题库</span>
                      </div>
                    </Link>
                    <Link href="/teacher/exams/create">
                      <div className="flex flex-col items-start gap-4 p-5 rounded-[22px] bg-gray-50 hover:bg-indigo-50 transition-all cursor-pointer group">
                        <div className="h-10 w-10 rounded-xl bg-white shadow-sm flex items-center justify-center group-hover:text-indigo-600 transition-all">
                          <ClipboardList className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-800 tracking-tight">在线考务</span>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>

      <style>{`
        @keyframes wave {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(20deg); }
          75% { transform: rotate(-15deg); }
        }
        .animate-wave { animation: wave 2.5s infinite; transform-origin: 70% 70%; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </DashboardLayout>
  );
}