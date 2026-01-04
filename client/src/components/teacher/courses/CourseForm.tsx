import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage 
} from "@/components/ui/form";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { 
  Loader2, BookOpen, Check, Zap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import RichTextEditor from "@/components/common/RichTextEditor";

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
      description: initialData?.description ?? "", // ✅ 现在后端已返回此字段，这里可以正常回显
      semester: initialData?.semester ?? semesterOptions[2],
      credits: initialData?.credits ?? 3,
      status: (initialData?.status as any) ?? "draft",
    }), [initialData, semesterOptions]),
  });

  // ✅ 1. 使用合并后的 upsertMutation
  const upsertMutation = trpc.courses.upsert.useMutation({
    onSuccess: (res) => {
      toast.success(res.action === "updated" ? "课程档案已更新" : "新课程已成功发布");
      utils.courses.list.invalidate(); // 刷新列表数据
      onSuccess(); // 关闭弹窗或重置状态
    },
    onError: (err) => toast.error(err.message)
  });

  // ✅ 2. 简化的提交逻辑
  const onSubmit = (values: FormValues) => {
    upsertMutation.mutate({
      id: initialData?.id, // 如果是编辑，会带上 ID 触发后端更新逻辑
      ...values
    });
  };

  const isPending = upsertMutation.isPending;

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex justify-between items-center bg-zinc-50/50 p-5 rounded-[2rem] border border-zinc-100">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-2xl bg-zinc-900 flex items-center justify-center text-white shadow-lg">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-[16px] font-semibold text-zinc-900 tracking-tight">
              {isEdit ? "编辑课程档案" : "开设新课程"}
            </h2>
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Smart Syllabus Registry</p>
          </div>
        </div>
        {isEdit && (
          <Badge variant="outline" className="text-[10px] text-zinc-400 rounded-full border-zinc-200 px-3 py-1">
            CODE: {initialData.code}
          </Badge>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">课程全称 *</FormLabel>
                <FormControl><Input className="h-11 rounded-2xl border-none bg-zinc-100/50 px-5 text-[14px] font-medium transition-all focus:bg-white shadow-inner" placeholder="请输入课程名称" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="code" render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">识别代码 *</FormLabel>
                <FormControl><Input disabled={isEdit} className="h-11 rounded-2xl border-none bg-zinc-100/50 px-5 text-[14px] font-mono shadow-inner" placeholder="CS101" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField control={form.control} name="semester" render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">授课学期</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger className="rounded-2xl border-none bg-zinc-100/50 h-11 text-[13px] px-5 shadow-inner"><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent className="rounded-2xl border-white/60 bg-white/80 backdrop-blur-xl shadow-2xl">
                    {semesterOptions.map(opt => <SelectItem key={opt} value={opt} className="rounded-xl my-1">{opt}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormItem>
            )} />

            <FormField control={form.control} name="credits" render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">学分分值</FormLabel>
                <FormControl><Input type="number" step={0.5} className="h-11 rounded-2xl border-none bg-zinc-100/50 px-5 text-[14px] shadow-inner" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl>
              </FormItem>
            )} />
          </div>

          <FormField control={form.control} name="status" render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">发布状态</FormLabel>
              <div className="flex bg-zinc-100/50 p-1 rounded-[1.25rem] gap-1 shadow-inner">
                {['draft', 'active', 'archived'].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => field.onChange(s)}
                    className={`flex-1 py-2 rounded-xl text-[11px] transition-all font-medium ${
                      field.value === s ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'
                    }`}
                  >
                    {s === 'draft' ? '草案' : s === 'active' ? '激活' : '归档'}
                  </button>
                ))}
              </div>
            </FormItem>
          )} />

          <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem className="space-y-3">
              <div className="flex items-center justify-between ml-1">
                <FormLabel className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">教学大纲 / 课程介绍</FormLabel>
                <div className="flex items-center gap-1.5 text-zinc-300">
                   <Zap className="h-3 w-3" />
                   <span className="text-[9px] font-bold uppercase tracking-tighter italic">Rich Text Supported</span>
                </div>
              </div>
              <FormControl>
                {/* 这里的 RichTextEditor 内部由于有了 useEffect 同步逻辑，现在可以完美回显 */}
                <RichTextEditor value={field.value ?? ""} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <div className="pt-6">
            <Button 
              type="submit" 
              disabled={isPending} 
              className="w-full h-14 rounded-full bg-zinc-900 text-white text-[14px] font-semibold shadow-xl hover:bg-zinc-800 transition-all active:scale-[0.98] gap-2"
            >
              {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
              {isEdit ? "保存课程更新" : "确认并发布课程"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}