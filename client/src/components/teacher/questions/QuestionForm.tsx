"use client";

import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { QUESTION_TYPE_CONFIG, DIFFICULTY_CONFIG } from "@/lib/configs";
import { Loader2, Sparkles, Check, Plus, X, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type QuestionType = "single_choice" | "multiple_choice" | "fill_blank" | "true_false" | "essay" | "programming";
type DifficultyType = "easy" | "medium" | "hard";

export default function QuestionForm({ initialData, onSuccess, readOnly = false }: any) {
  const isEdit = !!initialData?.id;
  const utils = trpc.useUtils();

  // 1. 手动管理所有状态，完全对齐 ExamForm
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    type: "single_choice" as QuestionType,
    difficulty: "medium" as DifficultyType,
    answer: "",
    analysis: "",
    courseId: "", // 字符串格式，确保原生 select 匹配
    options: [] as { label: string; text: string }[],
  });

  const { data: courses, isLoading: isCoursesLoading } = trpc.courses.list.useQuery();

  const isChoice = useMemo(() => 
    formData.type === "single_choice" || formData.type === "multiple_choice"
  , [formData.type]);

  // 2. 暴力回填：收到数据立刻强制 setState
  useEffect(() => {
    if (initialData) {
      let opts = initialData.options;
      if (typeof opts === 'string') {
        try { opts = JSON.parse(opts); } catch { opts = []; }
      }
      
      setFormData({
        title: initialData.title || "",
        content: initialData.content || "",
        type: (initialData.type || "single_choice") as QuestionType,
        difficulty: (initialData.difficulty || "medium") as DifficultyType,
        answer: initialData.answer || "",
        analysis: initialData.analysis || "",
        courseId: initialData.courseId?.toString() || "",
        options: Array.isArray(opts) ? opts : [],
      });
    }
  }, [initialData]);

  const upsertMutation = trpc.questions.upsert.useMutation({
    onSuccess: () => {
      toast.success(isEdit ? "更新成功" : "录入成功");
      utils.questions.list.invalidate();
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.courseId) return toast.error("请选择所属课程");
    
    upsertMutation.mutate({
      ...formData,
      id: initialData?.id,
      courseId: parseInt(formData.courseId),
      options: isChoice ? formData.options : null,
      analysis: formData.analysis || undefined,
    } as any);
  };

  return (
    <div className="space-y-8">
      {/* 状态头部 */}
      <div className="flex justify-between items-center bg-zinc-900 p-6 rounded-[2rem] text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="h-11 w-11 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">{isEdit ? "编辑题目" : "录入试题"}</h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Static Native Layer</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-5">
          
          {/* ⚡️ 放弃组件库，使用原生 Select：所属课程 */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-zinc-400 ml-1 italic">1. 关联课程 (Native Select)</Label>
            <select
              value={formData.courseId}
              onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
              disabled={readOnly || isCoursesLoading}
              className="w-full h-12 rounded-2xl bg-zinc-100 px-4 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 appearance-none cursor-pointer border-none shadow-inner"
            >
              <option value="" disabled>{isCoursesLoading ? "载入中..." : "请选择一门课程"}</option>
              {courses?.map((c: any) => (
                <option key={c.id} value={c.id.toString()}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* ⚡️ 放弃组件库，使用原生 Select：试题题型 */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-zinc-400 ml-1 italic">2. 题目类型</Label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as QuestionType })}
              disabled={readOnly}
              className="w-full h-12 rounded-2xl bg-zinc-100 px-4 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 appearance-none border-none shadow-inner"
            >
              {Object.entries(QUESTION_TYPE_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 难度等级 (使用按钮组，回显最稳) */}
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase text-zinc-400 ml-1 italic">3. 难度权重</Label>
          <div className="flex bg-zinc-100 p-1.5 rounded-2xl gap-2 shadow-inner">
            {Object.entries(DIFFICULTY_CONFIG).map(([key, cfg]) => (
              <button
                key={key} type="button"
                onClick={() => setFormData({ ...formData, difficulty: key as DifficultyType })}
                className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase transition-all ${
                  formData.difficulty === key ? 'bg-white text-zinc-900 shadow-md scale-[1.02]' : 'text-zinc-400'
                }`}
              >
                {cfg.label}
              </button>
            ))}
          </div>
        </div>

        {/* 题干内容 */}
        <div className="space-y-5 bg-zinc-50/50 p-6 rounded-[2.5rem] border border-zinc-100">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-zinc-400 ml-1">题目简称</Label>
            <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="h-12 rounded-2xl border-none bg-white font-bold shadow-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-zinc-400 ml-1">题干内容</Label>
            <Textarea value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} className="min-h-[120px] rounded-2xl border-none bg-white p-5 font-medium resize-none shadow-sm" />
          </div>
        </div>

        {/* 选项配置 */}
        {isChoice && (
          <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">选项设置</Label>
              <Button type="button" variant="ghost" size="sm" onClick={() => setFormData(p => ({ ...p, options: [...p.options, { label: String.fromCharCode(65 + p.options.length), text: "" }] }))}>
                <Plus className="h-3 w-3 mr-1" /> 添加
              </Button>
            </div>
            <div className="grid gap-3">
              {formData.options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-black text-xs shadow-lg">{opt.label}</div>
                  <Input value={opt.text} onChange={e => {
                    const newOpts = [...formData.options];
                    newOpts[idx].text = e.target.value;
                    setFormData({...formData, options: newOpts});
                  }} className="h-11 rounded-xl border-none bg-zinc-100 font-bold" />
                  <Button type="button" variant="ghost" size="icon" onClick={() => setFormData(p => ({ ...p, options: p.options.filter((_, i) => i !== idx) }))}><X className="h-4 w-4 text-zinc-300" /></Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 答案解析 */}
        <div className="grid grid-cols-2 gap-5 p-6 bg-zinc-50/50 rounded-[2rem] border border-zinc-100">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-zinc-400 ml-1">标准答案</Label>
            <Input value={formData.answer} onChange={e => setFormData({ ...formData, answer: e.target.value })} className="h-11 rounded-xl border-none bg-white font-black text-emerald-600 shadow-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-amber-500 ml-1 flex items-center gap-1"><Sparkles className="h-3 w-3" /> 解析详情</Label>
            <Input value={formData.analysis} onChange={e => setFormData({ ...formData, analysis: e.target.value })} className="h-11 rounded-xl border-none bg-amber-50 text-amber-900 font-medium shadow-sm" />
          </div>
        </div>

        {!readOnly && (
          <Button type="submit" disabled={upsertMutation.isPending} className="w-full h-16 rounded-[2rem] bg-zinc-900 text-white font-bold text-base shadow-2xl transition-all active:scale-95">
            {upsertMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-6 w-6 mr-2" />}
            确认入库保存
          </Button>
        )}
      </form>
    </div>
  );
}