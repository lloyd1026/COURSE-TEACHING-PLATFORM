"use client";

import { useParams, Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { 
  ArrowLeft, Clock, Users, FileText, Loader2, 
  Calendar, Award, Layout, CheckSquare, Settings,
  MessageSquare, Layers
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ExamDetail() {
  const { id } = useParams<{ id: string }>();
  const examId = parseInt(id || "0");
  
  const { data: exam, isLoading } = trpc.exams.get.useQuery({ id: examId });

  // 状态中文映射
  const STATUS_MAP: any = {
    ongoing: { label: "进行中", color: "text-emerald-500", bg: "bg-emerald-50" },
    ended: { label: "已结束", color: "text-zinc-400", bg: "bg-zinc-50" },
    not_started: { label: "未开始", color: "text-blue-500", bg: "bg-blue-50" },
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-zinc-900" />
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">正在调取考试档案...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!exam) return <div className="p-12 text-center">考试不存在或已被删除</div>;

  const status = STATUS_MAP[exam.status || 'not_started'];

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        
        {/* 1. Header: 简约大气 */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <Link href="/teacher/exams">
              <Button variant="ghost" size="icon" className="rounded-2xl bg-white shadow-sm h-12 w-12 border border-zinc-100">
                <ArrowLeft className="h-5 w-5 text-zinc-900" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{exam.title}</h1>
                <Badge className={`${status.bg} ${status.color} border-none rounded-lg text-[10px] font-black px-3 py-1 uppercase`}>
                  {status.label}
                </Badge>
              </div>
              <p className="text-zinc-400 text-xs mt-1 flex items-center gap-2 font-medium">
                <Calendar className="h-3.5 w-3.5 text-zinc-300" /> 
                考试时间：{new Date(exam.startTime).toLocaleString("zh-CN")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
             {/* 核心操作：批改 */}
             <Link href={`/teacher/exams/${examId}/grading`}>
              <Button className="h-14 px-10 rounded-[1.5rem] bg-zinc-900 text-white font-bold shadow-2xl hover:scale-105 active:scale-95 transition-all gap-2">
                <CheckSquare className="h-5 w-5" /> 进入批阅模式
              </Button>
            </Link>
          </div>
        </header>

        {/* 2. 数据统计：四格紧凑布局 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: "考试时长", value: `${exam.duration}`, unit: "分钟", icon: Clock, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "试卷总分", value: `${exam.totalScore || 0}`, unit: "分", icon: Award, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "分发班级", value: `${exam.classIds?.length || 0}`, unit: "个", icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
            { label: "题目总数", value: `${exam.questions?.length || 0}`, unit: "道", icon: FileText, color: "text-zinc-600", bg: "bg-zinc-100" },
          ].map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-[2rem] border border-zinc-100 flex items-center gap-4">
              <div className={`h-12 w-12 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center shrink-0`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">{stat.label}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-black text-zinc-900">{stat.value}</span>
                  <span className="text-[10px] font-bold text-zinc-400">{stat.unit}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 3. 详细内容 */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* 班级列表 */}
            <section className="bg-white rounded-[2.5rem] p-8 border border-zinc-100">
              <h3 className="text-sm font-black uppercase text-zinc-900 mb-6 flex items-center gap-2 tracking-widest">
                <Layers className="h-4 w-4" /> 关联班级清单
              </h3>
              <div className="flex flex-wrap gap-3">
                {exam.targetClasses?.map((cls: any) => (
                  <div key={cls.id} className="flex items-center gap-3 px-5 py-3 bg-zinc-50 rounded-2xl border border-zinc-100">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-sm font-bold text-zinc-700">{cls.name}</span>
                  </div>
                ))}
                {(!exam.targetClasses || exam.targetClasses.length === 0) && (
                  <p className="text-sm text-zinc-300 italic">尚未指派任何班级</p>
                )}
              </div>
            </section>

            {/* 说明 */}
            <section className="bg-white rounded-[2.5rem] p-8 border border-zinc-100">
              <h3 className="text-sm font-black uppercase text-zinc-900 mb-4 flex items-center gap-2 tracking-widest">
                <MessageSquare className="h-4 w-4" /> 考试注意事项
              </h3>
              <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-50 min-h-[100px]">
                <p className="text-sm text-zinc-500 leading-relaxed font-medium">
                  {exam.description || "暂无备注。"}
                </p>
              </div>
            </section>
          </div>

          {/* 右侧：快速导航 */}
          <div className="space-y-6">
            <div className="p-8 bg-zinc-900 rounded-[2.5rem] text-white space-y-6 shadow-2xl">
              <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center">
                <Settings className="h-6 w-6 text-zinc-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold">内容管理</h3>
                <p className="text-xs text-zinc-500 mt-1">您可以调整试卷题目或重新编辑基本信息</p>
              </div>
              <div className="pt-4 space-y-3">
                <Link href={`/teacher/exams/${examId}/questions`}>
                  <Button variant="outline" className="w-full h-12 rounded-xl bg-transparent border-white/10 hover:bg-white/5 text-white font-bold gap-2">
                    <Layout className="h-4 w-4" /> 调整题目配置
                  </Button>
                </Link>
                <Button variant="outline" className="w-full h-12 rounded-xl bg-transparent border-white/10 hover:bg-white/5 text-zinc-500 font-bold gap-2">
                   更多设置...
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}