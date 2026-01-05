import { useState, useEffect, useMemo, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Save,
  BookOpen,
  Clock,
  Trophy,
  Users,
  X,
  CheckCircle2,
  FileText,
  Sparkles,
  AlertCircle,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { formatToLocalDatetime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { QuestionSelector } from "@/components/teacher/questions/QuestionSelector";

interface ExamFormProps {
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ExamForm({ initialData, onSuccess, onCancel }: ExamFormProps) {
  const utils = trpc.useUtils();
  const isInitialized = useRef(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    courseId: "",
    classIds: [] as number[],
    duration: 120,
    totalScore: 100,
    startTime: "",
    questions: [] as any[],
  });

  const { data: courses, isLoading: isCoursesLoading } = trpc.courses.list.useQuery();

  const availableClasses = useMemo(() => {
    if (!formData.courseId || !courses) return [];
    const course = courses.find((c: any) => c.id.toString() === formData.courseId);
    return (course as any)?.linkedClasses || [];
  }, [formData.courseId, courses]);

  const currentQuestionsScore = useMemo(() => {
    return formData.questions.reduce((sum, q) => sum + (Number(q.score) || 0), 0);
  }, [formData.questions]);

  // --- 核心修复：数据回填逻辑 (处理 ID 转换与时间格式) ---
  useEffect(() => {
    if (initialData && !isInitialized.current) {
      const initialClassIds = initialData.classIds
        ? initialData.classIds
        : initialData.targetClasses?.map((c: any) => c.id) || [];

      setFormData({
        title: initialData.title || "",
        description: initialData.description || "",
        courseId: initialData.courseId?.toString() || "",
        classIds: initialClassIds,
        duration: initialData.duration || 120,
        totalScore: initialData.totalScore || 100,
        startTime: initialData.startTime ? formatToLocalDatetime(initialData.startTime) : "",
        questions: (initialData.questions || []).map((q: any) => ({
          ...q,
          questionId: q.questionId || q.id,
          score: Number(q.score) || 5,
        })),
      });

      if (initialData.id) {
        isInitialized.current = true;
      }
    }
  }, [initialData]);

  const upsertMutation = trpc.exams.upsert.useMutation({
    onSuccess: async () => {
      toast.success(initialData ? "考试配置已更新" : "考试已成功分发至各班级");
      await utils.exams.invalidate(); // 确保列表刷新
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.courseId) return toast.error("请选择关联课程");
    if (formData.classIds.length === 0) return toast.error("请至少选择一个班级");
    if (formData.questions.length === 0) return toast.error("请为考试挑选题目");
    if (!formData.startTime) return toast.error("请设置考试开始时间");

    upsertMutation.mutate({
      ...formData,
      id: initialData?.id,
      courseId: parseInt(formData.courseId),
      startTime: new Date(formData.startTime),
      questions: formData.questions.map((q, idx) => ({
        questionId: q.questionId || q.id,
        score: Number(q.score),
        order: idx + 1,
      })),
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-6xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col h-[90vh] border border-white">
        
        {/* Header - 保持原有精美样式 */}
        <header className="px-10 pt-10 pb-6 flex justify-between items-start flex-none bg-white z-10">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
              {initialData ? "管理考试命题" : "发布新考试"}
            </h2>
            <div className="flex items-center gap-4 mt-1">
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Smart Examination Layer</p>
              <Badge variant="outline" className="text-[10px] rounded-full border-blue-100 text-blue-600 bg-blue-50/50">
                当前题目总分: {currentQuestionsScore} / {formData.totalScore}
              </Badge>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel} className="rounded-full h-10 w-10 bg-zinc-100/50 hover:bg-zinc-100 transition-colors">
            <X className="h-5 w-5 text-zinc-400" />
          </Button>
        </header>

        {/* 内容区 - 左右布局 */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* 左栏：基础信息配置 (40% 宽度) */}
          <div className="w-[40%] overflow-y-auto px-10 py-2 border-r border-zinc-50 custom-scrollbar space-y-8 bg-zinc-50/20">
            
            {/* 课程与名称 - 带阴影的容器 */}
            <div className="space-y-6 p-6 bg-white rounded-[2rem] border border-zinc-100 shadow-sm">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-zinc-400 ml-1 flex items-center gap-2">
                  <BookOpen className="h-3 w-3" /> 1. 核心课程
                </Label>
                <Select value={formData.courseId} onValueChange={(val) => setFormData(p => ({...p, courseId: val, classIds: [], questions: []}))}>
                  <SelectTrigger className="h-14 rounded-2xl border-none bg-zinc-100/50 px-6 font-bold text-zinc-700 shadow-inner focus:bg-white transition-all">
                    <SelectValue placeholder={isCoursesLoading ? "正在载入..." : "选择一门课程..."} />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-zinc-100 shadow-2xl z-[110]">
                    {courses?.map((c: any) => (
                      <SelectItem key={c.id} value={c.id.toString()} className="rounded-xl font-medium py-2">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-zinc-400 ml-1 flex items-center gap-2">
                  <Sparkles className="h-3 w-3" /> 2. 考试名称
                </Label>
                <Input 
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="text-lg font-bold border-none bg-zinc-100/50 h-14 rounded-2xl px-6 transition-all focus:bg-white shadow-inner" 
                  placeholder="如：2026 第一学期期末考试"
                />
              </div>
            </div>

            {/* 选择班级 - 恢复 Grid 样式 */}
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <Label className="text-[10px] font-black uppercase text-zinc-400 flex items-center gap-2">
                  <Users className="h-3.5 w-3.5" /> 3. 选择考试班级
                </Label>
              </div>

              {!formData.courseId ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[2.5rem] border-2 border-dashed border-zinc-200 text-zinc-400 space-y-3">
                  <AlertCircle className="h-6 w-6 opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-tighter">请先选择课程以加载授课班级</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 animate-in slide-in-from-bottom-4 duration-500">
                  {availableClasses.map((c: any) => {
                    const isChecked = formData.classIds.includes(c.id);
                    return (
                      <div 
                        key={c.id}
                        onClick={() => setFormData(p => ({
                          ...p,
                          classIds: isChecked ? p.classIds.filter(v => v !== c.id) : [...p.classIds, c.id]
                        }))}
                        className={`group relative flex items-center justify-between p-5 rounded-[1.75rem] cursor-pointer border-2 transition-all duration-300 ${
                          isChecked ? "bg-white border-blue-500 shadow-lg shadow-blue-100/30" : "bg-white border-zinc-100 hover:border-zinc-200"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${isChecked ? "bg-blue-500 border-blue-500 scale-110" : "bg-white border-zinc-200"}`}>
                            {isChecked && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                          </div>
                          <span className={`text-[13px] font-bold ${isChecked ? "text-blue-700" : "text-zinc-500"}`}>{c.name}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 时长与分数 */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-zinc-400 flex items-center gap-2">
                  <Clock className="h-3 w-3" /> 时长 (分钟)
                </Label>
                <Input type="number" value={formData.duration} onChange={e => setFormData({...formData, duration: parseInt(e.target.value)})} className="rounded-2xl border-none bg-zinc-100/50 h-12 px-6 font-bold shadow-inner" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-zinc-400 flex items-center gap-2">
                  <Trophy className="h-3 w-3" /> 满分分值
                </Label>
                <Input type="number" value={formData.totalScore} onChange={e => setFormData({...formData, totalScore: parseInt(e.target.value)})} className="rounded-2xl border-none bg-zinc-100/50 h-12 px-6 font-bold shadow-inner" />
              </div>
            </div>

            {/* 时间选择 */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-zinc-400 ml-1">开考时间</Label>
              <Input 
                type="datetime-local" 
                value={formData.startTime} 
                onChange={e => setFormData({...formData, startTime: e.target.value})} 
                className="rounded-2xl border-none bg-zinc-100/50 h-12 px-6 font-medium shadow-inner"
              />
            </div>

            {/* 描述 */}
            <div className="space-y-2 pb-10">
              <Label className="text-[10px] font-black uppercase text-zinc-400 flex items-center gap-2">
                <FileText className="h-3 w-3" /> 考试说明
              </Label>
              <Textarea 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="rounded-[2rem] min-h-[140px] bg-zinc-100/50 border-none p-6 text-sm resize-none shadow-inner focus:bg-white transition-all" 
                placeholder="请输入考试纪律、备注等信息..."
              />
            </div>
          </div>

          {/* 右栏：题目挑选区 - 保持 60% 与布局 */}
          <div className="w-[60%] flex flex-col bg-white">
            <div className="p-8 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4 flex-none">
                <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5" /> 4. 考试命题挑选
                </h4>
                {currentQuestionsScore !== formData.totalScore && (
                  <span className="text-[9px] font-bold text-rose-500 animate-pulse uppercase">
                    分值预警: 差额 {formData.totalScore - currentQuestionsScore} 分
                  </span>
                )}
              </div>

              <div className="flex-1 border border-zinc-100 rounded-[2.5rem] overflow-hidden shadow-inner bg-zinc-50/30">
                <QuestionSelector
                  courseId={parseInt(formData.courseId)}
                  selectedQuestions={formData.questions}
                  onSelect={updater => setFormData(prev => ({
                    ...prev,
                    questions: updater(prev.questions),
                  }))}
                  onClose={() => {}} 
                  showCloseButton={false} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer - 恢复双色/大圆角按钮 */}
        <footer className="p-8 bg-white border-t border-zinc-50 flex gap-4 flex-none">
          <Button 
            variant="ghost" 
            onClick={onCancel} 
            className="h-16 rounded-[1.75rem] flex-1 font-bold text-zinc-400 hover:bg-zinc-50 transition-all"
          >
            取消修改
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={upsertMutation.isPending || !formData.courseId} 
            className="h-16 rounded-[1.75rem] flex-[2.5] bg-zinc-900 text-white font-bold text-base shadow-2xl active:scale-95 transition-all gap-2"
          >
            {upsertMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            <span>{initialData ? "保存修改" : `确认分发至 ${formData.classIds.length} 个班级`}</span>
          </Button>
        </footer>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
}