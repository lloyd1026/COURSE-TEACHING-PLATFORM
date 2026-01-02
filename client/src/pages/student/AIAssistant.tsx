import { useState, useRef, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Send, Bot, User, Loader2, Plus, 
  MessageSquare, History, Sparkles, ChevronRight,
  Eraser
} from "lucide-react";
import { Streamdown } from "streamdown";

export default function StudentAIAssistant() {
  const [input, setInput] = useState("");
  const [activeId, setActiveId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. 获取 TRPC 上下文工具，用于手动刷新缓存
  const utils = trpc.useUtils();

  // 2. 获取会话历史列表
  const { data: conversations, refetch: refetchHistory } = trpc.ai.listConversations.useQuery();
  
  // 3. 获取当前会话的消息详情
  const { data: historyMessages, isLoading: messagesLoading } = trpc.ai.getMessages.useQuery(
    { conversationId: activeId! },
    { 
      enabled: !!activeId,
      // 保持数据新鲜
      staleTime: 3000 
    }
  );

  // 4. 发送消息 Mutation
  const chatMutation = trpc.ai.chat.useMutation({
    onMutate: () => {
      // 发送瞬间清空输入框，提升交互感
      setInput("");
    },
    onSuccess: async (data) => {
      // 核心修正：消息发送成功后，立即刷新相关的 Query
      if (activeId) {
        // 刷新当前会话的消息
        await utils.ai.getMessages.invalidate({ conversationId: activeId });
      } else {
        // 如果是新会话，设置 ID 并刷新左侧列表
        setActiveId(data.conversationId);
        await utils.ai.listConversations.invalidate();
        // 同时也刷新新会话的消息详情
        await utils.ai.getMessages.invalidate({ conversationId: data.conversationId });
      }
    },
    onError: (error) => {
      toast.error(error.message || "发送失败");
    },
  });

  // 自动滚动到底部逻辑
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [historyMessages, chatMutation.isPending]);

  const handleSend = () => {
    if (!input.trim() || chatMutation.isPending) return;
    chatMutation.mutate({ 
      message: input.trim(), 
      conversationId: activeId || undefined 
    });
  };

  return (
    <DashboardLayout>
      {/* 极光背景装饰 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-emerald-50/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[5%] left-[-10%] w-[500px] h-[500px] bg-blue-50/20 rounded-full blur-[100px]" />
      </div>

      <div className="relative h-[calc(100vh-6rem)] flex gap-6 max-w-7xl mx-auto px-4 py-2">
        
        {/* 左侧：会话历史 */}
        <aside className="w-72 flex flex-col gap-4 bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2.5rem] p-6 shadow-sm hidden md:flex">
          <Button 
            onClick={() => setActiveId(null)}
            className="w-full h-12 rounded-2xl bg-zinc-900 text-white hover:bg-zinc-800 transition-all shadow-lg gap-2 text-[13px] font-bold"
          >
            <Plus className="h-4 w-4" /> 开启新对话
          </Button>

          <div className="flex items-center gap-2 px-2 mt-4 text-zinc-400">
            <History className="h-3.5 w-3.5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">最近记录</span>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
            {conversations?.map((conv: any) => (
              <button
                key={conv.id}
                onClick={() => setActiveId(conv.id)}
                className={`w-full group flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${
                  activeId === conv.id 
                    ? "bg-white border-white shadow-md" 
                    : "bg-transparent border-transparent hover:bg-white/50 text-zinc-500"
                }`}
              >
                <MessageSquare className={`h-4 w-4 flex-shrink-0 ${activeId === conv.id ? 'text-zinc-900' : 'text-zinc-300'}`} />
                <span className="text-[12px] font-medium truncate flex-1">{conv.title || "新对话"}</span>
                {activeId === conv.id && <ChevronRight className="h-3 w-3 text-zinc-400" />}
              </button>
            ))}
          </div>
        </aside>

        {/* 右侧：主对话区 */}
        <main className="flex-1 flex flex-col bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2.5rem] shadow-sm overflow-hidden relative">
          
          <header className="flex-shrink-0 px-8 py-5 border-b border-white/60 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-2xl bg-zinc-900 flex items-center justify-center text-white shadow-xl">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-zinc-900 tracking-tight">AI 智能助教</h2>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">DeepSeek Engine Powered</p>
                </div>
              </div>
            </div>
          </header>

          {/* 消息滚动区 */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8" ref={scrollRef}>
            {activeId || chatMutation.isPending ? (
              <>
                {/* 1. 渲染历史记录 */}
                {historyMessages?.map((msg: any, i: number) => (
                  <MessageBubble key={i} role={msg.role} content={msg.content} />
                ))}

                {/* 2. 乐观更新：如果正在请求，立即显示用户刚发的消息 */}
                {chatMutation.isPending && chatMutation.variables?.message && (
                  <>
                    <MessageBubble role="user" content={chatMutation.variables.message} />
                    {/* AI 思考中占位 */}
                    <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="h-9 w-9 rounded-xl bg-zinc-900 flex items-center justify-center text-white shadow-lg flex-shrink-0">
                        <Bot className="h-4.5 w-4.5" />
                      </div>
                      <div className="p-5 bg-white/60 backdrop-blur-md rounded-[1.75rem] border border-white shadow-sm flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                        <span className="text-[12px] text-zinc-400 font-medium">正在思考...</span>
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                <div className="h-20 w-20 bg-white/80 rounded-[2.5rem] flex items-center justify-center shadow-inner">
                  <Sparkles className="h-10 w-10 text-zinc-200" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-zinc-800 tracking-tight">今天想学习什么？</h3>
                  <p className="text-zinc-400 text-sm mt-2 max-w-[280px]">我可以帮你总结知识点、分析作业题目，或者规划学习进度。</p>
                </div>
                <div className="grid grid-cols-2 gap-3 max-w-md">
                  {["总结本周重点", "解释量子力学", "纠正代码错误", "雅思写作练习"].map(q => (
                    <button 
                      key={q} 
                      onClick={() => { setInput(q); }}
                      className="px-4 py-2.5 rounded-xl bg-white/60 border border-white text-[11px] font-bold text-zinc-500 hover:bg-white hover:shadow-sm transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 输入框区域 */}
          <div className="p-8 pt-0">
            <div className="relative group bg-white/80 backdrop-blur-2xl border border-white rounded-[1.75rem] shadow-xl p-2 flex items-center gap-2">
              <Input
                placeholder="在此输入您的问题... (Enter 发送)"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="flex-1 h-12 bg-transparent border-none shadow-none focus-visible:ring-0 text-[14px]"
              />
              <Button 
                onClick={handleSend} 
                disabled={!input.trim() || chatMutation.isPending}
                className="h-12 w-12 rounded-2xl bg-zinc-900 text-white hover:scale-105 active:scale-95 transition-all shadow-lg"
              >
                {chatMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </main>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 10px; }
      `}</style>
    </DashboardLayout>
  );
}

function MessageBubble({ role, content }: { role: "user" | "assistant", content: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex gap-4 ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg ${
        isUser ? "bg-white text-zinc-900" : "bg-zinc-900 text-white"
      }`}>
        {isUser ? <User className="h-4.5 w-4.5" /> : <Bot className="h-4.5 w-4.5" />}
      </div>
      <div className={`max-w-[85%] p-5 rounded-[1.75rem] text-[14px] leading-relaxed shadow-sm border border-white ${
        isUser ? "bg-white/80 text-zinc-800" : "bg-white/95 text-zinc-900 shadow-sm"
      }`}>
        <Streamdown>{content}</Streamdown>
      </div>
    </div>
  );
}