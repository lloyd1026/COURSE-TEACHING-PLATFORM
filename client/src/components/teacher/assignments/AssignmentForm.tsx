import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Calendar, BookOpen, Layers, Check, FileEdit, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  title: z.string().min(1, "请输入作业标题"),
  description: z.string().optional(),
  courseId: z.number().min(1, "请选择课程"),
  classId: z.number().min(1, "请选择班级"),
  dueDate: z.string().min(1, "请设置截止时间"),
  status: z.enum(["draft", "published", "closed"]),
});

type FormValues = z.infer<typeof formSchema>;

interface AssignmentFormProps {
  initialData?: any;
  onSuccess: () => void;
}

export default function AssignmentForm({ initialData, onSuccess }: AssignmentFormProps) {
  const isEdit = !!initialData?.id;
  const utils = trpc.useUtils();
  
  const { data: courses } = trpc.courses.list.useQuery();
  const { data: classes } = trpc.classes?.list.useQuery() || { data: [] };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: useMemo(() => ({
      title: initialData?.title ?? "",
      description: initialData?.description ?? "",
      courseId: initialData?.courseId ?? 0,
      classId: initialData?.classId ?? 1,
      dueDate: initialData?.dueDate ? new Date(initialData.dueDate).toISOString().slice(0, 16) : "",
      status: initialData?.status ?? "published", // 默认直接发布
    }), [initialData]),
  });

  const createMutation = trpc.assignments.create.useMutation({
    onSuccess: () => { toast.success("操作成功"); utils.assignments.list.invalidate(); onSuccess(); },
    onError: (err) => toast.error(err.message)
  });

  const updateMutation = trpc.assignments.update.useMutation({
    onSuccess: () => { toast.success("操作成功"); utils.assignments.list.invalidate(); onSuccess(); },
    onError: (err) => toast.error(err.message)
  });

  // 处理不同按钮的提交
  const handleCustomSubmit = (status: "draft" | "published") => {
    form.setValue("status", status);
    form.handleSubmit((values) => {
      const payload = {
        ...values,
        dueDate: new Date(values.dueDate),
      };
      if (isEdit) updateMutation.mutate({ id: initialData.id, ...payload });
      else createMutation.mutate(payload);
    })();
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex justify-between items-center bg-zinc-50/50 p-4 rounded-[1.5rem] border border-zinc-100">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-zinc-900 flex items-center justify-center text-white">
            <Layers className="h-4 w-4" />
          </div>
          <h2 className="text-[14px] font-medium tracking-tight">
            {isEdit ? "修改作业信息" : "新建作业任务"}
          </h2>
        </div>
        <Badge variant="secondary" className="text-[10px] font-normal bg-white border-zinc-100 text-zinc-400 rounded-full px-3">
          {isEdit ? `编辑模式` : "布置模式"}
        </Badge>
      </div>

      <Form {...form}>
        <form className="space-y-5">
          <FormField control={form.control} name="title" render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel className="text-[11px] text-zinc-400 ml-1">作业名称</FormLabel>
              <FormControl><Input className="h-10 rounded-xl border-none bg-zinc-100/50 px-4 text-[13px]" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="courseId" render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="text-[11px] text-zinc-400 ml-1">关联课程</FormLabel>
                <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString()}>
                  <FormControl><SelectTrigger className="rounded-xl border-none bg-zinc-100/50 h-10 text-[13px]"><SelectValue placeholder="课程" /></SelectTrigger></FormControl>
                  <SelectContent className="rounded-xl border-none shadow-xl">
                    {courses?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormItem>
            )} />

            <FormField control={form.control} name="classId" render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="text-[11px] text-zinc-400 ml-1">目标班级</FormLabel>
                <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString()}>
                  <FormControl><SelectTrigger className="rounded-xl border-none bg-zinc-100/50 h-10 text-[13px]"><SelectValue placeholder="班级" /></SelectTrigger></FormControl>
                  <SelectContent className="rounded-xl border-none shadow-xl">
                    {classes?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormItem>
            )} />
          </div>

          <FormField control={form.control} name="dueDate" render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel className="text-[11px] text-zinc-400 ml-1">截止时间</FormLabel>
              <FormControl>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                  <Input type="datetime-local" className="h-10 pl-10 rounded-xl border-none bg-zinc-100/50 text-[13px]" {...field} />
                </div>
              </FormControl>
            </FormItem>
          )} />

          <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel className="text-[11px] text-zinc-400 ml-1">详细描述</FormLabel>
              <FormControl><Textarea className="min-h-[80px] rounded-xl border-none bg-zinc-100/50 p-4 text-[13px] resize-none" {...field} /></FormControl>
            </FormItem>
          )} />

          <div className="flex gap-3 pt-2">
            <Button 
              type="button" 
              variant="outline"
              disabled={isPending}
              onClick={() => handleCustomSubmit("draft")}
              className="flex-1 h-11 rounded-full border-zinc-200 text-zinc-500 text-[13px] font-medium"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileEdit className="h-4 w-4 mr-2" />}
              存为草稿
            </Button>
            <Button 
              type="button" 
              disabled={isPending}
              onClick={() => handleCustomSubmit("published")}
              className="flex-[1.5] h-11 rounded-full bg-zinc-900 text-white text-[13px] font-medium shadow-lg hover:bg-zinc-800 transition-all active:scale-95"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              立即发布
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}