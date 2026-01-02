import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { trpc } from "@/lib/trpc";
import { 
  Plus, FileText, ChevronRight, Loader2, 
  Trash2, Sparkles, BookOpen
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
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

  const utils = trpc.useUtils();
  const { data: questions, isLoading } = trpc.questions.list.useQuery();

  const deleteMutation = trpc.questions.delete.useMutation({
    onSuccess: () => {
      toast.success("题目已从题库中移除");
      utils.questions.list.invalidate();
      setIsDeleteAlertOpen(false);
      setIsDetailOpen(false);
    },
    onError: (err) => toast.error(err.message)
  });

  // 1. 综合筛选逻辑
  const filteredQuestions = useMemo(() => {
    return (questions || []).filter((q: any) => {
      const matchSearch = q.content.toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === "all" || q.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [questions, search, typeFilter]);

  // 2. 分页切片
  const pagedQuestions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredQuestions.slice(start, start + pageSize);
  }, [filteredQuestions, currentPage]);

  // 当筛选改变重置页码
  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter]);

  if (isLoading) return (
    <div className="h-screen flex items-center justify-center bg-white/50 backdrop-blur-sm">
      <Loader2 className="h-5 w-5 animate-spin text-zinc-300" />
    </div>
  );

  return (
    <DashboardLayout>
      {/* 玻璃感背景装饰 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] left-[20%] w-[400px] h-[400px] bg-blue-50/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[20%] w-[350px] h-[350px] bg-indigo-50/20 rounded-full blur-[100px]" />
      </div>

      <div className="relative h-[calc(100vh-4rem)] flex flex-col max-w-5xl mx-auto px-6 py-8 overflow-hidden">
        
        {/* 页头 */}
        <header className="flex-shrink-0 flex justify-between items-end mb-10">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">资源题库</h1>
            <p className="text-zinc-400 text-[11px] mt-1 tracking-widest uppercase">
              标准化教学资源中心
            </p>
          </div>
          <Button 
            onClick={() => { setSelectedQuestion(null); setIsEditOpen(true); }} 
            className="rounded-full bg-zinc-900 text-white h-9 px-6 text-[12px] font-medium shadow-sm hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" /> 录入试题
          </Button>
        </header>

        {/* 3. 使用封装后的 FilterGroup */}
        <div className="flex-shrink-0 space-y-6 mb-8">
          <FilterSearch 
            value={search} 
            onChange={setSearch} 
            placeholder="搜索题目内容..." 
          />
          
          <FilterSlider
            label="题型筛选"
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              { label: "全部", value: "all" },
              ...Object.entries(QUESTION_TYPE_CONFIG).map(([key, cfg]) => ({
                label: cfg.label,
                value: key
              }))
            ]}
          />
        </div>

        {/* 题目列表 */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
          {pagedQuestions.map((q: any) => (
            <div 
              key={q.id} 
              onClick={() => { setSelectedQuestion(q); setIsDetailOpen(true); }}
              className="group flex items-center justify-between p-5 bg-white/40 backdrop-blur-md border border-white/60 rounded-[2rem] hover:bg-white/80 hover:border-zinc-200 hover:scale-[1.01] transition-all duration-300 shadow-sm cursor-pointer"
            >
              <div className="flex items-center gap-5 flex-1 min-w-0">
                <div className="h-10 w-10 rounded-2xl bg-white flex items-center justify-center text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white transition-all shadow-sm">
                  <FileText className="h-5 w-5" />
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
              <ChevronRight className="h-4 w-4 text-zinc-200 group-hover:text-zinc-900 transition-all" />
            </div>
          ))}

          {pagedQuestions.length === 0 && (
            <div className="py-24 text-center">
              <div className="h-16 w-16 bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-4 border border-white/60">
                <FileText className="h-6 w-6 text-zinc-200" />
              </div>
              <p className="text-[11px] text-zinc-300 tracking-widest uppercase font-medium">题库中尚无此类题目</p>
            </div>
          )}
        </div>

        {/* 4. 使用通用分页组件 */}
        <div className="flex-none mt-4">
          <Pagination 
            currentPage={currentPage}
            totalItems={filteredQuestions.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* 预览抽屉 - Liquid Glass 风格 */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="w-full sm:max-w-md rounded-l-[2.5rem] border-white/40 bg-white/80 backdrop-blur-2xl p-0 flex flex-col shadow-2xl z-[100]">
          <div className="p-10 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
            <div className="space-y-4">
              <Badge className="rounded-full bg-zinc-900 text-white border-none px-3 py-0.5 text-[10px] font-medium">
                {QUESTION_TYPE_CONFIG[selectedQuestion?.type as keyof typeof QUESTION_TYPE_CONFIG]?.label}
              </Badge>
              <h2 className="text-lg font-medium leading-relaxed text-zinc-900">{selectedQuestion?.content}</h2>
            </div>

            {selectedQuestion?.options && (
              <div className="space-y-3">
                {selectedQuestion.options.map((opt: any, i: number) => (
                  <div key={i} className="p-4 bg-white/50 rounded-2xl flex items-center gap-4 border border-white/60 shadow-sm transition-all hover:bg-white">
                    <div className="h-7 w-7 bg-zinc-900 text-white rounded-xl flex items-center justify-center text-[12px] font-medium shadow-sm">
                      {opt.label}
                    </div>
                    <p className="text-[13px] text-zinc-600 font-medium">{opt.text}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-8 border-t border-zinc-100 space-y-6">
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">标准答案</p>
                <div className="inline-flex items-center px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[13px] font-bold">
                  {selectedQuestion?.answer}
                </div>
              </div>
              
              <div className="p-6 bg-amber-50/50 backdrop-blur-sm rounded-[1.5rem] border border-amber-100/30">
                <p className="text-[10px] text-amber-600 font-bold flex items-center gap-1.5 uppercase tracking-widest">
                  <Sparkles className="h-3 w-3" /> 解析参考
                </p>
                <p className="text-[12px] text-zinc-500 leading-relaxed mt-3 italic">
                  {selectedQuestion?.analysis || "该题目暂无详细解析内容。"}
                </p>
              </div>
            </div>
          </div>
          
          <div className="p-8 bg-white/40 border-t border-white/60 flex gap-3">
             <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full h-12 w-12 hover:bg-red-50 hover:text-red-500 text-zinc-300 transition-all" 
                onClick={() => setIsDeleteAlertOpen(true)}
             >
                <Trash2 className="h-5 w-5" />
             </Button>
             <Button 
                className="flex-1 rounded-full bg-zinc-900 text-white h-12 text-[13px] font-medium shadow-lg hover:bg-zinc-800 transition-all active:scale-95" 
                onClick={() => { setIsDetailOpen(false); setIsEditOpen(true); }}
             >
                编辑此题
             </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* 编辑/创建弹窗 */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-3xl p-0 rounded-[2.5rem] overflow-hidden border-white/60 bg-white/80 backdrop-blur-2xl shadow-2xl h-[85vh] focus:outline-none">
          <div className="h-full overflow-y-auto p-10 custom-scrollbar">
             <QuestionForm initialData={selectedQuestion} onSuccess={() => { setIsEditOpen(false); utils.questions.list.invalidate(); }} />
          </div>
        </DialogContent>
      </Dialog>

      {/* 5. 使用通用删除确认弹窗 */}
      <ConfirmDeleteDialog 
        isOpen={isDeleteAlertOpen}
        onOpenChange={setIsDeleteAlertOpen}
        onConfirm={() => deleteMutation.mutate({ id: selectedQuestion?.id })}
        isLoading={deleteMutation.isPending}
        title="永久删除试题？"
        description="该试题将从公共题库中移除，已引用此题的作业将保留副本，但您无法再从题库中搜索到它。"
      />

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
      `}</style>
    </DashboardLayout>
  );
}