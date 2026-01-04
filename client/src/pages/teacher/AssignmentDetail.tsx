import { useParams, Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  ArrowLeft, FileText, Users, Clock, Loader2,
  BookOpen, Layers, ChevronRight, CheckCircle,
  Calendar, Info, Star, XCircle
} from "lucide-react";
import { KnowledgePointManager } from "@/components/KnowledgePointManager";

export default function AssignmentDetail() {
  const { id } = useParams<{ id: string }>();
  const assignmentId = parseInt(id || "0");

  // 1. 获取作业基础信息 (题目、班级、基本设置)
  const { data: assignment, isLoading: isAssignmentLoading } = trpc.assignments.get.useQuery({
    id: assignmentId
  });

  // 2. 获取真实的提交统计数据
  const { data: realStats, isLoading: isStatsLoading } = trpc.submissions.getAssignmentStats.useQuery(
    { assignmentId },
    { enabled: !!assignmentId, refetchInterval: 5000 } // 每5秒自动刷新一次数据
  );

  // 3. 获取关联知识点 (From HEAD)
  const { data: linkedKPs, refetch: refetchLinkedKPs } = trpc.knowledge.getLinkedPoints.useQuery(
    { entityType: "assignment", entityId: assignmentId },
    { enabled: !!assignmentId }
  );

  const linkPointMutation = trpc.knowledge.linkPoint.useMutation({
    onSuccess: () => {
      toast.success("关联成功");
      refetchLinkedKPs();
    },
    onError: (err) => toast.error(err.message)
  });

  const unlinkPointMutation = trpc.knowledge.unlinkPoint.useMutation({
    onSuccess: () => {
      toast.success("已取消关联");
      refetchLinkedKPs();
    },
    onError: (err) => toast.error(err.message)
  });

  const pointOperationsLoading = linkPointMutation.isPending || unlinkPointMutation.isPending;

  // 处理统计数据的默认状态
  const stats = realStats || {
    submitted: 0,
    totalStudents: 0,
    graded: 0,
    pending: 0
  };

  const STATUS_MAP: any = {
    published: { label: "进行中", color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
    draft: { label: "草稿", color: "bg-zinc-100 text-zinc-500 border-zinc-200" },
    closed: { label: "已截止", color: "bg-rose-50 text-rose-600 border-rose-100" },
  };

  if (isAssignmentLoading || isStatsLoading) {
    return (
      <DashboardLayout>
        <div className="h-screen flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-300" />
        </div>
      </DashboardLayout>
    );
  }

  if (!assignment) return <DashboardLayout><div className="p-12 text-center text-zinc-400">作业不存在</div></DashboardLayout>;

  const currentStatus = STATUS_MAP[assignment.status] || STATUS_MAP.draft;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8 text-zinc-900">

        {/* 页眉: 返回与核心信息 */}
        <header className="flex justify-between items-start">
          <div className="flex items-center gap-6">
            <Link href="/teacher/assignments">
              <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm border border-zinc-100">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold tracking-tight">{assignment.title}</h1>
                <Badge variant="outline" className={`rounded-full px-3 py-0.5 text-[10px] font-bold uppercase ${currentStatus.color}`}>
                  {currentStatus.label}
                </Badge>
              </div>
              <p className="text-zinc-400 text-xs flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5" /> 关联课程：{(assignment as any).courseName || "未知课程"}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href={`/teacher/assignments/${assignmentId}/grading`}>
              <Button className="rounded-xl bg-zinc-900 text-white font-bold text-xs h-10 px-6">
                进入批阅模式
              </Button>
            </Link>
          </div>
        </header>

        {/* 统计看板 */}
        <div className="grid md:grid-cols-4 gap-6">
          <StatCard
            icon={<Star className="text-amber-500" />}
            label="作业总分"
            value={(assignment as any).questions?.reduce((acc: number, q: any) => acc + (q.score || 0), 0) || 0}
            unit="分"
          />
          <StatCard
            icon={<Layers className="text-blue-500" />}
            label="题目数量"
            value={(assignment as any).questions?.length || 0}
            unit="道题"
          />
          <StatCard
            icon={<Users className="text-emerald-500" />}
            label="已提交人数"
            value={stats.submitted}
            unit={`/ ${stats.totalStudents} 人`}
          />
          <StatCard
            icon={<Clock className="text-rose-500" />}
            label="待批改份数"
            value={stats.pending}
            unit="份"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">

          {/* 左侧：题目详情 & 任务描述 */}
          <div className="lg:col-span-2 space-y-8">

            {/* 任务要求 */}
            <section className="bg-white rounded-[2.5rem] p-8 border border-zinc-100 shadow-sm">
              <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-4 flex items-center gap-2">
                <Info className="h-3.5 w-3.5" /> 任务描述与要求
              </h3>
              <div className="text-[14px] text-zinc-600 leading-relaxed whitespace-pre-wrap">
                {assignment.description || "老师很懒，没有留下描述信息..."}
              </div>
            </section>

            {/* 关联题目清单 */}
            <section className="space-y-4">
              <div className="px-2 flex justify-between items-center">
                <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5" /> 关联试题清单
                </h3>
                <span className="text-[10px] font-bold text-zinc-300">共 {(assignment as any).questions?.length || 0} 题</span>
              </div>
              <div className="space-y-3">
                {(assignment as any).questions?.map((q: any, idx: number) => (
                  <div key={q.id} className="group flex items-center justify-between p-5 bg-white border border-zinc-100 rounded-2xl hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                      <div className="h-8 w-8 rounded-full bg-zinc-50 flex items-center justify-center text-[10px] font-black text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-zinc-800">{q.title}</p>
                        <Badge variant="secondary" className="text-[9px] bg-zinc-50 text-zinc-400 px-1.5 py-0 mt-1 uppercase">
                          {q.type === 'essay' ? '简答题 (需人工)' : '客观题 (自动)'}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-zinc-900">{q.score} 分</span>
                      <ChevronRight className="h-4 w-4 text-zinc-200 ml-4 inline-block" />
                    </div>
                  </div>
                ))}
                {(!(assignment as any).questions || (assignment as any).questions.length === 0) && (
                  <div className="p-12 text-center border-2 border-dashed border-zinc-100 rounded-[2rem] text-zinc-300 text-[10px] font-bold uppercase tracking-widest">
                    该作业未关联在线题目
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* 右侧：分发状态 & 时间 & 知识点 */}
          <div className="space-y-6">
            <Card className="rounded-[2.5rem] border-none bg-zinc-900 text-white p-2 shadow-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> 交付时间窗口
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-white/10 rounded-2xl p-4">
                  <p className="text-[9px] font-black text-white/40 uppercase mb-1">截止日期</p>
                  <p className="text-lg font-bold">
                    {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : '未设置'}
                  </p>
                  <p className="text-[11px] font-medium text-white/60">
                    {assignment.dueDate ? new Date(assignment.dueDate).toLocaleTimeString() : '--:--'}
                  </p>
                </div>
                <div className="px-4">
                  <div className="flex justify-between text-[10px] font-bold text-white/40 mb-2 uppercase tracking-widest">
                    <span>分发班级</span>
                    <span>{(assignment as any).classIds?.length || 0} 个班级</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(assignment as any).targetClasses?.map((c: any) => (
                      <Badge key={c.id} className="bg-white/20 hover:bg-white/30 text-white border-none rounded-lg px-2 text-[10px]">
                        {c.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="p-8 bg-emerald-50 rounded-[2.5rem] border border-emerald-100">
              <CheckCircle className="h-6 w-6 text-emerald-500 mb-3" />
              <h4 className="text-sm font-bold text-emerald-900">自动判分已开启</h4>
              <p className="text-[11px] text-emerald-600/70 mt-1">
                客观题（单选/判断）将在提交后由系统计算，老师仅需批阅简答题。
              </p>
            </div>

            {/* 关联知识点 (Merged from HEAD) */}
            <Card className="rounded-[2.5rem] border border-zinc-100 shadow-sm p-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Layers className="h-4 w-4" /> 关联知识点
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <KnowledgePointManager
                  courseId={assignment.courseId}
                  linkedKPs={linkedKPs || []}
                  onLink={(kpId) => linkPointMutation.mutate({
                    knowledgePointId: kpId,
                    assignmentId: assignment.id
                  })}
                  onUnlink={(relId) => unlinkPointMutation.mutate({ relationId: relId })}
                  isLoading={pointOperationsLoading}
                />

                <div className="flex flex-wrap gap-2 mt-2">
                  {!linkedKPs || linkedKPs.length === 0 ? (
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest pl-2">暂未关联课程知识点</p>
                  ) : (
                    linkedKPs.map((kp: any) => (
                      <Badge key={kp.id} variant="secondary" className="px-2 py-1 bg-zinc-50 hover:bg-zinc-100 gap-1 text-[10px] rounded-lg">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                          {kp.name}
                        </div>
                        <button
                          className="ml-1 text-zinc-300 hover:text-red-500 transition-colors"
                          onClick={() => unlinkPointMutation.mutate({ relationId: kp.relationId })}
                        >
                          <XCircle className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// 统计卡片子组件
function StatCard({ icon, label, value, unit }: { icon: any, label: string, value: any, unit: string }) {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-zinc-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        {icon}
        <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-black tabular-nums">{value}</span>
        <span className="text-[10px] font-bold text-zinc-400 uppercase">{unit}</span>
      </div>
    </div>
  );
}