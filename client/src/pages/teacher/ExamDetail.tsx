"use client";

import { useParams, Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  ArrowLeft, FileText, Users, Clock, Loader2,
  BookOpen, Layers, ChevronRight, CheckCircle,
  Calendar, Info, Star, ShieldCheck, Activity,
  Settings, Layout
} from "lucide-react";

export default function ExamDetail() {
  const { id } = useParams<{ id: string }>();
  const examId = parseInt(id || "0");

  // 1. 获取考试基础信息
  const { data: exam, isLoading: isExamLoading } = trpc.exams.get.useQuery({
    id: examId
  });

  // 2. 获取真实的考试统计数据 (对应之前 Service 中的 getExamStats)
  const { data: stats, isLoading: isStatsLoading } = trpc.exams.getStats.useQuery(
    { examId },
    { enabled: !!examId, refetchInterval: 10000 } // 考试期间10秒刷新一次
  );

  const STATUS_MAP: any = {
    in_progress: { label: "进行中", color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
    not_started: { label: "未开始", color: "bg-blue-50 text-blue-600 border-blue-100" },
    ended: { label: "已结束", color: "bg-zinc-100 text-zinc-500 border-zinc-200" },
  };

  if (isExamLoading || isStatsLoading) {
    return (
      <DashboardLayout>
        <div className="h-screen flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-300" />
        </div>
      </DashboardLayout>
    );
  }

  if (!exam) return <DashboardLayout><div className="p-12 text-center text-zinc-400">考试档案不存在</div></DashboardLayout>;

  const currentStatus = STATUS_MAP[exam.status] || STATUS_MAP.not_started;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8 text-zinc-900 font-sans">

        {/* Header Section */}
        <header className="flex justify-between items-start">
          <div className="flex items-center gap-6">
            <Link href="/teacher/exams">
              <Button variant="ghost" size="icon" className="rounded-2xl bg-white shadow-sm border border-zinc-100 h-12 w-12 hover:bg-zinc-50 transition-all">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold tracking-tight">{exam.title}</h1>
                <Badge variant="outline" className={`rounded-full px-3 py-0.5 text-[10px] font-black uppercase tracking-widest ${currentStatus.color}`}>
                  {currentStatus.label}
                </Badge>
              </div>
              <p className="text-zinc-400 text-xs flex items-center gap-2 font-medium">
                <BookOpen className="h-3.5 w-3.5" /> 关联课程：{exam.courseName || "通用课程"}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href={`/teacher/exams/${examId}/grading`}>
              <Button className="rounded-2xl bg-zinc-900 hover:bg-black text-white font-bold text-xs h-12 px-8 shadow-xl transition-all active:scale-95">
                进入批阅模式
              </Button>
            </Link>
          </div>
        </header>

        {/* 统计看板: 模仿 StatCard 布局 */}
        <div className="grid md:grid-cols-4 gap-6">
          <StatCard
            icon={<Star className="text-amber-500" />}
            label="考试总分"
            value={exam.totalScore || 0}
            unit="分"
          />
          <StatCard
            icon={<Clock className="text-blue-500" />}
            label="考试时长"
            value={exam.duration}
            unit="分钟"
          />
          <StatCard
            icon={<Users className="text-emerald-500" />}
            label="实时交卷率"
            value={stats?.submitted || 0}
            unit={`/ ${stats?.totalStudents || 0} 人`}
          />
          <StatCard
            icon={<ShieldCheck className="text-purple-500" />}
            label="待批改题目"
            value={stats?.pending || 0}
            unit="份答卷"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">

          {/* 左侧：描述与题目详情 */}
          <div className="lg:col-span-2 space-y-8">

            {/* 考试说明 */}
            <section className="bg-white rounded-[2.5rem] p-8 border border-zinc-100 shadow-sm">
              <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-4 flex items-center gap-2">
                <Info className="h-3.5 w-3.5" /> 考试说明与纪律要求
              </h3>
              <div className="text-[14px] text-zinc-600 leading-relaxed whitespace-pre-wrap italic">
                {exam.description || "暂无特殊说明。"}
              </div>
            </section>

            {/* 试卷结构清单 */}
            <section className="space-y-4">
              <div className="px-2 flex justify-between items-center">
                <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5" /> 试卷结构清单
                </h3>
                <Link href={`/teacher/exams/${examId}/questions`}>
                  <Button variant="ghost" className="text-[10px] font-bold text-blue-500 hover:text-blue-600 gap-1">
                    <Layout className="h-3 w-3" /> 修改题目配置
                  </Button>
                </Link>
              </div>
              <div className="space-y-3">
                {exam.questions?.map((q: any, idx: number) => (
                  <div key={q.id} className="group flex items-center justify-between p-6 bg-white border border-zinc-100 rounded-3xl hover:shadow-lg transition-all border-l-4 border-l-transparent hover:border-l-zinc-900">
                    <div className="flex items-center gap-5">
                      <div className="h-10 w-10 rounded-2xl bg-zinc-50 flex items-center justify-center text-[11px] font-black text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white transition-all">
                        {String(idx + 1).padStart(2, '0')}
                      </div>
                      <div>
                        <p className="text-[14px] font-bold text-zinc-800">{q.title}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="secondary" className="text-[9px] bg-zinc-100 text-zinc-500 px-2 py-0 uppercase border-none">
                            {q.type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <span className="text-[14px] font-black text-zinc-900">{q.score}</span>
                        <span className="text-[10px] text-zinc-400 ml-1">Pts</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-zinc-200 group-hover:text-zinc-900 transition-all" />
                    </div>
                  </div>
                ))}
                {!exam.questions?.length && (
                  <div className="p-16 text-center border-2 border-dashed border-zinc-100 rounded-[3rem] text-zinc-300 text-[10px] font-black uppercase tracking-[0.3em]">
                    当前试卷尚未配置题目
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* 右侧：深色看板与辅助信息 */}
          <div className="space-y-6">
            
            {/* 考试时间看板: 模仿深色 Card 设计 */}
            <Card className="rounded-[3rem] border-none bg-zinc-900 text-white p-3 shadow-2xl">
              <CardHeader className="pb-4 pt-6 px-6">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-400" /> 考试时间安排
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-6 pb-8">
                <div className="bg-white/5 rounded-[2rem] p-6 border border-white/5">
                  <p className="text-[9px] font-black text-white/30 uppercase mb-2 tracking-widest">开始时间 (Start At)</p>
                  <p className="text-xl font-bold">
                    {exam.startTime ? new Date(exam.startTime).toLocaleDateString() : '未设置'}
                  </p>
                  <p className="text-[12px] font-medium text-blue-400 mt-1">
                    {exam.startTime ? new Date(exam.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                  </p>
                </div>
                
                <div className="px-2 py-2">
                  <div className="flex justify-between text-[10px] font-black text-white/30 mb-4 uppercase tracking-[0.2em]">
                    <span>分发对象</span>
                    <span>{exam.classIds?.length || 0} CLASSES</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {exam.targetClasses?.map((c: any) => (
                      <Badge key={c.id} className="bg-white/10 hover:bg-white/20 text-white/80 border-none rounded-xl px-3 py-1 text-[10px] font-medium transition-colors">
                        {c.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 安全校验状态 */}
            <div className="p-8 bg-zinc-50 rounded-[3rem] border border-zinc-100 space-y-4">
              <div className="h-10 w-10 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                <Activity className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <h4 className="text-sm font-black text-zinc-900 uppercase tracking-tight">自动阅卷引擎</h4>
                <p className="text-[11px] text-zinc-500 mt-2 leading-relaxed">
                  系统已连接题库标准答案，单选、多选、判断题将在收卷后自动核算分数，主观题需手动确认。
                </p>
              </div>
            </div>

            {/* 快捷操作 */}
            <Card className="rounded-[2.5rem] border border-zinc-100 shadow-sm p-4 bg-white">
               <CardContent className="pt-4 space-y-3">
                  <Button variant="outline" className="w-full justify-between rounded-2xl border-zinc-100 h-12 text-xs font-bold hover:bg-zinc-50">
                    <span className="flex items-center gap-2"><Settings className="h-4 w-4" /> 考试高级设置</span>
                    <ChevronRight className="h-3 w-3" />
                  </Button>
               </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// 统计卡片子组件 (保持与作业版一致)
function StatCard({ icon, label, value, unit }: { icon: any, label: string, value: any, unit: string }) {
  return (
    <div className="bg-white p-7 rounded-[2.5rem] border border-zinc-100 shadow-sm hover:shadow-lg transition-all duration-300">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-8 w-8 rounded-xl bg-zinc-50 flex items-center justify-center">
          {icon}
        </div>
        <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">{label}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-black tabular-nums tracking-tighter">{value}</span>
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">{unit}</span>
      </div>
    </div>
  );
}