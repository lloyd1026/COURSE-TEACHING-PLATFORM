import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, GraduationCap, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { generateGrades, COMPUTER_MAJORS } from "@/lib/configs";

const formSchema = z.object({
  name: z.string().min(1, "请输入班级名称"),
  grade: z.number().min(2000),
  major: z.string().min(1, "请选择专业"),
});

type FormValues = z.infer<typeof formSchema>;

interface ClassFormProps {
  initialData?: any;
  onSuccess: () => void;
}

export default function ClassForm({ initialData, onSuccess }: ClassFormProps) {
  const isEdit = !!initialData?.id;
  const utils = trpc.useUtils();
  const gradeOptions = generateGrades();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: useMemo(() => ({
      name: initialData?.name ?? "",
      grade: initialData?.grade ?? gradeOptions[0]?.value,
      major: initialData?.major ?? COMPUTER_MAJORS[0],
    }), [initialData]),
  });

  const createMutation = trpc.classes.create.useMutation({
    onSuccess: () => { toast.success("班级已创建"); utils.classes.list.invalidate(); onSuccess(); },
    onError: (err) => toast.error(err.message)
  });

  const updateMutation = trpc.classes.update?.useMutation({ 
    onSuccess: () => { toast.success("班级已更新"); utils.classes.list.invalidate(); onSuccess(); },
    onError: (err) => toast.error(err.message)
  }) || { mutate: () => toast.error("后端未补全 Update 接口"), isPending: false };

  const onSubmit = (values: FormValues) => {
    if (isEdit) updateMutation.mutate({ id: initialData.id, ...values });
    else createMutation.mutate(values);
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex justify-between items-center bg-zinc-50/50 p-4 rounded-[1.5rem] border border-zinc-100">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-zinc-900 flex items-center justify-center text-white shadow-sm">
            <GraduationCap className="h-4.5 w-4.5" />
          </div>
          <h2 className="text-[15px] font-medium tracking-tight">{isEdit ? "编辑班级档案" : "开设新班级"}</h2>
        </div>
        {isEdit && <Badge variant="outline" className="text-[10px] text-zinc-400 rounded-full border-zinc-200">ID: {initialData.id}</Badge>}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel className="text-[11px] text-zinc-400 ml-1">班级全称 *</FormLabel>
              <FormControl><Input className="h-10 rounded-xl border-none bg-zinc-100/50 px-4 text-[13px] font-medium" placeholder="例如：24级 软件工程 1班" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="grade" render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="text-[11px] text-zinc-400 ml-1">所属年级</FormLabel>
                <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString()}>
                  <FormControl><SelectTrigger className="rounded-xl border-none bg-zinc-100/50 h-10 text-[13px]"><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent className="rounded-xl border-none shadow-xl">
                    {gradeOptions.map(opt => <SelectItem key={opt.value} value={opt.value.toString()}>{opt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormItem>
            )} />

            <FormField control={form.control} name="major" render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="text-[11px] text-zinc-400 ml-1">所属专业</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger className="rounded-xl border-none bg-zinc-100/50 h-10 text-[13px]"><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent className="rounded-xl border-none shadow-xl">
                    {COMPUTER_MAJORS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormItem>
            )} />
          </div>

          <div className="pt-2">
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="w-full h-11 rounded-full bg-zinc-900 text-white text-[13px] font-medium shadow-lg hover:bg-zinc-800 transition-all active:scale-[0.97] gap-2">
              {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {isEdit ? "更新班级" : "立即保存"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}