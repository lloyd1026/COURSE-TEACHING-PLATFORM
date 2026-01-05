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

type QuestionType = "single_choice" | "multiple_choice" | "fill_blank" | "true_false" | "essay" | "programming";
type DifficultyType = "easy" | "medium" | "hard";

export default function QuestionForm({ initialData, onSuccess, readOnly = false }: any) {
  const isEdit = !!initialData?.id;
  const utils = trpc.useUtils();

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    type: "single_choice" as QuestionType,
    difficulty: "medium" as DifficultyType,
    answer: "",
    analysis: "",
    courseId: "", 
    options: [] as { label: string; text: string }[],
  });

  const { data: courses, isLoading: isCoursesLoading } = trpc.courses.list.useQuery();

  // 1. ⚡️ 判定是否需要显示选项配置（包含判断题）
  const isChoice = useMemo(() => 
    formData.type === "single_choice" || 
    formData.type === "multiple_choice" || 
    formData.type === "true_false"
  , [formData.type]);

  // 2. ⚡️ 数据回填：处理 options 序列化，并对旧数据进行静默修复
  useEffect(() => {
    if (initialData) {
      let opts = initialData.options;
      if (typeof opts === 'string') {
        try { opts = JSON.parse(opts); } catch { opts = []; }
      }
      
      // 如果是判断题但数据库里 options 是空的，回填时自动补全，防止保存时再次抹除
      if (initialData.type === "true_false" && (!opts || opts.length === 0)) {
        opts = [
          { label: "T", text: "正确" },
          { label: "F", text: "错误" }
        ];
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
      toast.success(isEdit ? "题目更新成功" : "题目已录入");
      utils.questions.list.invalidate();
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.courseId) return toast.error("请选择所属课程");
    
    // 3. ⚡️ 提交拦截：确保 true_false 带着 options 提交
    upsertMutation.mutate({
      ...formData,
      id: initialData?.id,
      courseId: parseInt(formData.courseId),
      // 因为 isChoice 包含了 true_false，这里的 options 会被正常发送给后端
      options: isChoice ? formData.options : null,
      analysis: formData.analysis || undefined,
    } as any);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center bg-zinc-900 p-6 rounded-[2rem] text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="h-11 w-11 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">{isEdit ? "编辑题目" : "录入试题"}</h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5 tracking-tighter">Automatic Option Logic Enabled</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-zinc-400 ml-1 italic">1. 关联课程</Label>
            <select
              value={formData.courseId}
              onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
              disabled={readOnly || isCoursesLoading}
              className="w-full h-12 rounded-2xl bg-zinc-100 px-4 font-bold text-sm focus:outline-none appearance-none border-none shadow-inner"
            >
              <option value="" disabled>{isCoursesLoading ? "载入中..." : "选择课程"}</option>
              {courses?.map((c: any) => (
                <option key={c.id} value={c.id.toString()}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-zinc-400 ml-1 italic">2. 题目类型</Label>
            <select
              value={formData.type}
              onChange={(e) => {
                const newType = e.target.value as QuestionType;
                const updateData: any = { type: newType };
                // ⚡️ 题型切换逻辑：切到判断题时自动补完选项
                if (newType === "true_false") {
                  updateData.options = [
                    { label: "T", text: "正确" },
                    { label: "F", text: "错误" }
                  ];
                }
                setFormData({ ...formData, ...updateData });
              }}
              disabled={readOnly}
              className="w-full h-12 rounded-2xl bg-zinc-100 px-4 font-bold text-sm appearance-none border-none shadow-inner"
            >
              {Object.entries(QUESTION_TYPE_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>

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

        <div className="space-y-5 bg-zinc-50/50 p-6 rounded-[2.5rem] border border-zinc-100">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-zinc-400 ml-1">题目简称</Label>
            <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="h-12 rounded-2xl border-none bg-white font-bold" />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-zinc-400 ml-1">题干内容</Label>
            <Textarea value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} className="min-h-[120px] rounded-2xl border-none bg-white p-5 font-medium resize-none shadow-sm" />
          </div>
        </div>

        {/* ⚡️ 选项展示：判断题也会显示 T/F，但锁定不可删除 */}
        {isChoice && (
          <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest italic">
                {formData.type === 'true_false' ? '判断逻辑 (只读)' : '选项配置'}
              </Label>
              {formData.type !== 'true_false' && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setFormData(p => ({ ...p, options: [...p.options, { label: String.fromCharCode(65 + p.options.length), text: "" }] }))}>
                  <Plus className="h-3 w-3 mr-1" /> 添加选项
                </Button>
              )}
            </div>
            <div className="grid gap-3">
              {formData.options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center font-black text-xs shadow-lg ${formData.type === 'true_false' ? 'bg-blue-600' : 'bg-zinc-900'} text-white`}>
                    {opt.label}
                  </div>
                  <Input 
                    value={opt.text} 
                    readOnly={formData.type === 'true_false' || readOnly}
                    onChange={e => {
                      const newOpts = [...formData.options];
                      newOpts[idx].text = e.target.value;
                      setFormData({...formData, options: newOpts});
                    }} 
                    className={`h-11 rounded-xl border-none font-bold ${formData.type === 'true_false' ? 'bg-zinc-50 text-zinc-400' : 'bg-zinc-100'}`} 
                  />
                  {formData.type !== 'true_false' && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => setFormData(p => ({ ...p, options: p.options.filter((_, i) => i !== idx) }))}><X className="h-4 w-4 text-zinc-300" /></Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-5 p-6 bg-zinc-50/50 rounded-[2rem] border border-zinc-100">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-zinc-400 ml-1">标准答案 (填 T/F 或 A/B/C/D)</Label>
            <Input value={formData.answer} onChange={e => setFormData({ ...formData, answer: e.target.value.toUpperCase() })} className="h-11 rounded-xl border-none bg-white font-black text-emerald-600 shadow-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-amber-500 ml-1 flex items-center gap-1"><Sparkles className="h-3 w-3" /> 解析详情</Label>
            <Input value={formData.analysis} onChange={e => setFormData({ ...formData, analysis: e.target.value })} className="h-11 rounded-xl border-none bg-amber-50 text-amber-900 font-medium" />
          </div>
        </div>

        {!readOnly && (
          <Button type="submit" disabled={upsertMutation.isPending} className="w-full h-16 rounded-[2rem] bg-zinc-900 text-white font-bold text-base shadow-2xl active:scale-95 transition-all">
            {upsertMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-6 w-6 mr-2" />}
            确认入库保存
          </Button>
        )}
      </form>
    </div>
  );
}