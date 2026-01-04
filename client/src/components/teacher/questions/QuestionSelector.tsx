import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2, Check, Plus, AlertCircle, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// 引入你的通用组件
import { SearchFilterBar } from "@/components/common/SearchFilterBar";
import { FilterTabs } from "@/components/common/FilterGroup";
import { Pagination } from "@/components/common/Pagination"; // 假设路径在此

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
  // 1. 状态管理：搜索、筛选、分页
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // 2. 获取数据
  const { data: questions, isLoading } = trpc.questions.list.useQuery(
    { courseId },
    { enabled: !!courseId }
  );

  const selectedIds = useMemo(() => 
    new Set(selectedQuestions.map(q => q.questionId || q.id)), 
  [selectedQuestions]);

  // 3. 过滤逻辑（先过滤，再计算分页）
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
    const list = (questions || []).filter(q => {
      const matchSearch = !search || q.title.toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === "all" || q.type === typeFilter;
      return matchSearch && matchType;
    });
    return list;
  }, [questions, search, typeFilter]);

  // 4. 计算当前页显示的题目
  const paginatedQuestions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage]);

  // 搜索或筛选变化时，重置页码到第一页
  const handleSearch = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const handleTypeChange = (val: any) => {
    setTypeFilter(val);
    setCurrentPage(1);
  };

  const handleToggle = (q: any) => {
    onSelect((prev) => {
      const id = q.id;
      if (selectedIds.has(id)) {
        return prev.filter((item) => (item.questionId || item.id) !== id);
      } else {
        return [...prev, { 
          questionId: id, 
          id: id,
          title: q.title, 
          type: q.type, 
          score: 5 
        }];
      }
    });
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* 顶部：搜索与筛选 */}
      <header className="p-6 space-y-4 border-b border-zinc-50 bg-zinc-50/30">
        <div className="flex items-center gap-2 mb-1">
          <Layers className="h-4 w-4 text-zinc-400" />
          <h3 className="text-[11px] font-black uppercase text-zinc-500 tracking-widest">题库检索中心</h3>
        </div>

        <SearchFilterBar 
          onSearch={handleSearch} 
          placeholder="搜索题目内容..." 
        />

        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-zinc-400 uppercase">题型</span>
          <FilterTabs 
            options={TYPE_OPTIONS}
            value={typeFilter}
            onChange={handleTypeChange}
          />
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
              const isSelected = selectedIds.has(q.id);
              return (
                <div 
                  key={q.id}
                  onClick={() => handleToggle(q)}
                  className={`group p-4 rounded-[1.5rem] border-2 transition-all duration-300 cursor-pointer ${
                    isSelected 
                      ? "bg-zinc-900 border-zinc-900 shadow-lg scale-[0.99]" 
                      : "bg-white border-zinc-100 hover:border-zinc-300"
                  }`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-2">
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
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center border-2 transition-all ${
                      isSelected ? "bg-white border-white text-zinc-900" : "bg-zinc-50 border-zinc-100 text-zinc-200"
                    }`}>
                      {isSelected ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
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
        <Pagination 
          currentPage={currentPage}
          totalItems={filteredData.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
        <div className="px-6 py-3 flex justify-between items-center bg-white border-t border-zinc-50">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">
            已选择 <span className="text-zinc-900">{selectedIds.size}</span> 道题目
          </p>
          <span className="text-[9px] text-zinc-300 italic font-medium">Page {currentPage} of {Math.ceil(filteredData.length / pageSize) || 1}</span>
        </div>
      </footer>
    </div>
  );
}