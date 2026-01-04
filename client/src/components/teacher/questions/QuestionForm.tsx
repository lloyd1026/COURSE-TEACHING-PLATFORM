import { useState, useEffect, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage 
} from "@/components/ui/form";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { QUESTION_TYPE_CONFIG, DIFFICULTY_CONFIG } from "@/lib/configs";
import { Loader2, Sparkles, FileText, Check, Plus, X, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  id: z.number().optional(),
  title: z.string().min(1, "请输入题目简称或标题"),
  content: z.string().min(1, "请输入题干正文"),
  type: z.enum(["single_choice", "multiple_choice", "fill_blank", "true_false", "essay", "programming"]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  answer: z.string().min(1, "正确答案不能为空"),
  analysis: z.string().optional(),
  courseId: z.number().min(1, "请选择所属课程"),
  options: z.array(z.object({
    label: z.string(),
    text: z.string() 
  })).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface QuestionFormProps {
  initialData?: any; 
  onSuccess: () => void; 
}

export default function QuestionForm({ initialData, onSuccess }: QuestionFormProps) {
  const isEdit = !!initialData?.id;
  const utils = trpc.useUtils();
  
  // 获取课程列表
  const { data: courses } = trpc.courses.list.useQuery();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: useMemo(() => ({
      id: initialData?.id,
      title: initialData?.title ?? "",
      content: initialData?.content ?? "",
      type: initialData?.type ?? "single_choice",
      difficulty: initialData?.difficulty ?? "medium",
      answer: initialData?.answer ?? "",
      analysis: initialData?.analysis ?? "",
      courseId: initialData?.courseId ?? 0,
      options: initialData?.options ?? [
        { label: "A", text: "" }, { label: "B", text: "" }, 
        { label: "C", text: "" }, { label: "D", text: "" }
      ],
    }), [initialData]),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "options",
  });

  const watchType = form.watch("type");
  const isChoice = watchType === "single_choice" || watchType === "multiple_choice";

  // 统一使用 upsert 接口
  const upsertMutation = trpc.questions.upsert.useMutation({
    onSuccess: () => { 
      toast.success(isEdit ? "题目已更新" : "新试题录入成功"); 
      utils.questions.list.invalidate(); 
      onSuccess(); 
    },
    onError: (err) => toast.error(err.message)
  });

  const onSubmit = (values: FormValues) => {
    // 选择题选项空校验
    if (isChoice) {
      const isAnyOptionEmpty = values.options?.some(opt => !opt.text.trim());
      if (isAnyOptionEmpty) return toast.error("选择题的选项内容不能为空");
    }

    // 格式化 payload
    const payload = {
      ...values,
      // 非选择题清除选项数据，避免脏数据进入 DB
      options: isChoice ? values.options : null,
    };

    upsertMutation.mutate(payload);
  };

  return (
    <div className="space-y-8">
      {/* 头部装饰 */}
      <div className="flex justify-between items-center bg-zinc-900 p-6 rounded-[2rem] text-white shadow-xl shadow-zinc-200">
        <div className="flex items-center gap-4">
          <div className="h-11 w-11 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
            <Layers className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">{isEdit ? "编辑题目档案" : "录入新试题"}</h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Academic Question Resource</p>
          </div>
        </div>
        {isEdit && <Badge className="bg-white/10 text-white border-none rounded-lg px-3">REF: #{initialData.id}</Badge>}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-5">
            <FormField control={form.control} name="courseId" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black uppercase text-zinc-400 ml-1">所属课程</FormLabel>
                <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString()}>
                  <FormControl>
                    <SelectTrigger className="rounded-2xl border-none bg-zinc-100 h-12 font-bold focus:ring-2 focus:ring-zinc-200 transition-all">
                      <SelectValue placeholder="请选择课程..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="rounded-2xl border-zinc-100 shadow-2xl">
                    {courses?.map(c => <SelectItem key={c.id} value={c.id.toString()} className="font-bold py-3">{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="type" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black uppercase text-zinc-400 ml-1">试题题型</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="rounded-2xl border-none bg-zinc-100 h-12 font-bold focus:ring-2 focus:ring-zinc-200 transition-all">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="rounded-2xl border-zinc-100 shadow-2xl">
                    {Object.entries(QUESTION_TYPE_CONFIG).map(([k, v]) => <SelectItem key={k} value={k} className="font-bold py-3">{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <FormField control={form.control} name="difficulty" render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className="text-[10px] font-black uppercase text-zinc-400 ml-1">难度等级</FormLabel>
              <div className="flex bg-zinc-100 p-1.5 rounded-2xl gap-2">
                {Object.entries(DIFFICULTY_CONFIG).map(([key, cfg]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => field.onChange(key)}
                    className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase transition-all duration-300 ${
                      field.value === key ? 'bg-white text-zinc-900 shadow-md scale-[1.02]' : 'text-zinc-400 hover:text-zinc-600'
                    }`}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
            </FormItem>
          )} />

          <div className="space-y-5 bg-zinc-50/50 p-6 rounded-[2rem] border border-zinc-100">
             <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-[10px] font-black uppercase text-zinc-400 ml-1">题目简述/标题</FormLabel>
                <FormControl><Input className="h-12 rounded-2xl border-none bg-white shadow-sm font-bold text-sm" placeholder="例如：勾股定理基础练习 01" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="content" render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-[10px] font-black uppercase text-zinc-400 ml-1">题干内容 (支持文本/公式)</FormLabel>
                <FormControl><Textarea className="min-h-[120px] rounded-[1.5rem] border-none bg-white shadow-sm p-5 font-medium resize-none text-sm leading-relaxed" placeholder="请输入详细的题目描述..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          {/* 选择题选项 */}
          {isChoice && (
            <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
              <div className="flex justify-between items-center px-2">
                <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">
                   <Plus className="h-3 w-3" /> 选项配置
                </span>
                <Button type="button" variant="ghost" size="sm" className="h-8 rounded-full text-[10px] font-bold text-zinc-500 hover:bg-zinc-100" onClick={() => append({ label: String.fromCharCode(65 + fields.length), text: "" })}>
                  添加选项
                </Button>
              </div>
              <div className="grid gap-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-3 group animate-in fade-in slide-in-from-left-2">
                    <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-black text-xs shadow-lg">{fields[index].label}</div>
                    <FormField control={form.control} name={`options.${index}.text`} render={({ field }) => (
                      <FormItem className="flex-1 space-y-0">
                        <FormControl><Input className="h-11 rounded-xl border-none bg-zinc-100 font-bold text-sm focus:bg-white transition-all shadow-inner" placeholder={`请输入选项 ${fields[index].label} 的内容`} {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-all" onClick={() => remove(index)}><X className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-5 p-6 bg-zinc-50/50 rounded-[2rem] border border-zinc-100">
            <FormField control={form.control} name="answer" render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-[10px] font-black uppercase text-zinc-400 ml-1">标准参考答案</FormLabel>
                <FormControl><Input className="rounded-xl border-none bg-white shadow-sm h-11 font-black text-sm text-emerald-600" placeholder="A / 正确 / 文本答案" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="analysis" render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-[10px] font-black uppercase text-amber-500 ml-1 flex items-center gap-1"><Sparkles className="h-3 w-3" /> 详解与解析</FormLabel>
                <FormControl><Input className="rounded-xl border-none bg-amber-50/50 shadow-sm h-11 font-medium text-xs text-amber-700" placeholder="输入题目分析思路..." {...field} /></FormControl>
              </FormItem>
            )} />
          </div>

          <div className="pt-4">
            <Button 
              type="submit" 
              disabled={upsertMutation.isPending} 
              className="w-full h-16 rounded-[2rem] bg-zinc-900 text-white font-bold text-base shadow-2xl hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {upsertMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-6 w-6" />}
              <span>{isEdit ? "更新题目档案" : "确认录入题库"}</span>
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}