"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Loader2, ArrowLeft, Save, CheckCircle2, 
  XCircle, BookOpen, User, Hash, AlertCircle 
} from "lucide-react";
import { toast } from "sonner";
import { QuestionRenderer } from "@/components/common/QuestionRenderer";

export default function ExamGradingDetail() {
  const { submissionId } = useParams<{ submissionId: string }>();
  const sId = parseInt(submissionId || "0");
  const utils = trpc.useUtils();

  // 1. ⚡️ 对齐路由名：使用 trpc.exams.getSubmissionDetail
  const { data, isLoading } = trpc.exams.getSubmissionDetail.useQuery({ submissionId: sId });
  const [scores, setScores] = useState<Record<number, number>>({});

  // 2. ⚡️ 对齐路由名：使用 trpc.submissions.saveGrades (假设在 submissions 路由下)
  // 如果你的保存接口也在 exams 下，请自行调整
  const saveMutation = trpc.submissions.saveGrades.useMutation({
    onSuccess: () => {
      toast.success("考试评分已成功同步至成绩单");
      utils.exams.getSubmissions.invalidate(); // 刷新列表页状态
      window.history.back();
    },
    onError: (err) => toast.error(err.message)
  });

  // 3. 计算当前实时总分
  const currentTotal = useMemo(() => {
    return Object.values(scores).reduce((sum, s) => sum + s, 0).toFixed(2);
  }, [scores]);

  // 初始化分数状态
  useEffect(() => {
    if (data?.details) {
      const initialScores: Record<number, number> = {};
      data.details.forEach((d: any) => {
        initialScores[d.detailId] = Number(d.score || 0);
      });
      setScores(initialScores);
    }
  }, [data]);

  if (isLoading) return (
    <div className="h-screen flex flex-col items-center justify-center gap-4 bg-zinc-50">
      <Loader2 className="h-10 w-10 animate-spin text-zinc-900" />
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">正在调取密封试卷...</p>
    </div>
  );

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
      <div className="max-w-5xl mx-auto px-6 py-10 pb-32 space-y-10">
        
        {/* Header */}
        <header className="flex justify-between items-center bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-sm">
          <div className="flex items-center gap-6">
            <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="h-12 w-12 rounded-2xl bg-zinc-50">
              <ArrowLeft className="h-5 w-5 text-zinc-900" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black tracking-tight text-zinc-900">{data.submission.studentName}</h1>
                <Badge className="bg-zinc-900 text-white border-none rounded-lg text-[10px] font-black px-3 py-1 uppercase tracking-tighter">Exam Grading</Badge>
              </div>
              <p className="text-zinc-400 text-xs font-bold mt-1 flex items-center gap-4">
                <span className="flex items-center gap-1.5"><Hash className="h-3.5 w-3.5" /> ID: {data.submission.studentId || sId}</span>
                <span className="flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" /> {data.submission.examTitle}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-10">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest mb-1">当前核定分数</span>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-black text-zinc-900 tabular-nums">{currentTotal}</span>
                <span className="text-sm font-bold text-zinc-400 uppercase italic">Pts</span>
              </div>
            </div>
            <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-zinc-900 hover:bg-black text-white gap-2 rounded-2xl h-16 px-10 font-bold shadow-2xl transition-all active:scale-95">
              {saveMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              完成评分并入库
            </Button>
          </div>
        </header>

        {/* 答题列表 */}
        <div className="space-y-12">
          {data.details.map((q: any, idx: number) => {
            const isObjective = ["single_choice", "multiple_choice", "true_false"].includes(q.type);
            
            return (
              <div key={q.detailId} className="group relative grid grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* 左侧：题目展示 */}
                <div className="col-span-8 bg-white border border-zinc-100 rounded-[2.5rem] p-10 shadow-sm">
                  <div className="flex justify-between items-start mb-6">
                    <Badge className="bg-zinc-50 text-zinc-400 border-none uppercase text-[9px] font-black px-3 py-1">
                      {q.type}
                    </Badge>
                    {isObjective && (
                      <div className={`flex items-center gap-2 text-[11px] font-black uppercase ${q.isCorrect ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {q.isCorrect ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        {q.isCorrect ? '系统校验正确' : '系统校验错误'}
                      </div>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-zinc-800 leading-relaxed mb-8">
                    <span className="text-zinc-300 mr-2 italic">{idx + 1}.</span> {q.content}
                  </h3>

                  <div className="space-y-6">
                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase text-zinc-300 tracking-widest flex items-center gap-2">
                        <User className="h-3 w-3" /> 学生提交内容
                      </p>
                      <div className="p-1 rounded-[1.5rem] bg-zinc-50/50 border border-zinc-100/50">
                        <QuestionRenderer question={q} value={q.studentAnswer} readOnly={true} onChange={() => {}} />
                      </div>
                    </div>

                    <div className="p-6 bg-emerald-50/50 rounded-2xl border border-emerald-100/50">
                      <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest mb-2">标准参考答案</p>
                      <p className="text-sm font-bold text-emerald-800">{q.standardAnswer || '未设置'}</p>
                    </div>
                  </div>
                </div>

                {/* 右侧：评分控制 */}
                <div className="col-span-4 pt-6">
                  <div className="sticky top-24 space-y-4">
                    <div className="bg-zinc-900 p-8 rounded-[2.5rem] text-white shadow-2xl">
                       <label className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] block mb-4">本题得分判定</label>
                       <div className="flex items-center gap-4">
                          <Input 
                            type="number" 
                            value={scores[q.detailId] ?? 0}
                            onChange={(e) => setScores({...scores, [q.detailId]: parseFloat(e.target.value) || 0})}
                            className="h-16 bg-white/10 border-none rounded-2xl text-3xl font-black text-center text-white focus:ring-2 focus:ring-emerald-500 transition-all"
                          />
                          <div className="flex flex-col">
                            <span className="text-zinc-500 font-black text-xs">/ MAX</span>
                            <span className="text-xl font-black text-white">{q.maxScore}</span>
                          </div>
                       </div>
                    </div>
                    
                    <div className="px-6 py-4 bg-zinc-100 rounded-2xl flex items-center gap-3">
                      <AlertCircle className="h-4 w-4 text-zinc-400" />
                      <p className="text-[10px] font-bold text-zinc-400 leading-tight uppercase">客观题已由系统初评，主观题需人工审核得分</p>
                    </div>
                  </div>
                </div>
              </div>
            ); // ⚡️ 闭合括号已检查，无语法错误
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