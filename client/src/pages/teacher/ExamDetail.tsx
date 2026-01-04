import { useParams, Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { 
  ArrowLeft, Clock, Users, FileText, Loader2, 
  Calendar, Award, Layout, ChevronRight, Settings,
  MessageSquare, Layers
} from "lucide-react";

export default function ExamDetail() {
  const { id } = useParams<{ id: string }>();
  const examId = parseInt(id || "0");
  
  // 这里获取的 exam 现在包含 targetClasses 数组和 courseName
  const { data: exam, isLoading } = trpc.exams.get.useQuery({ id: examId });

  const STATUS_CONFIG: any = {
    ongoing: { label: "进行中", color: "text-emerald-500", bg: "bg-emerald-50" },
    ended: { label: "已结束", color: "text-zinc-400", bg: "bg-zinc-50" },
    not_started: { label: "未开始", color: "text-blue-500", bg: "bg-blue-50" },
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="h-[80vh] flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-zinc-200" />
        </div>
      </DashboardLayout>
    );
  }

  if (!exam) return null;

  const status = STATUS_CONFIG[exam.status || 'not_started'];

  return (
    <DashboardLayout>
      <div className="relative max-w-6xl mx-auto px-8 py-10 space-y-8 font-sans overflow-hidden">
        
        {/* 背景装饰 */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50/30 rounded-full blur-[100px] -z-10" />

        {/* 顶部导航与操作 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <Link href="/teacher/exams">
              <Button variant="ghost" size="icon" className="rounded-2xl bg-white shadow-sm hover:bg-zinc-50 h-12 w-12 transition-all">
                <ArrowLeft className="h-5 w-5 text-zinc-600" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{exam.title}</h1>
                <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-current/10 ${status.bg} ${status.color}`}>
                  {status.label}
                </span>
              </div>
              <p className="text-zinc-400 text-sm mt-1 flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" /> 
                {new Date(exam.startTime).toLocaleString("zh-CN", { dateStyle: 'full', timeStyle: 'short' })} 开考
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" className="h-12 px-6 rounded-2xl border-white bg-white/50 backdrop-blur-md shadow-sm font-bold text-zinc-600 hover:bg-white transition-all gap-2">
              <Settings className="h-4 w-4" /> 考试设置
            </Button>
            {/* 核心入口：跳转到题目配置 */}
            <Link href={`/teacher/exams/${examId}/questions`}>
              <Button className="h-12 px-8 rounded-2xl bg-zinc-900 text-white font-bold shadow-xl shadow-zinc-200 hover:scale-105 active:scale-95 transition-all gap-2">
                <Layout className="h-4 w-4" /> 设计试卷题目
              </Button>
            </Link>
          </div>
        </div>

        {/* 数据面板 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: "考试时长", value: `${exam.duration}`, unit: "Minutes", icon: Clock, color: "text-blue-500", bg: "bg-blue-50" },
            { label: "试卷总分", value: `${exam.totalScore || 100}`, unit: "Points", icon: Award, color: "text-purple-500", bg: "bg-purple-50" },
            { label: "分发班级", value: `${exam.classIds?.length || 0}`, unit: "Classes", icon: Users, color: "text-orange-500", bg: "bg-orange-50" },
            { label: "已收卷", value: "0", unit: "Submissions", icon: FileText, color: "text-emerald-500", bg: "bg-emerald-50" },
          ].map((stat, i) => (
            <Card key={i} className="border-none shadow-sm bg-white/60 backdrop-blur-md rounded-[2rem] overflow-hidden">
              <CardContent className="p-8 flex items-center gap-5">
                <div className={`h-14 w-14 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="h-7 w-7" />
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold tracking-tighter text-zinc-900">{stat.value}</span>
                    <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">{stat.unit}</span>
                  </div>
                  <p className="text-xs font-bold text-zinc-400 mt-0.5">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* 左侧：分发班级与考试说明 */}
          <div className="lg:col-span-2 space-y-8">
            {/* 班级卡片 */}
            <Card className="border-none shadow-sm bg-white/60 backdrop-blur-md rounded-[2.5rem] p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-zinc-800 flex items-center gap-2">
                  <Layers className="h-5 w-5 text-blue-500" /> 分发班级
                </h3>
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Active Recipients</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {exam.targetClasses?.map((cls: any) => (
                  <div key={cls.id} className="flex items-center justify-between p-5 bg-white rounded-2xl border border-zinc-100 shadow-sm group hover:border-blue-200 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-400 font-bold text-xs group-hover:bg-blue-50 group-hover:text-blue-500 transition-all">
                        {cls.name.substring(0, 1)}
                      </div>
                      <span className="font-bold text-zinc-700">{cls.name}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-200 group-hover:text-blue-300 transition-all" />
                  </div>
                ))}
                {(!exam.targetClasses || exam.targetClasses.length === 0) && (
                  <p className="text-sm text-zinc-400 italic">尚未指派任何班级</p>
                )}
              </div>
            </Card>

            {/* 考试说明 */}
            <Card className="border-none shadow-sm bg-white/60 backdrop-blur-md rounded-[2.5rem] p-8">
              <h3 className="text-lg font-bold text-zinc-800 mb-4 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-purple-500" /> 考试说明
              </h3>
              <div className="bg-white/50 rounded-2xl p-6 border border-white min-h-[120px]">
                <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap italic">
                  {exam.description || "暂无考试纪律说明或备注信息。"}
                </p>
              </div>
            </Card>
          </div>

          {/* 右侧：统计概览或快速入口 */}
          <div className="space-y-8">
            <Card className="border-none shadow-sm bg-zinc-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                <Award className="h-24 w-24" />
              </div>
              <h3 className="text-lg font-bold mb-2">成绩速报</h3>
              <p className="text-zinc-400 text-xs mb-8">数据将根据考生提交实时更新</p>
              
              <div className="space-y-6">
                <div className="flex justify-between items-end">
                  <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">平均分</span>
                  <span className="text-2xl font-bold">--</span>
                </div>
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-0 transition-all duration-1000" />
                </div>
                <div className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-500">
                  <span>Lowest: 0</span>
                  <span>Highest: 0</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
      `}</style>
    </DashboardLayout>
  );
}