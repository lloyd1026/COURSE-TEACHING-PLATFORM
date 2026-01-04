import { useState, useEffect, useMemo, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { 
  Loader2, Save, BookOpen, Clock, Users, X, 
  CheckCircle2, FileText, Send, AlertCircle, FileEdit, Layout,
  Layers, Plus, Trash2, GripVertical, Trophy
} from "lucide-react";
import { toast } from "sonner";
import { formatToLocalDatetime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// 引入优化后的选题组件
import { QuestionSelector } from "./QuestionSelector"; 

interface AssignmentFormProps {
  initialData?: any; 
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AssignmentForm({ initialData, onSuccess, onCancel }: AssignmentFormProps) {
  const utils = trpc.useUtils();
  const isInitialized = useRef(false);
  
  // 控制选题器弹窗
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    requirements: "",
    courseId: "", 
    classIds: [] as number[], 
    // 选中的题目对象数组
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

  // 计算实时总分
  const currentTotalScore = useMemo(() => {
    return formData.selectedQuestions.reduce((sum, q) => sum + (Number(q.score) || 0), 0);
  }, [formData.selectedQuestions]);

  // --- 核心修复：数据回填逻辑 ---
  useEffect(() => {
    if (initialData && !isInitialized.current) {
      console.log("回填原始数据:", initialData);

      // 处理班级 ID 数组
      const initialClassIds = initialData.classIds || [];

      // 处理题目数据映射：确保每个题目都有 id 和 score
      const mappedQuestions = (initialData.questions || []).map((q: any) => ({
        ...q,
        id: q.id || q.questionId,       // 统一使用 id 供 Selector 识别
        questionId: q.id || q.questionId,
        title: q.title || "未命名题目",
        type: q.type || "essay",
        score: q.score || 5
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
    onSuccess: () => {
      toast.success(initialData ? "作业档案已更新" : "作业已成功发布");
      utils.assignments.list.invalidate();
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  // --- 题目操作逻辑 ---
  const handleSetQuestions = (updater: any) => {
    setFormData(prev => ({
      ...prev,
      selectedQuestions: typeof updater === 'function' ? updater(prev.selectedQuestions) : updater
    }));
  };

  const removeQuestion = (id: number) => {
    setFormData(prev => ({
      ...prev,
      selectedQuestions: prev.selectedQuestions.filter(q => (q.id || q.questionId) !== id)
    }));
  };

  const updateQuestionScore = (id: number, score: number) => {
    setFormData(prev => ({
      ...prev,
      selectedQuestions: prev.selectedQuestions.map(q => 
        (q.id || q.questionId) === id ? { ...q, score } : q
      )
    }));
  };

  const handleAction = (status: "draft" | "published") => {
    if (!formData.courseId) return toast.error("请选择关联课程");
    if (formData.classIds.length === 0) return toast.error("请至少选择一个分发班级");
    if (!formData.title) return toast.error("请输入作业标题");
    if (!formData.dueDate) return toast.error("请设置截止时间");
    
    upsertMutation.mutate({
      ...formData,
      id: initialData?.id,
      status: status,
      courseId: parseInt(formData.courseId),
      dueDate: new Date(formData.dueDate),
      // 发送至后端的题目数组格式
      selectedQuestions: formData.selectedQuestions.map((q, idx) => ({
        questionId: q.id || q.questionId,
        score: Number(q.score) || 5,
        order: idx + 1
      }))
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/20 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-2xl bg-white/95 backdrop-blur-2xl rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.16)] overflow-hidden flex flex-col max-h-[90vh] border border-white">
        
        <header className="px-10 pt-10 pb-6 flex justify-between items-start flex-shrink-0">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
              {initialData ? "编辑作业任务" : "布置新学习任务"}
            </h2>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest italic tracking-tighter">Assignment Configuration Panel</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel} className="rounded-full h-10 w-10 bg-zinc-100/50 hover:bg-zinc-100 transition-colors">
            <X className="h-5 w-5 text-zinc-400" />
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto px-10 py-2 custom-scrollbar">
          <div className="space-y-8 pb-10">
            
            {/* 1. 基础信息 */}
            <div className="space-y-6 p-6 bg-zinc-50/50 rounded-[2rem] border border-zinc-100 shadow-inner">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-zinc-400 ml-1 flex items-center gap-2">
                  <BookOpen className="h-3 w-3" /> 1. 关联课程 (题目范围)
                </Label>
                <Select value={formData.courseId} onValueChange={(v) => {
                  // 切换课程时清空班级和题目，保持数据一致性
                  setFormData(prev => ({ ...prev, courseId: v, classIds: [], selectedQuestions: [] }));
                }}>
                  <SelectTrigger className="h-14 rounded-2xl border-none bg-white shadow-sm px-6 font-bold text-zinc-700">
                    <SelectValue placeholder={isCoursesLoading ? "正在载入..." : "选择课程..."} />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-zinc-100 shadow-2xl z-[110]">
                    {courses?.map((c: any) => (
                      <SelectItem key={c.id} value={c.id.toString()} className="rounded-xl font-bold py-2">{c.name}</SelectItem>
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
                  className="text-lg font-bold border-none bg-white shadow-sm h-14 rounded-2xl px-6 focus:ring-2 focus:ring-emerald-500/10" 
                  placeholder="例如：第一章 阶段性测验"
                />
              </div>
            </div>

            {/* 2. 班级选择 */}
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <Label className="text-[10px] font-black uppercase text-zinc-400 flex items-center gap-2">
                  <Users className="h-3.5 w-3.5" /> 3. 发布班级
                </Label>
                <Badge variant="outline" className="text-[9px] font-bold border-zinc-200">Selected {formData.classIds.length}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {availableClasses.length > 0 ? availableClasses.map((c: any) => {
                  const isChecked = formData.classIds.includes(c.id);
                  return (
                    <div 
                      key={c.id}
                      onClick={() => handleClassToggle(c.id)}
                      className={`p-4 rounded-2xl border-2 transition-all duration-300 cursor-pointer flex items-center gap-3 ${
                        isChecked ? "bg-white border-zinc-900 shadow-md" : "bg-zinc-50 border-transparent hover:border-zinc-200"
                      }`}
                    >
                      <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${isChecked ? "bg-zinc-900 border-zinc-900" : "bg-white border-zinc-200"}`}>
                        {isChecked && <CheckCircle2 className="h-3 w-3 text-white" />}
                      </div>
                      <span className={`text-xs font-bold ${isChecked ? "text-zinc-900" : "text-zinc-400"}`}>{c.name}</span>
                    </div>
                  );
                }) : (
                  <div className="col-span-2 p-10 text-center bg-zinc-50 rounded-[2.5rem] border border-dashed border-zinc-200">
                    <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest italic opacity-50">请选择课程以载入授课班级</p>
                  </div>
                )}
              </div>
            </div>

            {/* 3. 题目关联与总分 */}
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <Label className="text-[10px] font-black uppercase text-zinc-400 flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5" /> 4. 试题详情
                </Label>
                <div className="flex items-center gap-3">
                  {formData.selectedQuestions.length > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-900 rounded-full text-white scale-90 animate-in zoom-in">
                      <Trophy className="h-3 w-3 text-emerald-400" />
                      <span className="text-[10px] font-black uppercase tracking-tighter">{currentTotalScore} Points</span>
                    </div>
                  )}
                  <Button 
                    type="button" 
                    disabled={!formData.courseId}
                    onClick={() => setIsSelectorOpen(true)}
                    className="h-9 rounded-full bg-emerald-900 text-white hover:bg-black text-[10px] font-bold px-4 transition-all"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> 管理题目 ({formData.selectedQuestions.length})
                  </Button>
                </div>
              </div>

              <div className="space-y-2 min-h-[60px]">
                {formData.selectedQuestions.length > 0 ? formData.selectedQuestions.map((q, idx) => (
                  <div key={q.id || q.questionId} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-zinc-100 shadow-sm group animate-in slide-in-from-right-4 duration-300">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-zinc-50 flex items-center justify-center text-[10px] font-black text-zinc-300 group-hover:text-zinc-900 transition-colors">
                        {String(idx + 1).padStart(2, '0')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="text-xs font-bold text-zinc-800 truncate">{q.title}</h5>
                        <Badge variant="secondary" className="bg-zinc-100 text-zinc-400 border-none text-[8px] px-1.5 py-0 mt-0.5 uppercase">{q.type.replace('_', ' ')}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 bg-zinc-50 px-3 py-1 rounded-xl border border-zinc-100 focus-within:border-zinc-900 transition-colors">
                        <Input 
                          type="number" 
                          value={q.score} 
                          onChange={(e) => updateQuestionScore(q.id || q.questionId, Number(e.target.value))}
                          className="w-8 h-6 bg-transparent border-none text-center text-xs font-black p-0 focus-visible:ring-0" 
                        />
                        <span className="text-[9px] font-bold text-zinc-300 uppercase">Pts</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeQuestion(q.id || q.questionId)} className="h-8 w-8 rounded-full text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-all">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )) : (
                  <div className="py-12 border-2 border-dashed border-zinc-50 rounded-[2.5rem] flex flex-col items-center justify-center text-zinc-300 space-y-2">
                    <div className="h-10 w-10 rounded-full bg-zinc-50 flex items-center justify-center">
                       <AlertCircle className="h-5 w-5 opacity-20" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-200">尚未关联在线题目</p>
                  </div>
                )}
              </div>
            </div>

            {/* 4. 交付详情 */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-zinc-400 flex items-center gap-2">
                  <Clock className="h-3 w-3" /> 5. 截止时间
                </Label>
                <Input type="datetime-local" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="rounded-2xl border-none bg-zinc-100/50 h-12 px-6 font-bold text-zinc-600 shadow-inner" />
              </div>
              <div className="flex flex-col justify-end pb-1 opacity-30 italic">
                 <p className="text-[9px] font-bold tracking-tighter">System will lock submissions after this point</p>
              </div>
            </div>

            <div className="space-y-2 pb-6">
              <Label className="text-[10px] font-black uppercase text-zinc-400">6. 任务详细描述</Label>
              <Textarea 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="rounded-[2rem] min-h-[140px] bg-zinc-100/50 border-none p-6 focus:bg-white transition-all resize-none text-sm leading-relaxed shadow-inner" 
                placeholder="请输入作业的具体要求、参考资料或注意事项..."
              />
            </div>
          </div>
        </div>

        <footer className="p-8 bg-white border-t border-zinc-50 flex gap-4 flex-shrink-0">
          <Button 
            variant="ghost" 
            onClick={() => handleAction("draft")} 
            className="h-16 rounded-[1.75rem] flex-1 font-bold text-zinc-400 hover:bg-zinc-50 flex gap-2 transition-all"
          >
            <FileEdit className="h-5 w-5" /> 暂存草稿
          </Button>
          <Button 
            onClick={() => handleAction("published")} 
            disabled={upsertMutation.isPending || !formData.courseId} 
            className="h-16 rounded-[1.75rem] flex-[2.5] bg-zinc-900 text-white font-bold shadow-2xl active:scale-95 transition-all gap-2"
          >
            {upsertMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Send className="h-5 w-5" /><span>{initialData ? "保存修改并发布" : "确认发布任务"}</span></>}
          </Button>
        </footer>

        {/* 题目选择器 */}
        {isSelectorOpen && (
          <QuestionSelector 
            courseId={parseInt(formData.courseId)}
            // 关键：传给 Selector 最新的 ID 数组进行比对
            // selectedIds={formData.selectedQuestions.map(q => q.id || q.questionId)}
            // 传给 Selector 的题目对象
            selectedQuestions={formData.selectedQuestions}
            onSelect={handleSetQuestions} 
            onClose={() => setIsSelectorOpen(false)}
          />
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
      `}} />
    </div>
  );

  function handleClassToggle(id: number) {
    setFormData(prev => ({
      ...prev,
      classIds: prev.classIds.includes(id) 
        ? prev.classIds.filter(v => v !== id) 
        : [...prev.classIds, id]
    }));
  }
}