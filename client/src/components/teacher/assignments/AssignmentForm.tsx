"use client";

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
} from "@/components/ui/select"; // 👈 回归使用 Shadcn Select
import {
  Loader2,
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
    courseId: "", // 保持 string 以匹配 Select
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

  // 数据回填逻辑
  useEffect(() => {
    if (initialData && !isInitialized.current) {
      const mappedQuestions = (initialData.questions || []).map((q: any) => ({
        ...q,
        questionId: q.questionId || q.id,
        score: Number(q.score) || 5,
      }));

      setFormData({
        title: initialData.title || "",
        description: initialData.description || "",
        requirements: initialData.requirements || "",
        courseId: initialData.courseId ? initialData.courseId.toString() : "",
        classIds: initialData.classIds || [],
        selectedQuestions: mappedQuestions,
        dueDate: initialData.dueDate ? formatToLocalDatetime(initialData.dueDate) : "",
        status: (initialData.status as any) || "published",
      });

      if (initialData.id) isInitialized.current = true;
    }
  }, [initialData]);

  const upsertMutation = trpc.assignments.upsert.useMutation({
    onSuccess: async () => {
      toast.success("作业配置已同步");
      await utils.assignments.invalidate();
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleAction = (status: "draft" | "published") => {
    if (!formData.courseId) return toast.error("请选择关联课程");
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
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest italic tracking-tighter">Academic Assignment Layer</p>
              <Badge variant="outline" className="text-[10px] rounded-full border-emerald-100 text-emerald-600 bg-emerald-50/50">
                当前分值: {currentTotalScore} Pts
              </Badge>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel} className="rounded-full h-10 w-10 bg-zinc-100/50 hover:bg-zinc-100 transition-colors">
            <X className="h-5 w-5 text-zinc-400" />
          </Button>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* 左栏 */}
          <div className="w-[40%] overflow-y-auto px-10 py-2 border-r border-zinc-50 space-y-8 bg-zinc-50/20 custom-scrollbar">
            
            <div className="space-y-6 p-6 bg-white rounded-[2rem] border border-zinc-100 shadow-sm">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-zinc-400 ml-1 flex items-center gap-2">
                  <BookOpen className="h-3 w-3" /> 1. 关联课程
                </Label>
                
                {/* ⚡️ 修复点 1：Select 增加存在性校验，防止回显消失 */}
                <Select 
                  value={(formData.courseId && courses?.some(c => c.id.toString() === formData.courseId)) ? formData.courseId : ""} 
                  onValueChange={(v) => setFormData(p => ({ ...p, courseId: v, classIds: [], selectedQuestions: [] }))}
                >
                  <SelectTrigger className="h-12 rounded-xl border-none bg-zinc-100/50 px-4 font-bold text-zinc-700 shadow-inner">
                    <SelectValue placeholder={isCoursesLoading ? "载入中..." : "选择一门课程..."} />
                  </SelectTrigger>
                  
                  {/* ⚡️ 修复点 2：极致 Z-Index 提升与 Portal 配置 */}
                  <SelectContent 
                    position="popper" 
                    sideOffset={5}
                    // 强制让弹出层在最顶层 Portal 中渲染，并手动指定极高的 z-index
                    className="z-[300] rounded-2xl border-zinc-100 shadow-2xl min-w-[var(--radix-select-trigger-width)]"
                  >
                    {courses?.map((c: any) => (
                      <SelectItem key={c.id} value={c.id.toString()} className="font-bold py-3 cursor-pointer">
                        {c.name}
                      </SelectItem>
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

            {/* 发布班级 */}
            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase text-zinc-400 flex items-center gap-2 px-1">
                <Users className="h-3.5 w-3.5" /> 3. 发布班级 (多选)
              </Label>
              {!formData.courseId ? (
                <div className="p-10 border-2 border-dashed border-zinc-200 rounded-[2rem] flex flex-col items-center justify-center text-zinc-300">
                  <AlertCircle className="h-5 w-5 mb-2 opacity-20" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">请先关联课程</span>
                </div>
              ) : (
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
                          isChecked ? "bg-emerald-50/50 border-emerald-500 shadow-sm shadow-emerald-100" : "bg-white border-zinc-100 hover:border-zinc-200"
                        }`}
                      >
                        <span className={`text-xs font-bold ${isChecked ? "text-emerald-700" : "text-zinc-500"}`}>{c.name}</span>
                        {isChecked && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-zinc-400 flex items-center gap-2">
                <Clock className="h-3 w-3" /> 4. 截止时间
              </Label>
              <Input type="datetime-local" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="rounded-xl border-none bg-zinc-100/50 h-11 px-4 font-bold text-zinc-600 shadow-inner" />
            </div>

            <div className="space-y-2 pb-10">
              <Label className="text-[10px] font-black uppercase text-zinc-400 flex items-center gap-2">
                <FileText className="h-3 w-3" /> 5. 作业要求
              </Label>
              <Textarea 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="rounded-[1.5rem] min-h-[140px] bg-zinc-100/50 border-none p-5 text-sm resize-none shadow-inner focus:bg-white transition-all" 
                placeholder="请输入详细的任务描述..."
              />
            </div>
          </div>

          {/* 右栏：题目挑选 */}
          <div className="w-[60%] flex flex-col bg-white">
            <div className="p-8 h-full flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-4 flex-none">
                <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5" /> 6. 任务命题
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

        {/* Footer */}
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
            {upsertMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Send className="h-5 w-5" /><span>{initialData ? "确认修改" : "确认发布"}</span></>}
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