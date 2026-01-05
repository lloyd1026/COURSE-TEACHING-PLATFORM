"use client";

import { useState, useEffect } from "react";
import { useParams } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Save, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function ExamGradingDetail() {
  const { submissionId } = useParams<{ submissionId: string }>();
  const sId = parseInt(submissionId || "0");
  const utils = trpc.useUtils();

  // 1. 获取考试提交详情
  const { data, isLoading } = trpc.exams.getSubmissionDetail.useQuery({ submissionId: sId });
  const [scores, setScores] = useState<Record<number, number>>({});

  // 2. 保存评分 Mutation (沿用 submissions 路由的 saveGrades，因为底层表结构一致)
  const saveMutation = trpc.submissions.saveGrades.useMutation({
    onSuccess: () => {
      toast.success("考试评分已核定并发布！");
      utils.exams.getSubmissions.invalidate(); // 刷新考试名单列表
      window.history.back();
    }
  });

  // 3. 初始分数逻辑：对客观题进行智能纠偏回填
  useEffect(() => {
    if (data?.details) {
      const initialScores: Record<number, number> = {};
      data.details.forEach((d: any) => {
        const savedScore = Number(d.score || 0);
        const isObjective = ["single_choice", "multiple_choice", "true_false"].includes(d.type);
        
        // 如果后端还没分(0)且系统判定正确，自动回填满分给老师参考
        if (savedScore === 0 && d.isCorrect && isObjective) {
          initialScores[d.detailId] = Number(d.maxScore || 0);
        } else {
          initialScores[d.detailId] = savedScore;
        }
      });
      setScores(initialScores);
    }
  }, [data]);

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-zinc-300" /></div>;
  if (!data) return <div className="p-12 text-center font-bold">未找到相关考试记录</div>;

  const handleSave = () => {
    saveMutation.mutate({
      submissionId: sId,
      grades: Object.entries(scores).map(([detailId, score]) => ({
        detailId: parseInt(detailId),
        score
      }))
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Header: 延续作业风格 */}
        <header className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="rounded-xl border border-zinc-100"><ArrowLeft className="h-4 w-4" /></Button>
            <div>
              <h1 className="text-xl font-black uppercase">考试批阅：{data.submission.studentName}</h1>
              <p className="text-xs text-zinc-400 font-bold">{data.submission.examTitle}</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-zinc-900 hover:bg-black text-white gap-2 rounded-xl px-6 h-11 font-bold">
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            核定分数并发布
          </Button>
        </header>

        {/* 答题列表: 延续作业版大圆角卡片布局 */}
        <div className="space-y-6">
          {data.details.map((q: any, idx: number) => {
             const isObjective = ["single_choice", "multiple_choice", "true_false"].includes(q.type);

             return (
              <div key={q.detailId} className="bg-white border border-zinc-100 rounded-[2rem] p-8 space-y-4 shadow-sm">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-zinc-100 text-zinc-500 border-none uppercase text-[9px] font-black">{q.type}</Badge>
                    {isObjective && (
                      <div className={`flex items-center gap-1 text-[10px] font-bold ${q.isCorrect ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {q.isCorrect ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                        {q.isCorrect ? '系统匹配' : '系统不匹配'}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-tight">判定得分</span>
                    <input 
                      type="number" 
                      value={scores[q.detailId] ?? 0}
                      onChange={(e) => setScores({...scores, [q.detailId]: parseFloat(e.target.value) || 0})}
                      className={`w-20 rounded-lg px-2 py-1 text-center font-black text-sm outline-none border-2 transition-all ${
                        isObjective && q.isCorrect ? 'bg-emerald-50 border-emerald-100' : 'bg-zinc-50 border-transparent focus:border-zinc-900'
                      }`}
                    />
                    <span className="text-xs font-bold text-zinc-300">/ {q.maxScore}</span>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-zinc-800 leading-relaxed">{idx + 1}. {q.content}</h3>

                {/* 左右对比布局 */}
                <div className="grid md:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">考生回答</p>
                    <div className="p-4 bg-zinc-50 rounded-2xl text-sm font-medium text-zinc-600 min-h-[60px] border border-zinc-100/50">
                      {q.studentAnswer || <span className="text-zinc-300 italic">未作答 (Empty)</span>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-emerald-500/50 tracking-widest">标准答案及解析</p>
                    <div className="p-4 bg-emerald-50/30 rounded-2xl text-sm font-bold text-emerald-700 border border-emerald-100/50">
                      <div className="mb-2">答案：{q.standardAnswer}</div>
                      {q.analysis && (
                        <div className="pt-2 border-t border-emerald-100/30 text-[11px] font-medium text-emerald-600/70">
                          解析：{q.analysis}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}} />
    </DashboardLayout>
  );
}