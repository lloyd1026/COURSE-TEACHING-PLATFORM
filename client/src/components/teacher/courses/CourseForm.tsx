import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage 
} from "@/components/ui/form";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Loader2, BookOpen, ShieldCheck, Layers, Check, Zap, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// 兼容 React 18 的富文本
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const formSchema = z.object({
  name: z.string().min(1, "请输入课程全称"),
  code: z.string().min(1, "请输入课程代码"),
  description: z.string().optional(),
  semester: z.string().min(1, "请选择学期"),
  credits: z.number().min(0),
  status: z.enum(["draft", "active", "archived"]),
});

type FormValues = z.infer<typeof formSchema>;

interface CourseFormProps {
  initialData?: any;
  onSuccess: () => void;
}

export default function CourseForm({ initialData, onSuccess }: CourseFormProps) {
  const isEdit = !!initialData?.id;
  const utils = trpc.useUtils();

  // 动态学期生成
  const semesterOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const options = [];
    for (let i = -1; i <= 1; i++) {
      const year = currentYear + i;
      options.push(`${year}-${year + 1}-1`);
      options.push(`${year}-${year + 1}-2`);
    }
    return options;
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: useMemo(() => ({
      name: initialData?.name ?? "",
      code: initialData?.code ?? "",
      description: initialData?.description ?? "",
      semester: initialData?.semester ?? semesterOptions[2],
      credits: initialData?.credits ?? 3,
      status: (initialData?.status as any) ?? "draft",
    }), [initialData]),
  });

  const createMutation = trpc.courses.create.useMutation({
    onSuccess: () => { toast.success("课程已创建"); utils.courses.list.invalidate(); onSuccess(); },
    onError: (err) => toast.error(err.message)
  });

  const updateMutation = trpc.courses.update.useMutation({
    onSuccess: () => { toast.success("课程已更新"); utils.courses.list.invalidate(); onSuccess(); },
    onError: (err) => toast.error(err.message)
  });

  const onSubmit = (values: FormValues) => {
    if (isEdit) updateMutation.mutate({ id: initialData.id, ...values });
    else createMutation.mutate(values as any);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      {/* 头部：Liquid Glass 风格 */}
      <div className="flex justify-between items-center bg-zinc-50/50 p-4 rounded-[1.5rem] border border-zinc-100">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-zinc-900 flex items-center justify-center text-white shadow-sm">
            <BookOpen className="h-4.5 w-4.5" />
          </div>
          <h2 className="text-[15px] font-medium tracking-tight">
            {isEdit ? "编辑课程档案" : "开设新课程"}
          </h2>
        </div>
        {isEdit && <Badge variant="outline" className="text-[10px] text-zinc-400 rounded-full border-zinc-200">ID: {initialData.code}</Badge>}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          {/* 基础信息组 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="text-[11px] text-zinc-400 ml-1">课程名称 *</FormLabel>
                <FormControl><Input className="h-10 rounded-xl border-none bg-zinc-100/50 px-4 text-[13px] font-medium" placeholder="如：计算机组成原理" {...field} /></FormControl>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )} />

            <FormField control={form.control} name="code" render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="text-[11px] text-zinc-400 ml-1">课程代码 *</FormLabel>
                <FormControl><Input disabled={isEdit} className="h-10 rounded-xl border-none bg-zinc-100/50 px-4 text-[13px] font-mono" placeholder="CS101" {...field} /></FormControl>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="semester" render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="text-[11px] text-zinc-400 ml-1">授课学期</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger className="rounded-xl border-none bg-zinc-100/50 h-10 text-[13px]"><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent className="rounded-xl border-none shadow-xl">
                    {semesterOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormItem>
            )} />

            <FormField control={form.control} name="credits" render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="text-[11px] text-zinc-400 ml-1">学分设定</FormLabel>
                <FormControl><Input type="number" step={0.5} className="h-10 rounded-xl border-none bg-zinc-100/50 px-4 text-[13px]" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl>
              </FormItem>
            )} />
          </div>

          {/* 状态选择：横向 Pill 风格 */}
          <FormField control={form.control} name="status" render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel className="text-[11px] text-zinc-400 ml-1">发布状态</FormLabel>
              <div className="flex bg-zinc-100/50 p-1 rounded-xl gap-1">
                {[
                  { id: 'draft', label: '草稿' },
                  { id: 'active', label: '发布' },
                  { id: 'archived', label: '归档' }
                ].map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => field.onChange(s.id)}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] transition-all ${
                      field.value === s.id ? 'bg-white text-zinc-900 shadow-sm font-medium' : 'text-zinc-400 hover:text-zinc-600'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </FormItem>
          )} />

          {/* 富文本：教学大纲 */}
          <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel className="text-[11px] text-zinc-400 ml-1">教学大纲 / 课程介绍</FormLabel>
              <FormControl>
                <div className="rounded-xl border border-zinc-100 overflow-hidden bg-white/50">
                  <ReactQuill
                    theme="snow"
                    value={field.value}
                    onChange={field.onChange}
                    className="min-h-[250px]"
                    placeholder="输入详细的授课内容、考核标准等..."
                  />
                </div>
              </FormControl>
            </FormItem>
          )} />

          {/* 提交按钮 */}
          <div className="pt-2">
            <Button 
              type="submit" 
              disabled={isPending} 
              className="w-full h-11 rounded-full bg-zinc-900 text-white text-[13px] font-medium shadow-lg hover:bg-zinc-800 transition-all active:scale-[0.97] gap-2"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {isEdit ? "保存更新" : "确认创建并发布"}
            </Button>
          </div>
        </form>
      </Form>

      <style>{`
        .ql-toolbar.ql-snow { border: none; border-bottom: 1px solid #f4f4f5; background: #fafafa; padding: 8px 12px; }
        .ql-container.ql-snow { border: none; font-family: inherit; }
        .ql-editor { font-size: 13px; color: #3f3f46; min-h: 200px; }
        .ql-editor.ql-blank::before { color: #a1a1aa; font-style: normal; font-size: 13px; }
      `}</style>
    </div>
  );
}