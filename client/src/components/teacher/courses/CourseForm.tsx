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
import { 
  Loader2, BookOpen, Check, Zap, Bold, Italic, 
  List, ListOrdered, Heading1, Heading2, Quote, 
  Code, Strikethrough, CheckSquare 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

// --- TipTap 核心与扩展 ---
import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import BubbleMenuExtension from '@tiptap/extension-bubble-menu'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'

// --- 内部编辑器组件：Liquid Tiptap ---
const TiptapEditor = ({ value, onChange }: { value: string; onChange: (val: string) => void }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      BubbleMenuExtension, // 核心：注册浮动菜单逻辑
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({
        placeholder: '输入课程大纲... 支持 Markdown 语法 (如 # 标题，- 列表)',
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-zinc prose-sm max-w-none focus:outline-none min-h-[350px] p-8 text-zinc-600 custom-editor-content',
      },
    },
  })

  if (!editor) return null

  return (
    <div className="rounded-[2rem] border border-zinc-200 overflow-hidden bg-white/40 backdrop-blur-md transition-all focus-within:ring-4 focus-within:ring-zinc-900/5 focus-within:border-zinc-300 shadow-sm">
      {/* 顶部工具栏 (Static) */}
      <div className="flex flex-wrap items-center gap-1 p-3 bg-zinc-50/50 border-b border-zinc-100">
        <EditorBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} icon={Bold} />
        <EditorBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} icon={Italic} />
        <div className="w-px h-4 bg-zinc-200 mx-1" />
        <EditorBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} icon={Heading1} />
        <EditorBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} icon={Heading2} />
        <div className="w-px h-4 bg-zinc-200 mx-1" />
        <EditorBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} icon={List} />
        <EditorBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} icon={ListOrdered} />
        <EditorBtn onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} icon={CheckSquare} />
        <div className="w-px h-4 bg-zinc-200 mx-1" />
        <EditorBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} icon={Quote} />
      </div>

      {/* 气泡菜单 (Floating Bubble) */}
      {/* 修复：移除 tippyOptions 避免类型冲突，或者将其放入 Extension 配置中 */}
      <BubbleMenu editor={editor}>
        <div className="flex items-center gap-0.5 bg-zinc-900 text-white p-1.5 rounded-full shadow-2xl border border-white/10 animate-in fade-in zoom-in-90 scale-90 origin-bottom">
          <EditorBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} icon={Bold} isDark />
          <EditorBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} icon={Italic} isDark />
          <EditorBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} icon={Strikethrough} isDark />
          <div className="w-px h-3 bg-white/20 mx-1" />
          <EditorBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} icon={Code} isDark />
        </div>
      </BubbleMenu>

      <EditorContent editor={editor} />
      
      <style>{`
        .custom-editor-content ul { list-style-type: disc; padding-left: 1.5rem; }
        .custom-editor-content ol { list-style-type: decimal; padding-left: 1.5rem; }
        .custom-editor-content blockquote { border-left: 3px solid #e4e4e7; padding-left: 1rem; font-style: italic; color: #71717a; }
        .custom-editor-content ul[data-type="taskList"] { list-style: none; padding-left: 0; }
        .custom-editor-content ul[data-type="taskList"] li { display: flex; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.5rem; }
        .custom-editor-content ul[data-type="taskList"] input[type="checkbox"] { margin-top: 0.3rem; }
      `}</style>
    </div>
  )
}

const EditorBtn = ({ onClick, active, icon: Icon, isDark = false }: any) => (
  <button
    type="button"
    onClick={onClick}
    className={`p-2 rounded-lg transition-all ${
      active 
        ? (isDark ? 'bg-white text-zinc-900 shadow-sm' : 'bg-zinc-900 text-white shadow-md') 
        : (isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-400 hover:text-zinc-900 hover:bg-white')
    }`}
  >
    <Icon className="h-3.5 w-3.5" />
  </button>
)

// --- 主组件逻辑 ---
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
      description: initialData?.description ?? "",
      semester: initialData?.semester ?? semesterOptions[2],
      credits: initialData?.credits ?? 3,
      status: (initialData?.status as any) ?? "draft",
    }), [initialData, semesterOptions]),
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
      {/* 头部装饰 */}
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
        {isEdit && <Badge variant="outline" className="text-[10px] text-zinc-400 rounded-full border-zinc-200 px-3 py-1">ID: {initialData.code}</Badge>}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">课程全称 *</FormLabel>
                <FormControl><Input className="h-11 rounded-2xl border-none bg-zinc-100/50 px-5 text-[14px] font-medium transition-all focus:bg-white" placeholder="请输入课程名称" {...field} /></FormControl>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )} />

            <FormField control={form.control} name="code" render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">识别代码 *</FormLabel>
                <FormControl><Input disabled={isEdit} className="h-11 rounded-2xl border-none bg-zinc-100/50 px-5 text-[14px] font-mono" placeholder="CS101" {...field} /></FormControl>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField control={form.control} name="semester" render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">授课学期</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger className="rounded-2xl border-none bg-zinc-100/50 h-11 text-[13px] px-5"><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent className="rounded-2xl border-white/60 bg-white/80 backdrop-blur-xl shadow-2xl">
                    {semesterOptions.map(opt => <SelectItem key={opt} value={opt} className="rounded-xl my-1">{opt}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormItem>
            )} />

            <FormField control={form.control} name="credits" render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">学分分值</FormLabel>
                <FormControl><Input type="number" step={0.5} className="h-11 rounded-2xl border-none bg-zinc-100/50 px-5 text-[14px]" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl>
              </FormItem>
            )} />
          </div>

          <FormField control={form.control} name="status" render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">发布状态</FormLabel>
              <div className="flex bg-zinc-100/50 p-1 rounded-[1.25rem] gap-1">
                {[
                  { id: 'draft', label: '草案' },
                  { id: 'active', label: '激活' },
                  { id: 'archived', label: '归档' }
                ].map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => field.onChange(s.id)}
                    className={`flex-1 py-2 rounded-xl text-[11px] transition-all font-medium ${
                      field.value === s.id ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'
                    }`}
                  >
                    {s.label}
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
                   <span className="text-[9px] font-bold uppercase tracking-tighter italic">Markdown Supported</span>
                </div>
              </div>
              <FormControl>
                {/* 使用 TiptapEditor 组件 */}
                <TiptapEditor value={field.value ?? ""} onChange={field.onChange} />
              </FormControl>
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