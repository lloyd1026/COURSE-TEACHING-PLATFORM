"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  Loader2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertTriangle,
  Timer,
  BookOpen,
  CheckCircle2,
  LayoutGrid,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { QuestionRenderer } from "@/components/common/QuestionRenderer";

export default function StudentExamTaking() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const isSubmitting = useRef(false);

  // 1. 获取考试数据
  const { data: exam, isLoading, error } = trpc.exams.get.useQuery(
    { id: parseInt(id!) },
    { enabled: !!id, refetchOnWindowFocus: false }
  );

  // 2. 倒计时逻辑
  useEffect(() => {
    if (exam) {
      const startTime = new Date(exam.startTime).getTime();
      const endTime = startTime + exam.duration * 60 * 1000;
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setTimeLeft(remaining);
      
      const saved = localStorage.getItem(`exam_draft_${id}`);
      if (saved) setAnswers(JSON.parse(saved));
    }
  }, [exam, id]);

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0 && !isSubmitting.current) {
      handleFinalSubmit(true);
      return;
    }
    const timer = setInterval(() => setTimeLeft(p => (p !== null ? p - 1 : null)), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  // 3. 答案本地持久化
  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      localStorage.setItem(`exam_draft_${id}`, JSON.stringify(answers));
    }
  }, [answers, id]);

  // 4. 提交逻辑
  const handleFinalSubmit = (force = false) => {
    if (isSubmitting.current) return;
    if (!force && !confirm("确认结束考试并交卷吗？")) return;
    
    isSubmitting.current = true;
    submitMutation.mutate({
      examId: parseInt(id!),
      answers: Object.entries(answers).map(([qId, content]) => ({
        questionId: parseInt(qId),
        content: content,
      })),
    });
  };

  const submitMutation = trpc.exams.submit.useMutation({
    onSuccess: () => {
      toast.success("交卷成功");
      localStorage.removeItem(`exam_draft_${id}`);
      utils.exams.list.invalidate();
      setLocation("/student/exams");
    },
    onError: err => {
      toast.error(err.message);
      isSubmitting.current = false;
    },
  });

  if (isLoading || !exam) return (
    <div className="h-screen flex items-center justify-center bg-zinc-50">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-zinc-900" />
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">正在构建安全考试环境...</p>
      </div>
    </div>
  );

  const currentQuestion = exam.questions[currentIndex];
  const answeredCount = Object.keys(answers).filter(k => answers[Number(k)]?.toString().trim().length > 0).length;
  const progress = (answeredCount / exam.questions.length) * 100;

  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC] overflow-hidden">
      {/* 顶部导航：极简深色 */}
      <header className="h-20 bg-white border-b border-zinc-100 flex items-center justify-between px-10 z-40">
        <div className="flex items-center gap-5">
          <div className="h-12 w-12 bg-zinc-900 rounded-2xl flex items-center justify-center shadow-xl shadow-zinc-200">
            <Timer className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 tracking-tight">{exam.title}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="bg-zinc-100 text-zinc-500 border-none text-[10px] font-bold">
                {exam.courseName}
              </Badge>
              <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest italic">Exam Mode</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* 倒计时：动态变色 */}
          <div className={`flex flex-col items-end ${timeLeft! < 300 ? "text-rose-500" : "text-zinc-400"}`}>
            <span className="text-[9px] font-black uppercase tracking-tighter mb-1">剩余时间</span>
            <div className={`text-3xl font-black font-mono leading-none tracking-tighter ${timeLeft! < 300 ? "animate-pulse" : ""}`}>
              {Math.floor(Math.max(0, timeLeft!) / 60).toString().padStart(2, "0")}
              <span className="opacity-30">:</span>
              {(Math.max(0, timeLeft!) % 60).toString().padStart(2, "0")}
            </div>
          </div>
          
          <div className="h-10 w-px bg-zinc-100 mx-2" />

          <Button
            onClick={() => handleFinalSubmit()}
            disabled={submitMutation.isPending}
            className="rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white px-8 h-12 font-bold shadow-2xl transition-all active:scale-95"
          >
            {submitMutation.isPending ? <Loader2 className="animate-spin h-4 w-4" /> : "交卷"}
          </Button>
        </div>
      </header>

      {/* 进度条：极细线条 */}
      <div className="h-1 w-full bg-zinc-50">
        <div 
          className="h-full bg-zinc-900 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(0,0,0,0.2)]" 
          style={{ width: `${progress}%` }} 
        />
      </div>

      <main className="flex-1 flex overflow-hidden">
        {/* 左侧：题目区 */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#F8FAFC]">
          <div className="max-w-4xl mx-auto px-8 py-12">
            <div className="bg-white rounded-[3rem] p-12 lg:p-16 shadow-[0_20px_50px_rgba(0,0,0,0.02)] border border-white flex flex-col min-h-[600px] relative">
              
              <div className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-zinc-900 text-white flex items-center justify-center text-lg font-black shadow-xl">
                    {currentIndex + 1}
                  </div>
                  <div>
                    <Badge className="bg-zinc-100 text-zinc-500 border-none text-[10px] font-black uppercase tracking-widest px-3">
                      {currentQuestion.type === 'single_choice' && '单选题'}
                      {currentQuestion.type === 'multiple_choice' && '多选题'}
                      {currentQuestion.type === 'true_false' && '判断题'}
                      {currentQuestion.type === 'fill_blank' && '填空题'}
                      {currentQuestion.type === 'essay' && '简答题'}
                      {currentQuestion.type === 'programming' && '编程题'}
                    </Badge>
                  </div>
                </div>
                <div className="text-[10px] font-black text-zinc-200 uppercase tracking-[0.4em]">Question {currentIndex + 1} of {exam.questions.length}</div>
              </div>

              <div className="flex-1">
                <h3 className="text-2xl font-bold text-zinc-800 leading-snug mb-10 tracking-tight">
                  {currentQuestion?.content || currentQuestion?.title}
                </h3>

                <div className="pt-4">
                  <QuestionRenderer
                    key={currentQuestion.id}
                    question={currentQuestion}
                    value={answers[currentQuestion.id]}
                    onChange={val => setAnswers(prev => ({ ...prev, [currentQuestion.id]: val }))}
                  />
                </div>
              </div>

              {/* 翻页控制 */}
              <div className="flex items-center justify-between mt-16 pt-10 border-t border-zinc-50">
                <Button
                  variant="ghost"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex(p => p - 1)}
                  className="rounded-2xl h-14 px-8 text-zinc-400 font-bold hover:bg-zinc-50 hover:text-zinc-900 transition-all"
                >
                  <ChevronLeft className="mr-2 h-5 w-5" /> 上一题
                </Button>
                
                <Button
                  onClick={() => currentIndex < exam.questions.length - 1 && setCurrentIndex(p => p + 1)}
                  disabled={currentIndex === exam.questions.length - 1}
                  className="rounded-2xl h-14 px-10 bg-zinc-50 text-zinc-900 hover:bg-zinc-100 font-bold transition-all"
                >
                  下一题 <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：答题卡看板 */}
        <aside className="w-[400px] bg-white border-l border-zinc-100 flex flex-col z-10 shadow-[-10px_0_30px_rgba(0,0,0,0.01)]">
          <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-10">
            <div className="space-y-1">
              <h4 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-zinc-400" />
                答题卡进度
              </h4>
              <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">Global Progress Map</p>
            </div>

            <div className="grid grid-cols-5 gap-3">
              {exam.questions.map((q: any, idx: number) => {
                const isAnswered = answers[q.id] && answers[q.id].toString().trim().length > 0;
                const isCurrent = currentIndex === idx;
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-12 rounded-xl text-xs font-black transition-all border-2 flex items-center justify-center ${
                      isCurrent
                        ? "bg-white border-zinc-900 text-zinc-900 shadow-xl scale-110 ring-4 ring-zinc-50 z-10"
                        : isAnswered
                          ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-100"
                          : "bg-zinc-50 border-zinc-50 text-zinc-300 hover:border-zinc-100"
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="p-8 bg-zinc-50 rounded-[2.5rem] space-y-4">
              <div className="flex items-center gap-2 text-zinc-900 font-bold text-xs">
                <Zap className="h-4 w-4 text-amber-500 fill-amber-500" /> 考前确认
              </div>
              <ul className="text-[10px] text-zinc-400 font-bold space-y-2 uppercase tracking-tight">
                <li className="flex items-center gap-2"><div className="h-1 w-1 bg-zinc-300 rounded-full"/> 答案将实时同步至云端</li>
                <li className="flex items-center gap-2"><div className="h-1 w-1 bg-zinc-300 rounded-full"/> 倒计时结束将自动交卷</li>
                <li className="flex items-center gap-2"><div className="h-1 w-1 bg-zinc-300 rounded-full"/> 请确保网络连接稳定</li>
              </ul>
            </div>
          </div>

          <div className="p-10 border-t border-zinc-50">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] font-black text-zinc-300 uppercase mb-1">已完成题目</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-zinc-900">{answeredCount}</span>
                  <span className="text-sm font-bold text-zinc-300">/ {exam.questions.length}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-zinc-300 uppercase mb-1">当前进度</p>
                <span className="text-lg font-black text-emerald-500 italic">{Math.round(progress)}%</span>
              </div>
            </div>
          </div>
        </aside>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
      `}} />
    </div>
  );
}