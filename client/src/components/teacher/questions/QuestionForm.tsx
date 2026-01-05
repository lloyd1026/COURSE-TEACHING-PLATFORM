"use client";

import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { QUESTION_TYPE_CONFIG, DIFFICULTY_CONFIG } from "@/lib/configs";
import { 
  Loader2, Sparkles, Check, Plus, X, Layers, 
  Code, FileText, CheckCircle2, AlertCircle 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

type QuestionType = "single_choice" | "multiple_choice" | "fill_blank" | "true_false" | "essay" | "programming";
type DifficultyType = "easy" | "medium" | "hard";

export default function QuestionForm({ initialData, onSuccess, readOnly = false }: any) {
  const isEdit = !!initialData?.id;
  const utils = trpc.useUtils();

  // 1. 初始化状态：确保 title, content 等字段始终存在
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

  const isChoice = useMemo(() => ["single_choice", "multiple_choice", "true_false"].includes(formData.type), [formData.type]);

  // 2. 数据回填：处理 options 解析与 T/F 自动补全
  useEffect(() => {
    if (initialData) {
      let opts = initialData.options;
      if (typeof opts === 'string') {
        try { opts = JSON.parse(opts); } catch { opts = []; }
      }
      
      // 针对判断题的静默修复逻辑
      if (initialData.type === "true_false" && (!opts || opts.length === 0)) {
        opts = [{ label: "T", text: "正确" }, { label: "F", text: "错误" }];
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
    onError: (err) => {
      // 解析 Zod 错误并友好提示
      const msg = err.message.includes("title") ? "题目简称不能为空" : err.message;
      toast.error(msg);
    }
  });

  // 3. 智能答案切换逻辑
  const toggleAnswer = (label: string) => {
    if (formData.type === "multiple_choice") {
      const current = (formData.answer || "").split(",").filter(Boolean);
      const next = current.includes(label) ? current.filter(a => a !== label) : [...current, label];
      setFormData({ ...formData, answer: next.sort().join(",") });
    } else {
      setFormData({ ...formData, answer: label });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 前端预校验
    if (!formData.courseId) return toast.error("请选择所属课程");
    if (!formData.title.trim()) return toast.error("题目简称不能为空");
    if (!formData.content.trim()) return toast.error("题干内容不能为空");
    if (!formData.answer.trim()) return toast.error("请设置标准答案");

    upsertMutation.mutate({
      ...formData,
      id: initialData?.id,
      courseId: parseInt(formData.courseId),
      // 只有选择题类才上传 options 数组
      options: isChoice ? formData.options : null,
      analysis: formData.analysis || undefined,
    } as any);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center bg-zinc-900 p-6 rounded-[2.5rem] text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">{isEdit ? "修改试题" : "录入试题"}</h2>
            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mt-1 italic">Comprehensive Validation Layer</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 第一部分：核心属性 */}
        <div className="grid grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-zinc-400 ml-1">关联课程</Label>
            <select
              value={formData.courseId}
              onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
              className="w-full h-12 rounded-2xl bg-zinc-100 px-4 font-bold text-sm appearance-none border-none shadow-inner"
            >
              <option value="" disabled>选择课程</option>
              {courses?.map((c: any) => <option key={c.id} value={c.id.toString()}>{c.name}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-zinc-400 ml-1">题目类型</Label>
            <select
              value={formData.type}
              onChange={(e) => {
                const newType = e.target.value as QuestionType;
                let opts = formData.options;
                if (newType === "true_false") opts = [{ label: "T", text: "正确" }, { label: "F", text: "错误" }];
                setFormData({ ...formData, type: newType, options: opts, answer: "" });
              }}
              className="w-full h-12 rounded-2xl bg-zinc-100 px-4 font-bold text-sm appearance-none border-none shadow-inner"
            >
              {Object.entries(QUESTION_TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>

        {/* 第二部分：题干与简称（解决 title 丢失问题） */}
        <div className="space-y-5 bg-zinc-50/50 p-6 rounded-[2.5rem] border border-zinc-100 shadow-sm">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-zinc-400 ml-1">题目简称 (必填)</Label>
            <Input 
              value={formData.title} 
              onChange={e => setFormData({ ...formData, title: e.target.value })} 
              className="h-12 rounded-2xl border-none bg-white font-bold"
              placeholder="用于列表展示的精简标题..."
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-zinc-400 ml-1">详细题干内容</Label>
            <Textarea 
              value={formData.content} 
              onChange={e => setFormData({ ...formData, content: e.target.value })} 
              className="min-h-[120px] rounded-2xl border-none bg-white p-5 font-medium shadow-sm"
              placeholder="请输入完整的题目描述..."
            />
          </div>
        </div>

        {/* 第三部分：动态选项与智能答案 */}
        {isChoice ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center px-1">
              <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">
                {formData.type === 'true_false' ? '判断设置 (锁定)' : '选项列表'}
              </Label>
              {formData.type !== 'true_false' && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setFormData(p => ({ ...p, options: [...p.options, { label: String.fromCharCode(65 + p.options.length), text: "" }] }))}>
                  <Plus className="h-3 w-3 mr-1" /> 增加备选项
                </Button>
              )}
            </div>
            
            <div className="grid gap-3">
              {formData.options.map((opt, idx) => {
                const isSelected = formData.answer.split(",").includes(opt.label);
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleAnswer(opt.label)}
                      className={`h-11 w-11 shrink-0 rounded-xl flex items-center justify-center font-black text-xs transition-all ${
                        isSelected ? "bg-emerald-500 text-white shadow-lg ring-4 ring-emerald-100" : "bg-zinc-200 text-zinc-400"
                      }`}
                    >
                      {opt.label}
                    </button>
                    <Input 
                      value={opt.text} 
                      readOnly={formData.type === 'true_false'}
                      onChange={e => {
                        const newOpts = [...formData.options];
                        newOpts[idx].text = e.target.value;
                        setFormData({...formData, options: newOpts});
                      }} 
                      className="h-11 rounded-xl border-none bg-zinc-100 font-bold"
                    />
                    {formData.type !== 'true_false' && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => setFormData(p => ({ ...p, options: p.options.filter((_, i) => i !== idx), answer: "" }))}>
                        <X className="h-4 w-4 text-zinc-300" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-emerald-600 ml-2 italic">当前选定的标准答案:</span>
              <div className="flex gap-2">
                {formData.answer ? formData.answer.split(",").map(a => (
                  <Badge key={a} className="bg-emerald-600 px-3 py-1 rounded-lg border-none">{a}</Badge>
                )) : <span className="text-[10px] text-emerald-300 font-bold">请点击左侧字母设置答案</span>}
              </div>
            </div>
          </div>
        ) : (
          /* 非选择类答案区 */
          <div className="space-y-4">
             <Label className="text-[10px] font-black uppercase text-zinc-400 ml-1">
                {formData.type === 'programming' ? '编程参考实现 (代码风格)' : '标准参考答案内容'}
             </Label>
             <Textarea 
                value={formData.answer} 
                onChange={e => setFormData({ ...formData, answer: e.target.value })}
                className={`w-full rounded-[2.5rem] border-none p-8 shadow-inner ${
                  formData.type === 'programming' ? 'bg-zinc-900 text-emerald-400 font-mono min-h-[350px]' : 'bg-zinc-100 min-h-[180px]'
                }`}
                placeholder={formData.type === 'programming' ? "// 在此输入代码..." : "请输入标准答案内容..."}
             />
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase text-amber-500 ml-1 flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> 题目解析与思路说明
          </Label>
          <Textarea 
            value={formData.analysis} 
            onChange={e => setFormData({ ...formData, analysis: e.target.value })} 
            className="rounded-2xl border-none bg-amber-50/50 p-4 text-sm shadow-inner min-h-[100px]"
            placeholder="此内容仅在考试结束后对学生可见..."
          />
        </div>

        {!readOnly && (
          <Button type="submit" disabled={upsertMutation.isPending} className="w-full h-16 rounded-[2.5rem] bg-zinc-900 text-white font-bold text-base shadow-2xl active:scale-95 transition-all">
            {upsertMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-6 w-6 mr-2" />}
            {isEdit ? "确认更新题目" : "保存并存入题库"}
          </Button>
        )}
      </form>
    </div>
  );
}