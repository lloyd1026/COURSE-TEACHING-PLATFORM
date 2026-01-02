import { useState, useMemo } from "react";
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
import { Loader2, Sparkles, FileText, Check, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// 1. Zod Schema：优化校验逻辑
const formSchema = z.object({
  content: z.string().min(1, "请输入题干正文"),
  type: z.enum(["single_choice", "multiple_choice", "fill_blank", "true_false", "essay", "programming"]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  answer: z.string().min(1, "答案不能为空"),
  analysis: z.string().optional(),
  courseId: z.number().min(1, "请选择所属课程"),
  // options 的 text 校验改为可选，由 onSubmit 逻辑进行二次处理，防止填空题被拦截
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
  const { data: courses } = trpc.courses.list.useQuery();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: useMemo(() => ({
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

  const createMutation = trpc.questions.create.useMutation({
    onSuccess: () => { toast.success("录入成功"); utils.questions.list.invalidate(); onSuccess(); },
    onError: (err) => toast.error(err.message)
  });

  const updateMutation = trpc.questions.update.useMutation({
    onSuccess: () => { toast.success("更新成功"); utils.questions.list.invalidate(); onSuccess(); },
    onError: (err) => toast.error(err.message)
  });

  // 核心修复：提交时清洗数据
  const onSubmit = (values: FormValues) => {
    // 如果是选择题，必须检查选项是否填写完整
    if (isChoice) {
      const emptyOptions = values.options?.some(opt => !opt.text.trim());
      if (emptyOptions) {
        toast.error("选择题的选项内容不能为空");
        return;
      }
    }

    const payload = {
      ...values,
      title: values.content.substring(0, 50),
      // 关键点：非选择题（填空等）强制发送 null，避免残留 A/B/C/D 数据
      options: isChoice ? values.options : null,
    };

    if (isEdit) updateMutation.mutate({ id: initialData.id, ...payload });
    else createMutation.mutate(payload);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      {/* Header */}
      <div className="flex justify-between items-center bg-slate-50/50 p-4 rounded-[1.5rem] border border-slate-100">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-black flex items-center justify-center text-white shadow-md">
            <FileText className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-black tracking-tight">{isEdit ? "编辑试题" : "新试题录入"}</h2>
        </div>
        <Badge variant="outline" className="text-slate-400 border-slate-200 rounded-full px-3">{isEdit ? `ID: ${initialData.id}` : "NEW"}</Badge>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="courseId" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black uppercase text-slate-400 ml-1">所属课程</FormLabel>
                <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString()}>
                  <FormControl><SelectTrigger className="rounded-xl border-none bg-slate-100/50 h-10 font-bold"><SelectValue placeholder="课程" /></SelectTrigger></FormControl>
                  <SelectContent className="rounded-xl border-none shadow-2xl">
                    {courses?.map(c => <SelectItem key={c.id} value={c.id.toString()} className="font-bold">{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormItem>
            )} />
            <FormField control={form.control} name="type" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black uppercase text-slate-400 ml-1">试题题型</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger className="rounded-xl border-none bg-slate-100/50 h-10 font-bold"><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent className="rounded-xl border-none shadow-2xl">
                    {Object.entries(QUESTION_TYPE_CONFIG).map(([k, v]) => <SelectItem key={k} value={k} className="font-bold">{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormItem>
            )} />
          </div>

          <FormField control={form.control} name="difficulty" render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel className="text-[10px] font-black uppercase text-slate-400 ml-1">难度评估</FormLabel>
              <div className="flex bg-slate-100/80 p-1 rounded-xl gap-1">
                {Object.entries(DIFFICULTY_CONFIG).map(([key, cfg]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => field.onChange(key)}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                      field.value === key ? 'bg-white text-black shadow-sm' : 'text-slate-400 hover:text-slate-500'
                    }`}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
            </FormItem>
          )} />

          <FormField control={form.control} name="content" render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel className="text-[10px] font-black uppercase text-slate-400 ml-1">题干描述</FormLabel>
              <FormControl><Textarea className="min-h-[80px] rounded-xl border-none bg-slate-100/50 p-4 font-medium resize-none focus-visible:ring-1 focus-visible:ring-slate-200" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          {/* 选项配置 - 只有选择题展示 */}
          {isChoice && (
            <div className="space-y-2 animate-in slide-in-from-top-1 duration-300">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">候选项管理</span>
                <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] font-black" onClick={() => append({ label: String.fromCharCode(65 + fields.length), text: "" })}>
                  <Plus className="h-3 w-3 mr-1" /> ADD
                </Button>
              </div>
              <div className="grid gap-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2 group">
                    <div className="h-8 w-8 flex-shrink-0 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-black text-[10px] shadow-sm">{fields[index].label}</div>
                    <FormField control={form.control} name={`options.${index}.text`} render={({ field }) => (
                      <FormItem className="flex-1 space-y-0">
                        <FormControl><Input className="h-9 rounded-lg border-none bg-slate-100/50 font-medium text-sm group-hover:bg-slate-100 transition-colors" {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-red-500" onClick={() => remove(index)}><X className="h-3.5 w-3.5" /></Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="answer" render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="text-[10px] font-black uppercase text-slate-400 ml-1">标准答案</FormLabel>
                <FormControl><Input className="rounded-xl border-none bg-slate-100/50 h-10 font-black text-sm" {...field} /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="analysis" render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="text-[10px] font-black uppercase text-amber-500 ml-1 flex items-center gap-1"><Sparkles className="h-3 w-3" /> AI 解析源</FormLabel>
                <FormControl><Input className="rounded-xl border-none bg-amber-50/30 h-10 font-medium text-xs" placeholder="可选..." {...field} /></FormControl>
              </FormItem>
            )} />
          </div>

          <div className="pt-2">
            <Button 
              type="submit" 
              disabled={isPending} 
              className="w-full h-11 rounded-full bg-black text-white font-black text-xs uppercase tracking-widest shadow-lg active:scale-[0.97] transition-all flex items-center justify-center gap-2"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {isEdit ? "Update Archive" : "Commit Question"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}