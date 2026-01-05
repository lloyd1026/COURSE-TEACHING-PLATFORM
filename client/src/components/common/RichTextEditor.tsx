import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { 
  Bold, Italic, List, ListOrdered, Heading1, 
  Heading2, Quote, Code, Strikethrough, CheckSquare 
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({
        placeholder: placeholder || '请输入内容...',
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-zinc prose-sm max-w-none focus:outline-none min-h-[300px] p-6 text-zinc-600',
      },
    },
  });

  // ✅ 终极数据同步逻辑：解决编辑回填失败的问题
  useEffect(() => {
    if (editor && value) {
      // 只有当编辑器当前内容为空，或者与外部传入的 initialData 显著不同时才更新
      // 使用 editor.isEmpty 判断可以避免用户输入时被强制重置
      if (editor.isEmpty && value !== '<p></p>') {
        editor.commands.setContent(value);
      }
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="rounded-[1.5rem] border border-zinc-200 overflow-hidden bg-white shadow-sm transition-all focus-within:border-zinc-300">
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-zinc-50/50 border-b border-zinc-100">
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

      {/* 浮动菜单 */}
      <BubbleMenu editor={editor}>
        <div className="flex items-center gap-1 bg-zinc-900 text-white p-1 rounded-full shadow-xl">
          <EditorBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} icon={Bold} isDark />
          <EditorBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} icon={Code} isDark />
        </div>
      </BubbleMenu>

      <EditorContent editor={editor} />
    </div>
  );
}

const EditorBtn = ({ onClick, active, icon: Icon, isDark }: any) => (
  <button
    type="button"
    onClick={onClick}
    className={`p-1.5 rounded-md transition-all ${
      active 
        ? (isDark ? 'bg-white text-zinc-900' : 'bg-zinc-900 text-white') 
        : (isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-400 hover:bg-white')
    }`}
  >
    <Icon className="h-4 w-4" />
  </button>
);