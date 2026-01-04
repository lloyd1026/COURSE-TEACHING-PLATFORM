import { useState } from "react";
import { useParams, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, Clock, BookOpen, AlertCircle, 
  Send, CheckCircle2, ChevronLeft, Trophy, Calendar
} from "lucide-react";
import { toast } from "sonner";

export default function StudentAssignmentDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const assignmentId = parseInt(id || "0");

  // 1. 获取作业基础信息及题目
  const { data: assignment, isLoading } = trpc.assignments.get.useQuery({
    id: assignmentId,
  });

  // 2. 获取该学生的提交状态
  const { data: history, isLoading: isHistoryLoading } =
    trpc.submissions.getHistory.useQuery({ assignmentId }, { retry: false });

  // 3. 答题状态存储
  const [answers, setAnswers] = useState<Record<number, string>>({});

  // 4. 提交接口对接
  const submitMutation = trpc.submissions.submit.useMutation({
    onSuccess: () => {
      toast.success("作业提交成功，客观题已自动阅卷");
      window.location.reload();
    },
    onError: err => toast.error(err.message),
  });

  if (isLoading || isHistoryLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
          正在加载任务数据...
        </p>
      </div>
    );
  }

  if (!assignment)
    return <div className="p-12 text-center font-bold">未找到作业信息</div>;

  // --- 场景 A: 已提交视图 (显示分数) ---
  if (history) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-6 py-20 text-center space-y-10 animate-in fade-in zoom-in duration-500">
          <div className="h-24 w-24 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-emerald-200">
            <CheckCircle2 className="h-12 w-12" />
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl font-black text-zinc-900 tracking-tighter">
              任务已达成
            </h1>
            <p className="text-zinc-400 text-sm font-medium flex items-center justify-center gap-2">
              <Calendar className="h-4 w-4" />
              提交于 {new Date(history.submittedAt || "").toLocaleString()}
            </p>
          </div>

          <div className="inline-flex flex-col items-center p-10 bg-zinc-50 rounded-[3rem] border border-zinc-100 relative overflow-hidden min-w-[320px]">
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] italic font-black text-6xl select-none">
              得分
            </div>
            <p className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] mb-4">
              当前已获得分数
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-8xl font-black text-zinc-900 leading-none">
                {history.totalScore}
              </span>
              <span className="text-xl font-black text-zinc-300 uppercase tracking-tighter">
                分
              </span>
            </div>

            <div className="mt-8 flex gap-2">
              {history.status === "submitted" ? (
                <Badge className="bg-amber-100 text-amber-700 border-none px-4 py-1.5 rounded-full text-[10px] font-black uppercase">
                  等待教师批阅主观题
                </Badge>
              ) : (
                <Badge className="bg-emerald-100 text-emerald-700 border-none px-4 py-1.5 rounded-full text-[10px] font-black uppercase">
                  批阅已完成
                </Badge>
              )}
            </div>
          </div>

          <div className="pt-10">
            <Button
              onClick={() => setLocation("/student/assignments")}
              className="h-16 px-12 rounded-[2rem] bg-zinc-900 text-white font-bold hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-zinc-200"
            >
              返回作业列表
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // --- 场景 B: 答题视图 (未提交) ---
  const handleSubmit = () => {
    const totalCount = (assignment as any).questions?.length || 0;
    const answeredCount = Object.keys(answers).length;

    if (answeredCount < totalCount) {
      if (!confirm(`还有 ${totalCount - answeredCount} 道题没写，确定要现在提交吗？`))
        return;
    }

    submitMutation.mutate({
      assignmentId,
      answers: Object.entries(answers).map(([qId, val]) => ({
        questionId: parseInt(qId),
        content: val,
      })),
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-6 py-8 pb-32 space-y-8">
        {/* 页眉 */}
        <header className="flex justify-between items-start">
          <div className="space-y-3">
            <Button
              variant="ghost"
              onClick={() => window.history.back()}
              className="p-0 h-auto hover:bg-transparent text-zinc-400 text-[10px] font-black uppercase tracking-widest gap-2"
            >
              <ChevronLeft className="h-3 w-3" /> 返回控制台
            </Button>
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-black tracking-tight text-zinc-900">
                {assignment.title}
              </h1>
              <Badge className="bg-blue-50 text-blue-600 border-none rounded-lg text-[10px] font-black px-3 py-1 uppercase tracking-tighter">
                进行中
              </Badge>
            </div>
            <div className="flex items-center gap-5 text-xs font-bold text-zinc-400">
              <span className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-zinc-300" />{" "}
                {(assignment as any).courseName}
              </span>
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-zinc-300" /> 截止日期：{" "}
                {new Date(assignment.dueDate).toLocaleString()}
              </span>
            </div>
          </div>
        </header>

        {/* 任务描述 */}
        {assignment.description && (
          <section className="p-8 bg-zinc-50/80 rounded-[2.5rem] border border-zinc-100/50">
            <h3 className="text-[10px] font-black uppercase text-zinc-300 mb-3 flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5" /> 任务说明
            </h3>
            <p className="text-sm text-zinc-600 leading-relaxed font-medium">
              {assignment.description}
            </p>
          </section>
        )}

        {/* 题目列表 */}
        <section className="space-y-12 pt-4">
          {(assignment as any).questions?.map((q: any, index: number) => (
            <div
              key={q.id}
              className="group space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <div className="flex items-start gap-6">
                <div className="h-10 w-10 rounded-2xl bg-zinc-900 text-white flex items-center justify-center text-sm font-black shrink-0 shadow-xl group-hover:scale-110 transition-transform">
                  {index + 1}
                </div>
                <div className="space-y-6 flex-1">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className="text-[9px] font-black uppercase border-zinc-200 text-zinc-400 px-2 py-0.5 rounded-md"
                    >
                      {/* 映射题型中文 */}
                      {q.type === 'single_choice' && '单选题'}
                      {q.type === 'multiple_choice' && '多选题'}
                      {q.type === 'true_false' && '判断题'}
                      {q.type === 'fill_blank' && '填空题'}
                      {q.type === 'essay' && '简答题'}
                      {q.type === 'programming' && '编程题'}
                    </Badge>
                    <span className="text-[10px] font-black text-zinc-300 uppercase italic tracking-widest">
                      本题分值: {q.score} 分
                    </span>
                  </div>

                  <h2 className="text-xl font-bold text-zinc-800 leading-snug">
                    {q.content}
                  </h2>

                  <div className="pt-2">
                    {q.type === "single_choice" ||
                    q.type === "multiple_choice" ? (
                      <ChoiceRenderer
                        options={q.options}
                        value={answers[q.id] || ""}
                        onChange={val =>
                          setAnswers({ ...answers, [q.id]: val })
                        }
                      />
                    ) : (
                      <textarea
                        className="w-full min-h-[160px] p-6 rounded-[2rem] bg-zinc-50 border-2 border-transparent focus:border-zinc-900 focus:bg-white outline-none transition-all text-sm font-bold placeholder:text-zinc-300 shadow-inner leading-relaxed"
                        placeholder="在此输入你的回答..."
                        value={answers[q.id] || ""}
                        onChange={e =>
                          setAnswers({ ...answers, [q.id]: e.target.value })
                        }
                      />
                    )}
                  </div>
                </div>
              </div>
              {index < (assignment as any).questions.length - 1 && (
                <div className="h-px bg-zinc-100 ml-16" />
              )}
            </div>
          ))}
        </section>

        {/* 底部悬浮操作条 */}
        <footer className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[calc(100%-4rem)] max-w-2xl z-50">
          <div className="bg-white/90 backdrop-blur-2xl border border-white/50 p-5 rounded-[3rem] shadow-[0_40px_80px_-12px_rgba(0,0,0,0.15)] flex items-center justify-between px-10">
            <div className="flex items-center gap-5">
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
                <Trophy className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-black text-zinc-900 uppercase tracking-tighter">
                  答题进度检查
                </p>
                <p className="text-[10px] font-bold text-zinc-400">
                  已完成 {Object.keys(answers).length} /{" "}
                  {(assignment as any).questions?.length || 0} 道题目
                </p>
              </div>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
              className="h-14 px-10 rounded-[1.5rem] bg-zinc-900 text-white font-bold text-xs gap-3 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-zinc-300"
            >
              {submitMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              确认提交作业
            </Button>
          </div>
        </footer>
      </div>
    </DashboardLayout>
  );
}

// 辅助组件：选择题渲染器 (汉化适配)
function ChoiceRenderer({
  options,
  value,
  onChange,
}: {
  options: any;
  value: string;
  onChange: (v: string) => void;
}) {
  const parsedOptions =
    typeof options === "string" ? JSON.parse(options) : options || [];

  return (
    <div className="grid gap-4">
      {parsedOptions.map((opt: any) => {
        const isSelected = value === opt.label;
        return (
          <button
            key={opt.label}
            onClick={() => onChange(opt.label)}
            className={`flex items-center gap-5 p-5 rounded-[1.5rem] border-2 transition-all text-left group ${
              isSelected
                ? "border-zinc-900 bg-zinc-900 text-white shadow-xl scale-[1.02]"
                : "border-zinc-100 bg-zinc-50 hover:border-zinc-300 hover:bg-white"
            }`}
          >
            <div
              className={`h-8 w-8 rounded-xl flex items-center justify-center text-xs font-black transition-colors ${
                isSelected
                  ? "bg-white text-zinc-900"
                  : "bg-white border-2 border-zinc-100 text-zinc-400 group-hover:border-zinc-900"
              }`}
            >
              {opt.label}
            </div>
            <span className="text-sm font-bold leading-none">{opt.text}</span>
          </button>
        );
      })}
    </div>
  );
}