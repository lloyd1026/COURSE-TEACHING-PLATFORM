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
  Users,
  X,
  CheckCircle2,
  FileText,
  Send,
  AlertCircle,
  FileEdit,
  Layout,
  Layers,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { formatToLocalDatetime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { QuestionSelector } from "@/components/teacher/questions/QuestionSelector";

interface AssignmentFormProps {
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AssignmentForm({ initialData, onSuccess, onCancel }: AssignmentFormProps) {
  const utils = trpc.useUtils();
  const isInitialized = useRef(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    requirements: "",
    courseId: "",
    classIds: [] as number[],
    selectedQuestions: [] as any[],
    dueDate: "",
    status: "published" as "draft" | "published" | "closed",
  });

  const { data: courses, isLoading: isCoursesLoading } = trpc.courses.list.useQuery();

  const availableClasses = useMemo(() => {
    if (!formData.courseId || !courses) return [];
    const selectedCourse = courses.find((c: any) => c.id.toString() === formData.courseId);
    return (selectedCourse as any)?.linkedClasses || [];
  }, [formData.courseId, courses]);

  const currentTotalScore = useMemo(() => {
    return formData.selectedQuestions.reduce((sum, q) => sum + (Number(q.score) || 0), 0);
  }, [formData.selectedQuestions]);

  // --- 核心修复：数据回填逻辑 ---
  useEffect(() => {
    if (initialData && !isInitialized.current) {
      const initialClassIds = initialData.classIds || [];
      const mappedQuestions = (initialData.questions || []).map((q: any) => ({
        ...q,
        questionId: q.questionId || q.id,
        score: Number(q.score) || 5,
      }));

      setFormData({
        title: initialData.title || "",
        description: initialData.description || "",
        requirements: initialData.requirements || "",
        courseId: initialData.courseId?.toString() || "",
        classIds: initialClassIds,
        selectedQuestions: mappedQuestions,
        dueDate: initialData.dueDate ? formatToLocalDatetime(initialData.dueDate) : "",
        status: initialData.status || "published",
      });

      if (initialData.id) isInitialized.current = true;
    }
  }, [initialData]);

  const upsertMutation = trpc.assignments.upsert.useMutation({
    onSuccess: async () => {
      toast.success(initialData ? "作业档案已更新" : "作业已成功发布");
      await utils.assignments.invalidate(); // 全局刷新列表
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleAction = (status: "draft" | "published") => {
    if (!formData.courseId) return toast.error("请选择关联课程");
    if (formData.classIds.length === 0) return toast.error("请选择分发班级");
    if (!formData.title) return toast.error("请输入作业标题");
    if (!formData.dueDate) return toast.error("请设置截止时间");

    upsertMutation.mutate({
      ...formData,
      id: initialData?.id,
      status: status,
      courseId: parseInt(formData.courseId),
      dueDate: new Date(formData.dueDate),
      selectedQuestions: formData.selectedQuestions.map((q, idx) => ({
        questionId: q.questionId || q.id,
        score: Number(q.score),
        order: idx + 1,
      })),
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-6xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col h-[90vh] border border-white">
        
        {/* Header */}
        <header className="px-10 pt-10 pb-6 flex justify-between items-start flex-none bg-white z-10">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
              {initialData ? "编辑作业任务" : "布置新学习任务"}
            </h2>
            <div className="flex items-center gap-4 mt-1">
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest italic tracking-tighter">Assignment Configuration Layer</p>
              <Badge variant="outline" className="text-[10px] rounded-full border-emerald-100 text-emerald-600 bg-emerald-50/50">
                当前任务总分: {currentTotalScore} Pts
              </Badge>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel} className="rounded-full h-10 w-10 bg-zinc-100/50">
            <X className="h-5 w-5 text-zinc-400" />
          </Button>
        </header>

        {/* 内容分栏区 */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* 左栏：基础配置 (40%) */}
          <div className="w-[40%] overflow-y-auto px-10 py-2 border-r border-zinc-50 space-y-8 bg-zinc-50/20 custom-scrollbar">
            
            <div className="space-y-6 p-6 bg-white rounded-[2rem] border border-zinc-100 shadow-sm">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-zinc-400 ml-1 flex items-center gap-2">
                  <BookOpen className="h-3 w-3" /> 1. 关联课程
                </Label>
                <Select value={formData.courseId} onValueChange={(v) => setFormData(prev => ({ ...prev, courseId: v, classIds: [], selectedQuestions: [] }))}>
                  <SelectTrigger className="h-12 rounded-xl border-none bg-zinc-100/50 px-4 font-bold text-zinc-700">
                    <SelectValue placeholder={isCoursesLoading ? "载入中..." : "选择课程..."} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-2xl">
                    {courses?.map((c: any) => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-zinc-400 ml-1 flex items-center gap-2">
                  <Layout className="h-3 w-3" /> 2. 任务标题
                </Label>
                <Input 
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="font-bold border-none bg-zinc-100/50 h-12 rounded-xl px-4 shadow-inner" 
                  placeholder="请输入标题..."
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase text-zinc-400 flex items-center gap-2 px-1">
                <Users className="h-3.5 w-3.5" /> 3. 发布班级
              </Label>
              <div className="grid grid-cols-1 gap-2">
                {availableClasses.map((c: any) => {
                  const isChecked = formData.classIds.includes(c.id);
                  return (
                    <div 
                      key={c.id}
                      onClick={() => setFormData(p => ({
                        ...p,
                        classIds: isChecked ? p.classIds.filter(v => v !== c.id) : [...p.classIds, c.id]
                      }))}
                      className={`flex items-center justify-between p-4 rounded-xl cursor-pointer border-2 transition-all ${
                        isChecked ? "bg-emerald-50/50 border-emerald-500" : "bg-white border-zinc-100"
                      }`}
                    >
                      <span className={`text-xs font-bold ${isChecked ? "text-emerald-700" : "text-zinc-500"}`}>{c.name}</span>
                      {isChecked && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-zinc-400 flex items-center gap-2">
                <Clock className="h-3 w-3" /> 4. 截止时间
              </Label>
              <Input type="datetime-local" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="rounded-xl border-none bg-zinc-100/50 h-11 px-4 font-bold text-zinc-600 shadow-inner" />
            </div>

            <div className="space-y-2 pb-10">
              <Label className="text-[10px] font-black uppercase text-zinc-400 flex items-center gap-2">
                <FileText className="h-3 w-3" /> 5. 作业描述
              </Label>
              <Textarea 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="rounded-[1.5rem] min-h-[120px] bg-zinc-100/50 border-none p-4 text-xs resize-none shadow-inner focus:bg-white transition-all" 
                placeholder="具体要求..."
              />
            </div>
          </div>

          {/* 右栏：题目选择 (60%) */}
          <div className="w-[60%] flex flex-col bg-white">
            <div className="p-8 h-full flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-4 flex-none">
                <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5" /> 6. 作业命题挑选
                </h4>
              </div>

              <div className="flex-1 border border-zinc-100 rounded-[2.5rem] overflow-hidden shadow-inner bg-zinc-50/30">
                <QuestionSelector
                  courseId={parseInt(formData.courseId)}
                  selectedQuestions={formData.selectedQuestions}
                  onSelect={updater => setFormData(prev => ({
                    ...prev,
                    selectedQuestions: updater(prev.selectedQuestions),
                  }))}
                  onClose={() => {}} 
                  showCloseButton={false} 
                />
              </div>
            </div>
          </div>

        </div>

        <footer className="p-8 bg-white border-t border-zinc-50 flex gap-4 flex-none">
          <Button 
            variant="ghost" 
            onClick={() => handleAction("draft")} 
            className="h-16 rounded-[1.75rem] flex-1 font-bold text-zinc-400 hover:bg-zinc-50 transition-all gap-2"
          >
            <FileEdit className="h-5 w-5" /> 暂存草稿
          </Button>
          <Button 
            onClick={() => handleAction("published")} 
            disabled={upsertMutation.isPending || !formData.courseId} 
            className="h-16 rounded-[1.75rem] flex-[2.5] bg-zinc-900 text-white font-bold text-base shadow-2xl active:scale-95 transition-all gap-2"
          >
            {upsertMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Send className="h-5 w-5" /><span>{initialData ? "保存修改" : "确认发布任务"}</span></>}
          </Button>
        </footer>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
      `}} />
    </div>
  );
}