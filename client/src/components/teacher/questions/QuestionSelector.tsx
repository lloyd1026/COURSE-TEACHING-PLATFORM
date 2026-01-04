import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2, Check, Plus, AlertCircle, Layers, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input"; // 确保引入 Input

// 引入通用组件
import { SearchFilterBar } from "@/components/common/SearchFilterBar";
import { FilterTabs } from "@/components/common/FilterGroup";
import { Pagination } from "@/components/common/Pagination";

interface QuestionSelectorProps {
  courseId: number;
  selectedQuestions: any[];
  onSelect: (updater: (prev: any[]) => any[]) => void;
  onClose?: () => void;
  showCloseButton?: boolean;
}

export function QuestionSelector({ 
  courseId, 
  selectedQuestions, 
  onSelect, 
  showCloseButton = false 
}: QuestionSelectorProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { data: questions, isLoading } = trpc.questions.list.useQuery(
    { courseId },
    { enabled: !!courseId }
  );

  // 建立一个 ID 到已选题目对象的映射，方便获取分值
  const selectedMap = useMemo(() => {
    const map = new Map();
    selectedQuestions.forEach(q => map.set(q.questionId || q.id, q));
    return map;
  }, [selectedQuestions]);

  const TYPE_LABELS: any = {
    single_choice: "单选", multiple_choice: "多选",
    true_false: "判断", fill_blank: "填空",
    essay: "简答", programming: "编程"
  };

  const TYPE_OPTIONS = [
    { label: "全部", value: "all" },
    ...Object.entries(TYPE_LABELS).map(([k, v]) => ({ label: v as string, value: k }))
  ];

  const filteredData = useMemo(() => {
    return (questions || []).filter(q => {
      const matchSearch = !search || q.title.toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === "all" || q.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [questions, search, typeFilter]);

  const paginatedQuestions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage]);

  const handleSearch = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const handleTypeChange = (val: any) => {
    setTypeFilter(val);
    setCurrentPage(1);
  };

  // 切换题目选中状态
  const handleToggle = (q: any) => {
    onSelect((prev) => {
      const id = q.id;
      if (selectedMap.has(id)) {
        return prev.filter((item) => (item.questionId || item.id) !== id);
      } else {
        return [...prev, { 
          questionId: id, 
          id: id,
          title: q.title, 
          type: q.type, 
          score: 5 // 默认 5 分
        }];
      }
    });
  };

  // ✅ 新增：修改特定题目的分值
  const handleScoreChange = (id: number, newScore: number) => {
    onSelect((prev) => 
      prev.map((item) => 
        (item.questionId || item.id) === id ? { ...item, score: newScore } : item
      )
    );
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* 顶部：搜索与筛选 */}
      <header className="p-6 space-y-4 border-b border-zinc-50 bg-zinc-50/30">
        <div className="flex items-center gap-2 mb-1">
          <Layers className="h-4 w-4 text-zinc-400" />
          <h3 className="text-[11px] font-black uppercase text-zinc-500 tracking-widest">题库检索中心</h3>
        </div>
        <SearchFilterBar onSearch={handleSearch} placeholder="搜索题目内容..." />
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-zinc-400 uppercase">题型</span>
          <FilterTabs options={TYPE_OPTIONS} value={typeFilter} onChange={handleTypeChange} />
        </div>
      </header>

      {/* 中间：列表区 */}
      <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar bg-white">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-300 gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Loading...</span>
          </div>
        ) : paginatedQuestions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-300 gap-3 italic">
            <AlertCircle className="h-8 w-8 opacity-20" />
            <span className="text-[10px] font-bold">没有找到题目</span>
          </div>
        ) : (
          <div className="space-y-3">
            {paginatedQuestions.map((q) => {
              const selectedItem = selectedMap.get(q.id);
              const isSelected = !!selectedItem;
              
              return (
                <div 
                  key={q.id}
                  onClick={() => handleToggle(q)}
                  className={`group p-5 rounded-[2rem] border-2 transition-all duration-300 cursor-pointer ${
                    isSelected 
                      ? "bg-zinc-900 border-zinc-900 shadow-xl scale-[0.99]" 
                      : "bg-white border-zinc-100 hover:border-zinc-300 shadow-sm"
                  }`}
                >
                  <div className="flex justify-between items-center gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[8px] font-bold rounded-md px-1.5 py-0 border-none ${
                          isSelected ? "bg-white/10 text-white/70" : "bg-zinc-100 text-zinc-400"
                        }`}>
                          {TYPE_LABELS[q.type] || q.type}
                        </Badge>
                        <span className={`text-[9px] font-mono ${isSelected ? "text-white/30" : "text-zinc-300"}`}># {q.id}</span>
                      </div>
                      <p className={`text-[13px] font-bold leading-snug ${isSelected ? "text-white" : "text-zinc-600"}`}>
                        {q.title}
                      </p>
                    </div>

                    {/* ✅ 分值自定义区 */}
                    <div className="flex items-center gap-3">
                      {isSelected && (
                        <div 
                          className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/20 animate-in fade-in zoom-in duration-300"
                          onClick={(e) => e.stopPropagation()} // 防止触发卡片点击
                        >
                          <Trophy className="h-3 w-3 text-emerald-400" />
                          <input 
                            type="number" 
                            value={selectedItem.score} 
                            onChange={(e) => handleScoreChange(q.id, Number(e.target.value))}
                            className="w-8 bg-transparent border-none text-white text-xs font-black p-0 focus:outline-none focus:ring-0 text-center"
                          />
                          <span className="text-[8px] font-black text-white/40 uppercase">Pts</span>
                        </div>
                      )}
                      
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all ${
                        isSelected ? "bg-white border-white text-zinc-900 rotate-[360deg]" : "bg-zinc-50 border-zinc-100 text-zinc-200"
                      }`}>
                        {isSelected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 底部：分页与汇总 */}
      <footer className="bg-zinc-50/50 border-t border-zinc-100">
        <Pagination currentPage={currentPage} totalItems={filteredData.length} pageSize={pageSize} onPageChange={setCurrentPage} />
        <div className="px-6 py-4 flex justify-between items-center bg-white border-t border-zinc-50">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-zinc-300 uppercase tracking-widest">Selection Overview</span>
            <p className="text-xs font-bold text-zinc-900">
              已选择 <span className="text-emerald-500">{selectedMap.size}</span> 道题目
            </p>
          </div>
          <span className="text-[10px] text-zinc-300 font-mono italic">Page {currentPage} / {Math.ceil(filteredData.length / pageSize) || 1}</span>
        </div>
      </footer>
    </div>
  );
}