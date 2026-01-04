import { useState, useEffect } from "react";
import { useParams } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Check, Save } from "lucide-react";
import { toast } from "sonner";

export default function GradingDetail() {
  const { submissionId } = useParams<{ submissionId: string }>();
  const sId = parseInt(submissionId || "0");

  const { data, isLoading } = trpc.submissions.getDetail.useQuery({ submissionId: sId });
  const [scores, setScores] = useState<Record<number, number>>({});

  const saveMutation = trpc.submissions.saveGrades.useMutation({
    onSuccess: () => {
      toast.success("评分保存成功！");
      window.history.back();
    }
  });

  // 初始化分数状态
  useEffect(() => {
    if (data?.details) {
      const initialScores: Record<number, number> = {};
      data.details.forEach(d => {
        initialScores[d.detailId] = Number(d.score || 0);
      });
      setScores(initialScores);
    }
    console.log(data);
  }, [data]);

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

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
        <header className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => window.history.back()}><ArrowLeft /></Button>
            <div>
              <h1 className="text-xl font-black uppercase">批阅答卷：{data?.submission.studentName}</h1>
              <p className="text-xs text-zinc-400 font-bold">{data?.submission.assignmentTitle}</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 rounded-xl px-6">
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            完成批阅并发布成绩
          </Button>
        </header>

        <div className="space-y-6">
          {data?.details.map((q, idx) => (
            <div key={q.questionId} className="bg-white border border-zinc-100 rounded-[2rem] p-8 space-y-4 shadow-sm">
              <div className="flex justify-between items-start">
                <Badge className="bg-zinc-100 text-zinc-500 border-none uppercase text-[9px]">{q.type}</Badge>
                <div className="flex items-center gap-2">
                   <span className="text-[10px] font-bold text-zinc-400 uppercase">本题得分</span>
                   <input 
                      type="number" 
                      value={scores[q.detailId] ?? 0}
                      onChange={(e) => setScores({...scores, [q.detailId]: parseFloat(e.target.value)})}
                      className="w-20 bg-zinc-50 border-2 border-transparent focus:border-zinc-900 rounded-lg px-2 py-1 text-center font-black text-sm outline-none transition-all"
                   />
                   <span className="text-xs font-bold text-zinc-300">/ {q.maxScore}</span>
                </div>
              </div>

              <h3 className="text-lg font-bold text-zinc-800 leading-relaxed">{idx + 1}. {q.content}</h3>

              <div className="grid md:grid-cols-2 gap-6 pt-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase text-zinc-400">学生回答</p>
                  <div className="p-4 bg-zinc-50 rounded-2xl text-sm font-medium text-zinc-600 min-h-[60px]">
                    {q.studentAnswer || <span className="text-zinc-300 italic">未作答</span>}
                  </div>
                </div>
                {q.type !== 'essay' && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-emerald-500/50">标准答案</p>
                    <div className="p-4 bg-emerald-50/50 rounded-2xl text-sm font-bold text-emerald-700">
                      {q.standardAnswer}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}