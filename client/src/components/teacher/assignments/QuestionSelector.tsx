import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  X, Search, Plus, Check, Loader2, 
  HelpCircle, ChevronRight, GraduationCap,
  Trophy, Target, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface QuestionSelectorProps {
  courseId: number; // 严格锁定课程
  selectedQuestions: any[]; // 传入已选题目对象数组 (含 score)
  onSelect: (updater: (prev: any[]) => any[]) => void;
  onClose: () => void;
}

export function QuestionSelector({ courseId, selectedQuestions, onSelect, onClose }: QuestionSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // 1. 获取该课程下的所有题库题目 (严格限定 courseId)
  const { data: questions, isLoading } = trpc.questions.list.useQuery({
    courseId,
  }, { enabled: !!courseId });

  // 辅助：检查是否选中，并获取该题在当前作业中的配置
  const getSelectedItem = (id: number) => selectedQuestions.find(q => (q.id || q.questionId) === id);

  // 2. 核心 Toggle 逻辑：处理选中/取消
  const handleToggleQuestion = (q: any) => {
    const existing = getSelectedItem(q.id);
    onSelect((prev) => {
      if (existing) {
        return prev.filter((item) => (item.id || item.questionId) !== q.id);
      } else {
        // 选中时，赋予默认分值 5 分
        return [...prev, { 
          id: q.id, 
          questionId: q.id, 
          title: q.title, 
          type: q.type, 
          score: 5 
        }];
      }
    });
  };

  // 3. 自由分配分数：直接在选择器内改分
  const handleScoreChange = (e: React.ChangeEvent<HTMLInputElement>, id: number) => {
    const newScore = parseInt(e.target.value) || 0;
    onSelect(prev => prev.map(q => 
      (q.id || q.questionId) === id ? { ...q, score: newScore } : q
    ));
  };

  const filteredQuestions = useMemo(() => {
    return (questions || []).filter(q => {
      const matchSearch = q.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (q.content && q.content.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchType = typeFilter === "all" || q.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [questions, searchTerm, typeFilter]);

  const TYPE_LABELS: any = {
    single_choice: "单选", multiple_choice: "多选",
    fill_blank: "填空", true_false: "判断",
    essay: "简答", programming: "编程",
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-end p-4 bg-zinc-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-2xl h-full bg-white rounded-[3rem] shadow-2xl flex flex-col animate-in slide-in-from-right-12 duration-500 overflow-hidden border border-white">
        
        {/* Header Section */}
        <header className="px-10 pt-10 pb-8 bg-zinc-50/50 flex-shrink-0">
          <div className="flex justify-between items-start mb-8">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-emerald-500 text-white border-none rounded-md px-2 py-0.5 text-[8px] font-black uppercase">Strict Course Mode</Badge>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">题库范围：ID #{courseId}</span>
              </div>
              <h3 className="text-2xl font-black text-zinc-900 tracking-tight">配置作业试题</h3>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-12 w-12 bg-white shadow-sm border border-zinc-100">
              <X className="h-6 w-6 text-zinc-400" />
            </Button>
          </div>

          <div className="flex gap-3">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-300 group-focus-within:text-zinc-900 transition-colors" />
              <Input 
                placeholder="在当前课程题库中检索..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="h-14 pl-12 rounded-2xl border-none bg-zinc-100 font-bold text-sm focus-visible:ring-2 focus-visible:ring-emerald-500/20"
              />
            </div>
            <div className="flex bg-zinc-100 p-1.5 rounded-2xl gap-1">
              {['all', 'single_choice', 'essay'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                    typeFilter === t ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400 hover:text-zinc-600"
                  }`}
                >
                  {t === 'all' ? '全部' : TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* List Section */}
        <div className="flex-1 overflow-y-auto px-10 py-6 custom-scrollbar">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-300 gap-4">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest">正在载入课程专属题库...</p>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-300 gap-4">
               <AlertCircle className="h-12 w-12 opacity-10" />
               <p className="text-[10px] font-black uppercase tracking-widest">当前课程暂无题目，请先前往题库录入</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredQuestions.map((q) => {
                const selectedItem = getSelectedItem(q.id);
                const isSelected = !!selectedItem;

                return (
                  <div 
                    key={q.id}
                    onClick={() => handleToggleQuestion(q)}
                    className={`group p-6 rounded-[2.5rem] border-2 transition-all duration-300 relative ${
                      isSelected 
                        ? "bg-white border-zinc-900 shadow-xl scale-[0.98]" 
                        : "bg-white border-transparent hover:border-zinc-200 shadow-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[9px] font-black uppercase rounded-lg px-2 ${isSelected ? "bg-zinc-900 text-white border-zinc-900" : "text-zinc-400"}`}>
                          {TYPE_LABELS[q.type]}
                        </Badge>
                        <span className="text-[10px] font-mono text-zinc-300"># {q.id}</span>
                      </div>
                      
                      {/* 自由改分输入框：仅在选中时显示 */}
                      {isSelected && (
                        <div className="flex items-center gap-2 animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
                          <span className="text-[9px] font-black text-zinc-400 uppercase">Score:</span>
                          <input 
                            type="number"
                            value={selectedItem.score}
                            onChange={(e) => handleScoreChange(e, q.id)}
                            className="w-12 h-8 rounded-lg border-2 border-zinc-100 text-center text-xs font-black focus:border-zinc-900 outline-none transition-all"
                          />
                        </div>
                      )}
                    </div>
                    
                    <h4 className={`text-[15px] font-bold leading-relaxed mb-4 ${isSelected ? "text-zinc-900" : "text-zinc-600"}`}>
                      {q.title || (q.content && q.content.substring(0, 60))}
                    </h4>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] font-bold text-zinc-300 uppercase flex items-center gap-1.5">
                          <Target className="h-3 w-3" /> 考查：{q.difficulty}
                        </span>
                      </div>
                      <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                        isSelected ? "bg-zinc-900 border-zinc-900 rotate-[360deg]" : "bg-zinc-50 border-zinc-100"
                      }`}>
                        {isSelected ? <Check className="h-3.5 w-3.5 text-white" /> : <Plus className="h-3.5 w-3.5 text-zinc-300" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with Summary */}
        <footer className="p-10 bg-white border-t border-zinc-100 flex-shrink-0">
           <Button 
            onClick={onClose} 
            className="w-full h-16 rounded-[1.75rem] bg-zinc-900 text-white font-bold text-sm shadow-2xl hover:bg-black active:scale-95 transition-all flex justify-between px-10"
           >
             <div className="flex items-center gap-3">
               <Trophy className="h-5 w-5 text-emerald-400" />
               <span>确认分值并同步至作业</span>
             </div>
             <div className="flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full text-[10px] font-black">
               <span>{selectedQuestions.length} 题</span>
               <div className="w-px h-3 bg-white/20 mx-1" />
               <span className="text-emerald-400">
                {selectedQuestions.reduce((sum, q) => sum + (q.score || 0), 0)} 总分
               </span>
             </div>
           </Button>
        </footer>
      </div>
    </div>
  );
}