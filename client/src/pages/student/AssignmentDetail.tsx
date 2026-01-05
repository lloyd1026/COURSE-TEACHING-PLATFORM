"use client";

import { useState, useEffect } from "react";
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
import { QuestionRenderer } from "@/components/common/QuestionRenderer";

export default function StudentAssignmentDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const assignmentId = parseInt(id || "0");

  const { data: assignment, isLoading } = trpc.assignments.get.useQuery({ id: assignmentId });
  const { data: history, isLoading: isHistoryLoading } = trpc.submissions.getHistory.useQuery({ assignmentId }, { retry: false });

  const [answers, setAnswers] = useState<Record<number, any>>({});

  useEffect(() => {
    if (assignmentId) {
      const saved = localStorage.getItem(`assign_draft_${assignmentId}`);
      if (saved) setAnswers(JSON.parse(saved));
    }
  }, [assignmentId]);

  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      localStorage.setItem(`assign_draft_${assignmentId}`, JSON.stringify(answers));
    }
  }, [answers, assignmentId]);

  const submitMutation = trpc.submissions.submit.useMutation({
    onSuccess: () => {
      toast.success("作业提交成功");
      localStorage.removeItem(`assign_draft_${assignmentId}`);
      window.location.reload();
    },
    onError: err => toast.error(err.message),
  });

  if (isLoading || isHistoryLoading) return (
    <div className="h-screen flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-zinc-900" />
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">正在载入任务详情...</p>
    </div>
  );

  if (!assignment) return <div className="p-12 text-center font-bold">未找到作业信息</div>;

  // --- 场景 A: 已提交视图 ---
  if (history) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto px-6 py-16 text-center space-y-8">
          <div className="h-20 w-20 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">作业已提交</h1>
            <p className="text-zinc-400 text-sm flex items-center justify-center gap-2">
              <Calendar className="h-4 w-4" /> 提交时间：{new Date(history.submittedAt || "").toLocaleString()}
            </p>
          </div>
          <div className="inline-flex flex-col items-center p-8 bg-white rounded-[2rem] border border-zinc-100 shadow-xl min-w-[280px]">
             <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-2">本次得分</p>
             <div className="flex items-baseline gap-1">
               <span className="text-7xl font-black text-zinc-900">{history.totalScore}</span>
               <span className="text-sm font-bold text-zinc-400">分</span>
             </div>
             <div className="mt-6">
               {history.status === "submitted" ? (
                 <Badge className="bg-amber-100 text-amber-700 border-none px-4 py-1 rounded-full text-[10px] font-bold">待教师批阅主观题</Badge>
               ) : (
                 <Badge className="bg-emerald-100 text-emerald-700 border-none px-4 py-1 rounded-full text-[10px] font-bold">批阅已完成</Badge>
               )}
             </div>
          </div>
          <div className="pt-6">
            <Button onClick={() => setLocation("/student/assignments")} className="h-14 px-10 rounded-2xl bg-zinc-900 text-white font-bold">返回作业列表</Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // --- 场景 B: 答题视图 ---
  const handleSubmit = () => {
    const totalCount = (assignment as any).questions?.length || 0;
    const answeredCount = Object.keys(answers).filter(k => answers[Number(k)]?.toString().trim().length > 0).length;
    if (answeredCount < totalCount) {
      if (!confirm(`还有 ${totalCount - answeredCount} 道题未完成，确认提交吗？`)) return;
    }
    submitMutation.mutate({
      assignmentId,
      answers: Object.entries(answers).map(([qId, val]) => ({ questionId: parseInt(qId), content: val })),
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto px-6 py-8 pb-40 space-y-10">
        <header className="space-y-4">
          <Button variant="ghost" onClick={() => window.history.back()} className="p-0 h-auto text-zinc-400 text-[10px] font-black uppercase tracking-widest gap-2">
            <ChevronLeft className="h-3 w-3" /> 返回列表
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{assignment.title}</h1>
            <Badge className="bg-blue-50 text-blue-600 border-none rounded-md text-[9px] font-bold px-2 py-0.5">进行中</Badge>
          </div>
          <div className="flex items-center gap-5 text-xs font-bold text-zinc-400">
            <span className="flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" /> {(assignment as any).courseName}</span>
            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-rose-500" /> 截止时间: {new Date(assignment.dueDate).toLocaleString()}</span>
          </div>
        </header>

        {assignment.description && (
          <section className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100">
            <div className="flex items-center gap-2 mb-2">
               <AlertCircle className="h-3.5 w-3.5 text-zinc-400" />
               <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">任务要求</h3>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed font-medium">{assignment.description}</p>
          </section>
        )}

        <section className="space-y-12">
          {(assignment as any).questions?.map((q: any, index: number) => (
            <div key={q.id} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-start gap-4">
                <div className="h-8 w-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-md">
                  {index + 1}
                </div>
                <div className="space-y-4 flex-1">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-[9px] font-bold border-zinc-200 text-zinc-400 px-1.5 py-0">
                      {q.type === 'single_choice' && '单选题'}
                      {q.type === 'multiple_choice' && '多选题'}
                      {q.type === 'true_false' && '判断题'}
                      {q.type === 'fill_blank' && '填空题'}
                      {q.type === 'essay' && '简答题'}
                      {q.type === 'programming' && '编程题'}
                    </Badge>
                    <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest italic">分值: {q.score} 分</span>
                  </div>
                  <h2 className="text-base font-bold text-zinc-800 leading-relaxed">{q.content}</h2>
                  <div className="pt-2">
                    <QuestionRenderer
                      key={q.id}
                      question={q}
                      value={answers[q.id] || ""}
                      onChange={(val) => setAnswers(prev => ({ ...prev, [q.id]: val }))}
                    />
                  </div>
                </div>
              </div>
              {index < (assignment as any).questions.length - 1 && (
                <div className="h-px bg-zinc-100" />
              )}
            </div>
          ))}
        </section>

        <footer className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-xl z-[100]">
          <div className="bg-zinc-900 p-4 rounded-2xl shadow-2xl flex items-center justify-between px-6 text-white">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-emerald-400">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">答题进度</p>
                <p className="text-sm font-black italic">
                   {Object.keys(answers).filter(k => answers[Number(k)]?.toString().trim().length > 0).length} / {(assignment as any).questions?.length || 0} 已完成
                </p>
              </div>
            </div>
            <Button onClick={handleSubmit} disabled={submitMutation.isPending} className="h-11 px-8 rounded-xl bg-white text-zinc-900 font-bold text-xs gap-2 hover:bg-zinc-100 transition-all">
              {submitMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              确认提交作业
            </Button>
          </div>
        </footer>
      </div>
    </DashboardLayout>
  );
}