import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { trpc } from "@/lib/trpc";
import { 
  Plus, FileText, ChevronRight, Loader2, 
  Trash2, Sparkles, BookOpen, CheckCircle2, Circle
} from "lucide-react";
import { QUESTION_TYPE_CONFIG } from "@/lib/configs";
import QuestionForm from "@/components/teacher/questions/QuestionForm";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";

// 引入通用组件库
import { ConfirmDeleteDialog } from "@/components/common/ConfirmDeleteDialog";
import { Pagination } from "@/components/common/Pagination";
import { FilterSearch, FilterSlider } from "@/components/common/FilterGroup";

export default function QuestionBank() {
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState<number | "all">("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  // 批量选择状态
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

  const utils = trpc.useUtils();
  
  // 获取题目列表（后端会自动根据角色判断）
  const { data: questions, isLoading } = trpc.questions.list.useQuery({
    courseId: courseFilter === "all" ? undefined : courseFilter,
    search: search || undefined
  });

  // 获取课程列表用于筛选
  const { data: courses } = trpc.courses.list.useQuery();

  // 批量删除 Mutation
  const deleteBulkMutation = trpc.questions.deleteBulk.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      utils.questions.list.invalidate();
      setSelectedIds([]);
      setIsDeleteAlertOpen(false);
      setIsDetailOpen(false);
    },
    onError: (err) => toast.error(err.message)
  });

  // 1. 客户端二级筛选（题型）
  const filteredQuestions = useMemo(() => {
    return (questions || []).filter((q: any) => {
      // course 和 search 已经在后端过滤，这里只做 type 的客户端过滤
      const matchType = typeFilter === "all" || q.type === typeFilter;
      return matchType;
    });
  }, [questions, typeFilter]);

  // 2. 分页切片
  const pagedQuestions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredQuestions.slice(start, start + pageSize);
  }, [filteredQuestions, currentPage]);

  // 批量选择逻辑
  const toggleSelect = (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止触发详情详情弹窗
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === pagedQuestions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pagedQuestions.map((q: any) => q.id));
    }
  };

  useEffect(() => { setCurrentPage(1); }, [search, typeFilter, courseFilter]);

  if (isLoading) return (
    <div className="h-screen flex items-center justify-center bg-white/50">
      <Loader2 className="h-5 w-5 animate-spin text-zinc-300" />
    </div>
  );

  return (
    <DashboardLayout>
      <div className="relative h-[calc(100vh-4rem)] flex flex-col max-w-5xl mx-auto px-6 py-8 overflow-hidden">
        
        {/* 页头 */}
        <header className="flex-shrink-0 flex justify-between items-end mb-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">资源题库</h1>
            <p className="text-zinc-400 text-[11px] mt-1 tracking-widest uppercase">标准化教学资源中心</p>
          </div>
          <div className="flex gap-3">
            {selectedIds.length > 0 && (
              <Button 
                variant="destructive"
                onClick={() => setIsDeleteAlertOpen(true)}
                className="rounded-full h-9 px-6 text-[12px] font-medium animate-in fade-in zoom-in-95"
              >
                批量删除 ({selectedIds.length})
              </Button>
            )}
            <Button 
              onClick={() => { setSelectedQuestion(null); setIsEditOpen(true); }} 
              className="rounded-full bg-zinc-900 text-white h-9 px-6 text-[12px] font-medium shadow-sm hover:scale-105 transition-all"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" /> 录入试题
            </Button>
          </div>
        </header>

        {/* 筛选工具栏 */}
        <div className="flex-shrink-0 space-y-5 mb-8">
          <FilterSearch value={search} onChange={setSearch} placeholder="搜索题目内容..." />
          
          <div className="space-y-4">
            {/* 一级：课程筛选 */}
            <FilterSlider
              label="关联课程"
              value={courseFilter}
              onChange={setCourseFilter}
              options={[
                { label: "全部课程", value: "all" },
                ...(courses || []).map(c => ({ label: c.name, value: c.id }))
              ]}
            />
            
            {/* 二级：题型筛选 */}
            <FilterSlider
              label="题型类别"
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { label: "全部题型", value: "all" },
                ...Object.entries(QUESTION_TYPE_CONFIG).map(([key, cfg]) => ({ label: cfg.label, value: key }))
              ]}
            />
          </div>
        </div>

        {/* 题目列表 */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
          {/* 全选工具条 */}
          {pagedQuestions.length > 0 && (
            <div className="flex items-center gap-3 px-5 mb-2">
              <div 
                onClick={toggleSelectAll}
                className="flex items-center gap-2 cursor-pointer text-zinc-400 hover:text-zinc-900 transition-colors"
              >
                {selectedIds.length === pagedQuestions.length ? (
                  <CheckCircle2 className="h-4 w-4 text-zinc-900" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
                <span className="text-[10px] font-bold uppercase tracking-widest">全选本页</span>
              </div>
            </div>
          )}

          {pagedQuestions.map((q: any) => {
            const isSelected = selectedIds.includes(q.id);
            return (
              <div 
                key={q.id} 
                onClick={() => { setSelectedQuestion(q); setIsDetailOpen(true); }}
                className={`group flex items-center justify-between p-5 bg-white/40 backdrop-blur-md border rounded-[2rem] transition-all duration-300 shadow-sm cursor-pointer ${
                  isSelected ? "border-zinc-900 bg-white/80 ring-1 ring-zinc-900" : "border-white/60 hover:bg-white/80 hover:border-zinc-200"
                }`}
              >
                <div className="flex items-center gap-5 flex-1 min-w-0">
                  <div 
                    onClick={(e) => toggleSelect(q.id, e)}
                    className={`h-10 w-10 rounded-2xl flex items-center justify-center transition-all shadow-sm ${
                      isSelected ? "bg-zinc-900 text-white" : "bg-white text-zinc-300 group-hover:text-zinc-900"
                    }`}
                  >
                    {isSelected ? <CheckCircle2 className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[14px] text-zinc-800 truncate font-medium">{q.content}</h4>
                    <div className="flex items-center gap-2.5 mt-1.5 opacity-60">
                      <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                        <BookOpen className="h-3 w-3" /> {q.courseName || "通用资源"}
                      </span>
                      <span className="text-[10px] text-zinc-200">|</span>
                      <Badge variant="secondary" className="bg-zinc-100/50 text-zinc-500 border-none text-[9px] px-2 py-0">
                        {QUESTION_TYPE_CONFIG[q.type as keyof typeof QUESTION_TYPE_CONFIG]?.label}
                      </Badge>
                    </div>
                  </div>
                </div>
                <ChevronRight className={`h-4 w-4 transition-all ${isSelected ? "text-zinc-900" : "text-zinc-200"}`} />
              </div>
            );
          })}
        </div>

        <div className="flex-none mt-4">
          <Pagination 
            currentPage={currentPage}
            totalItems={filteredQuestions.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* 预览抽屉 */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="w-full sm:max-w-md rounded-l-[2.5rem] border-white/40 bg-white/80 backdrop-blur-2xl p-0 flex flex-col shadow-2xl z-[100]">
          <div className="p-10 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
            <div className="space-y-4">
              <Badge className="rounded-full bg-zinc-900 text-white border-none px-3 py-0.5 text-[10px] font-medium">
                {QUESTION_TYPE_CONFIG[selectedQuestion?.type as keyof typeof QUESTION_TYPE_CONFIG]?.label}
              </Badge>
              <h2 className="text-lg font-medium leading-relaxed text-zinc-900">{selectedQuestion?.content}</h2>
            </div>

            {/* 解析展示与答案省略...保持你原来的精美设计 */}
            <div className="pt-8 border-t border-zinc-100 space-y-6">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">标准答案</p>
              <div className="inline-flex items-center px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[13px] font-bold">
                {selectedQuestion?.answer}
              </div>
            </div>
          </div>
          
          <div className="p-8 bg-white/40 border-t border-white/60 flex gap-3">
             <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full h-12 w-12 hover:bg-red-50 hover:text-red-500 text-zinc-300 transition-all" 
                onClick={() => {
                  setSelectedIds([selectedQuestion.id]); // 单个删除也走批量逻辑
                  setIsDeleteAlertOpen(true);
                }}
             >
                <Trash2 className="h-5 w-5" />
             </Button>
             <Button 
                className="flex-1 rounded-full bg-zinc-900 text-white h-12 text-[13px] font-medium shadow-lg transition-all active:scale-95" 
                onClick={() => { setIsDetailOpen(false); setIsEditOpen(true); }}
             >
                编辑此题
             </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* 编辑/创建弹窗 */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-3xl p-0 rounded-[2.5rem] overflow-hidden border-white/60 bg-white/80 backdrop-blur-2xl shadow-2xl h-[85vh]">
          <div className="h-full overflow-y-auto p-10 custom-scrollbar">
             <QuestionForm 
                initialData={selectedQuestion} 
                onSuccess={() => { setIsEditOpen(false); utils.questions.list.invalidate(); }} 
             />
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog 
        isOpen={isDeleteAlertOpen}
        onOpenChange={setIsDeleteAlertOpen}
        onConfirm={() => deleteBulkMutation.mutate({ ids: selectedIds })}
        isLoading={deleteBulkMutation.isPending}
        title={selectedIds.length > 1 ? "批量删除试题？" : "移除此试题？"}
        description={selectedIds.length > 1 
          ? `您已选择 ${selectedIds.length} 项资源。系统将自动归档已引用的题目，并永久删除未使用的题目。`
          : "该操作将自动检查题目引用情况。若题目已被考试使用，将转为归档状态；否则将被永久删除。"}
      />
    </DashboardLayout>
  );
}