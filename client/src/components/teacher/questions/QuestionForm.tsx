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
import { Loader2, Sparkles, Check, Plus, X, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// 表单校验架构
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
  })).optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

interface QuestionFormProps {
  initialData?: any; 
  onSuccess: () => void; 
  readOnly?: boolean; 
}

export default function QuestionForm({ initialData, onSuccess, readOnly = false }: QuestionFormProps) {
  const isEdit = !!initialData?.id;
  const utils = trpc.useUtils();
  const { data: courses } = trpc.courses.list.useQuery();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
      type: "single_choice",
      difficulty: "medium",
      answer: "",
      analysis: "",
      courseId: 0,
      options: [
        { label: "A", text: "" }, { label: "B", text: "" }, 
        { label: "C", text: "" }, { label: "D", text: "" }
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "options",
  });

  // 关键：监听 initialData 并执行重置逻辑
  useEffect(() => {
    if (initialData) {
      // 1. 处理选项 JSON
      let opts = initialData.options;
      if (typeof opts === 'string') {
        try { opts = JSON.parse(opts); } catch { opts = []; }
      }

      // 2. 强制回显字段映射，确保 title 和 courseId 能够被识别
      form.reset({
        id: initialData.id,
        title: initialData.title || "", // 确保 title 存在
        content: initialData.content || "",
        type: initialData.type || "single_choice",
        difficulty: initialData.difficulty || "medium",
        answer: initialData.answer || "",
        analysis: initialData.analysis || "",
        // 关键：Select 组件要求字符串匹配，但在数据层需确保 courseId 是数字
        courseId: initialData.courseId ? Number(initialData.courseId) : 0,
        options: Array.isArray(opts) ? opts : [],
      });
    } else {
      // 新增状态下的重置
      form.reset({
        title: "",
        content: "",
        type: "single_choice",
        difficulty: "medium",
        answer: "",
        analysis: "",
        courseId: 0,
        options: [
          { label: "A", text: "" }, { label: "B", text: "" }, 
          { label: "C", text: "" }, { label: "D", text: "" }
        ],
      });
    }
  }, [initialData, form]);

  const watchType = form.watch("type");
  const isChoice = watchType === "single_choice" || watchType === "multiple_choice";

  const upsertMutation = trpc.questions.upsert.useMutation({
    onSuccess: () => { 
      toast.success(isEdit ? "题目已更新" : "新试题录入成功"); 
      utils.questions.list.invalidate(); 
      onSuccess(); 
    },
    onError: (err) => toast.error(err.message)
  });

  const onSubmit = (values: FormValues) => {
    if (readOnly) return;
    const payload = {
      ...values,
      options: isChoice ? values.options : null,
    };
    upsertMutation.mutate(payload);
  };

  return (
    <div className="space-y-8">
      {/* 头部展示区 */}
      <div className="flex justify-between items-center bg-zinc-900 p-6 rounded-[2rem] text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="h-11 w-11 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
            <Layers className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              {readOnly ? "题目详情预览" : isEdit ? "编辑题目档案" : "录入新试题"}
            </h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Academic Question Resource</p>
          </div>
        </div>
        {initialData?.id && <Badge className="bg-white/10 text-white border-none rounded-lg px-3">REF: #{initialData.id}</Badge>}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-5">
            {/* 课程选择 - 修复不回显逻辑 */}
            <FormField control={form.control} name="courseId" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black uppercase text-zinc-400 ml-1">所属课程</FormLabel>
                <Select 
                  onValueChange={(v) => field.onChange(Number(v))} 
                  // 必须转为 string 以匹配 SelectItem
                  value={field.value && field.value !== 0 ? field.value.toString() : undefined} 
                  disabled={readOnly}
                >
                  <FormControl>
                    <SelectTrigger className="rounded-2xl border-none bg-zinc-100 h-12 font-bold focus:ring-2 focus:ring-zinc-200">
                      <SelectValue placeholder="请选择课程..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent position="popper" className="z-[250] rounded-2xl border-zinc-100 shadow-2xl">
                    {courses?.map(c => (
                      <SelectItem key={c.id} value={c.id.toString()} className="font-bold py-3">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {/* 题型选择 */}
            <FormField control={form.control} name="type" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black uppercase text-zinc-400 ml-1">试题题型</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={readOnly}>
                  <FormControl>
                    <SelectTrigger className="rounded-2xl border-none bg-zinc-100 h-12 font-bold focus:ring-2 focus:ring-zinc-200">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent position="popper" className="z-[250] rounded-2xl border-zinc-100 shadow-2xl">
                    {Object.entries(QUESTION_TYPE_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k} className="font-bold py-3">{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          {/* 难度选择 */}
          <FormField control={form.control} name="difficulty" render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className="text-[10px] font-black uppercase text-zinc-400 ml-1">难度等级</FormLabel>
              <div className="flex bg-zinc-100 p-1.5 rounded-2xl gap-2">
                {Object.entries(DIFFICULTY_CONFIG).map(([key, cfg]) => (
                  <button
                    key={key}
                    type="button"
                    disabled={readOnly}
                    onClick={() => field.onChange(key)}
                    className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase transition-all duration-300 ${
                      field.value === key ? 'bg-white text-zinc-900 shadow-md scale-[1.02]' : 'text-zinc-400 hover:text-zinc-600'
                    } disabled:cursor-default`}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
            </FormItem>
          )} />

          <div className="space-y-5 bg-zinc-50/50 p-6 rounded-[2rem] border border-zinc-100">
             {/* 标题回显修复 */}
             <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-[10px] font-black uppercase text-zinc-400 ml-1">题目简述/标题</FormLabel>
                <FormControl>
                  <Input 
                    disabled={readOnly} 
                    className="h-12 rounded-2xl border-none bg-white shadow-sm font-bold text-sm disabled:opacity-100" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="content" render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-[10px] font-black uppercase text-zinc-400 ml-1">题干内容</FormLabel>
                <FormControl>
                  <Textarea 
                    disabled={readOnly} 
                    className="min-h-[120px] rounded-[1.5rem] border-none bg-white shadow-sm p-5 font-medium resize-none text-sm leading-relaxed disabled:opacity-100" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          {/* 选择题选项 */}
          {isChoice && (
            <div className="space-y-4 animate-in slide-in-from-top-2">
              <div className="flex justify-between items-center px-2">
                <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">选项配置</span>
                {!readOnly && (
                  <Button type="button" variant="ghost" size="sm" className="h-8 rounded-full text-[10px] font-bold" onClick={() => append({ label: String.fromCharCode(65 + fields.length), text: "" })}>
                    添加选项
                  </Button>
                )}
              </div>
              <div className="grid gap-3">
                {fields.map((fieldItem, index) => (
                  <div key={fieldItem.id} className="flex items-center gap-3">
                    <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-black text-xs shadow-lg">{fields[index].label}</div>
                    <FormField control={form.control} name={`options.${index}.text`} render={({ field }) => (
                      <FormItem className="flex-1 space-y-0">
                        <FormControl>
                          <Input disabled={readOnly} className="h-11 rounded-xl border-none bg-zinc-100 font-bold text-sm disabled:opacity-100" {...field} />
                        </FormControl>
                      </FormItem>
                    )} />
                    {!readOnly && (
                      <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-zinc-300 hover:text-red-500" onClick={() => remove(index)}><X className="h-4 w-4" /></Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-5 p-6 bg-zinc-50/50 rounded-[2rem] border border-zinc-100">
            <FormField control={form.control} name="answer" render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-[10px] font-black uppercase text-zinc-400 ml-1">标准参考答案</FormLabel>
                <FormControl>
                  <Input disabled={readOnly} className="rounded-xl border-none bg-white shadow-sm h-11 font-black text-sm text-emerald-600 disabled:opacity-100" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="analysis" render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-[10px] font-black uppercase text-amber-500 ml-1 flex items-center gap-1"><Sparkles className="h-3 w-3" /> 详解解析</FormLabel>
                <FormControl>
                  <Input disabled={readOnly} className="rounded-xl border-none bg-amber-50/50 shadow-sm h-11 font-medium text-xs text-amber-700 disabled:opacity-100" {...field} />
                </FormControl>
              </FormItem>
            )} />
          </div>

          {!readOnly && (
            <div className="pt-4">
              <Button type="submit" disabled={upsertMutation.isPending} className="w-full h-16 rounded-[2rem] bg-zinc-900 text-white font-bold text-base shadow-2xl hover:scale-[1.01] transition-all">
                {upsertMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-6 w-6" />}
                <span>{isEdit ? "更新题目档案" : "确认录入题库"}</span>
              </Button>
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}