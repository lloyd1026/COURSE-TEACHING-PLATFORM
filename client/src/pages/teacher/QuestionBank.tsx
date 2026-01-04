"use client";

import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { 
  Plus, Loader2, Trash2, BookOpen, CheckCircle2, 
  Circle, Edit3, Eye, X, Download, Upload, Fingerprint, Sparkles 
} from "lucide-react";
import { QUESTION_TYPE_CONFIG } from "@/lib/configs";
import QuestionForm from "@/components/teacher/questions/QuestionForm";
import { ImportQuestionsDialog } from "@/components/teacher/questions/ImportQuestions"; 
import { SearchFilterBar } from "@/components/common/SearchFilterBar"; 
import { exportQuestionsToExcel } from "@/lib/excel";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/common/ConfirmDeleteDialog";
import { Pagination } from "@/components/common/Pagination";
import { FilterSlider } from "@/components/common/FilterGroup";

// 定义内部接口解决 ts(2322)
interface QuestionOption {
  label: string;
  text: string;
}

export default function QuestionBank() {
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState<number | "all">("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [singleDeleteId, setSingleDeleteId] = useState<number | null>(null);
  
  const [activeId, setActiveId] = useState<number | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false); 

  const utils = trpc.useUtils();
  const { data: questions, isLoading } = trpc.questions.list.useQuery({
    courseId: courseFilter === "all" ? undefined : courseFilter,
    search: search || undefined
  });

  // 获取详情
  const { data: fullQuestion, isFetching: isFetchingDetail } = trpc.questions.get.useQuery(
    { id: activeId! },
    { enabled: !!activeId && (isEditOpen || isDetailOpen), staleTime: 0 }
  );

  const { data: courses } = trpc.courses.list.useQuery();

  const deleteBulkMutation = trpc.questions.delete.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      utils.questions.list.invalidate();
      setSelectedIds([]);
      setSingleDeleteId(null);
      setIsDeleteAlertOpen(false);
    }
  });

  const pagedList = useMemo(() => {
    const list = (questions || []).filter((q: any) => typeFilter === "all" || q.type === typeFilter);
    return list.slice((currentPage - 1) * 10, currentPage * 10);
  }, [questions, typeFilter, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [courseFilter, typeFilter, search]);

  const handleConfirmDelete = () => {
    const idsToDelete = singleDeleteId ? [singleDeleteId] : selectedIds;
    deleteBulkMutation.mutate({ ids: idsToDelete });
  };

  // 安全处理 options 渲染类型
  const detailOptions = (fullQuestion?.options as QuestionOption[]) || [];

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-zinc-300" /></div>;

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-4rem)] flex flex-col max-w-5xl mx-auto px-6 py-8 overflow-hidden text-zinc-900">
        
        <header className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">资源题库</h1>
            <Badge variant="outline" className="mt-1 text-[10px] border-zinc-200 text-zinc-400 font-bold uppercase tracking-widest">Question Assets</Badge>
          </div>
          <div className="flex gap-2">
             <Button variant="outline" onClick={() => setIsImportOpen(true)} className="rounded-full h-10 px-5 text-[12px] font-bold">
                <Upload className="h-4 w-4 mr-2" /> 批量导入
             </Button>
             <Button onClick={() => { setActiveId(null); setIsEditOpen(true); }} className="rounded-full bg-zinc-900 text-white h-10 px-6 text-[12px] font-bold shadow-xl">
                <Plus className="h-4 w-4 mr-2" /> 录入试题
             </Button>
          </div>
        </header>

        <div className="space-y-6 mb-8">
          <SearchFilterBar onSearch={setSearch} placeholder="输入题干关键字搜索..." />
          <div className="flex flex-col gap-4">
            <FilterSlider label="所属课程" value={courseFilter} onChange={setCourseFilter} options={[{ label: "全部", value: "all" }, ...(courses || []).map(c => ({ label: c.name, value: c.id }))]} />
            <FilterSlider label="题目类型" value={typeFilter} onChange={setTypeFilter} options={[{ label: "全部", value: "all" }, ...Object.entries(QUESTION_TYPE_CONFIG).map(([k, v]) => ({ label: v.label, value: k }))]} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar pb-24">
          {pagedList.map((q: any) => (
            <div key={q.id} className={`group flex items-center justify-between p-5 bg-white/60 backdrop-blur-md border rounded-[2rem] transition-all duration-300 hover:shadow-lg ${selectedIds.includes(q.id) ? "border-zinc-900 bg-white ring-1" : "border-white/60"}`}>
              <div className="flex items-center gap-5 flex-1 min-w-0">
                <div onClick={(e) => { e.stopPropagation(); setSelectedIds(prev => prev.includes(q.id) ? prev.filter(i => i !== q.id) : [...prev, q.id]) }}>
                  {selectedIds.includes(q.id) ? <CheckCircle2 className="h-6 w-6 text-zinc-900 cursor-pointer" /> : <Circle className="h-6 w-6 text-zinc-200 cursor-pointer group-hover:text-zinc-400" />}
                </div>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { setActiveId(q.id); setIsDetailOpen(true); }}>
                  <div className="flex items-center gap-3 mb-1.5">
                    <Badge variant="secondary" className="bg-zinc-100 text-zinc-500 border-none text-[9px] px-2 py-0">{QUESTION_TYPE_CONFIG[q.type as keyof typeof QUESTION_TYPE_CONFIG]?.label}</Badge>
                    <span className="text-[10px] text-zinc-400 font-bold tracking-tight flex items-center gap-1"><BookOpen className="h-3 w-3" /> {q.courseName}</span>
                  </div>
                  <h4 className="text-[14px] text-zinc-800 truncate font-medium">{q.content}</h4>
                </div>
              </div>
              <div className="flex items-center gap-1 ml-4 border-l border-zinc-100 pl-4 lg:opacity-0 lg:group-hover:opacity-100 transition-all">
                <Button variant="ghost" size="icon" onClick={() => { setActiveId(q.id); setIsDetailOpen(true); }} className="h-9 w-9 rounded-full text-zinc-400 hover:bg-zinc-100"><Eye className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => { setActiveId(q.id); setIsEditOpen(true); }} className="h-9 w-9 rounded-full text-zinc-400 hover:bg-zinc-100"><Edit3 className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => { setSingleDeleteId(q.id); setIsDeleteAlertOpen(true); }} className="h-9 w-9 rounded-full text-zinc-300 hover:text-red-500"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex-none">
          <Pagination currentPage={currentPage} totalItems={questions?.length || 0} pageSize={10} onPageChange={setCurrentPage} />
        </div>

        {selectedIds.length > 0 && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10">
            <div className="flex items-center gap-6 px-8 py-4 bg-zinc-900/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl text-white">
              <span className="text-[11px] font-bold border-r border-white/10 pr-6">已选择 {selectedIds.length} 项</span>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => exportQuestionsToExcel(questions?.filter(q => selectedIds.includes(q.id)) || [])} className="h-10 text-[12px] font-bold gap-2"><Download className="h-4 w-4" /> 导出 Excel</Button>
                <Button variant="ghost" onClick={() => { setSingleDeleteId(null); setIsDeleteAlertOpen(true); }} className="h-10 text-red-400 text-[12px] font-bold gap-2"><Trash2 className="h-4 w-4" /> 批量删除</Button>
              </div>
              <Button variant="ghost" onClick={() => setSelectedIds([])} className="h-10 w-10 rounded-full"><X className="h-4 w-4" /></Button>
            </div>
          </div>
        )}

        <Dialog open={isDetailOpen} onOpenChange={(v) => { setIsDetailOpen(v); if(!v) setActiveId(null); }}>
          <DialogContent className="max-w-2xl p-0 rounded-[2.5rem] overflow-hidden border-none bg-white shadow-2xl z-[200]">
            {activeId && isFetchingDetail ? (
               <div className="h-60 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="animate-spin h-8 w-8 text-zinc-200" />
                  <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest italic">拉取数据档案...</span>
               </div>
            ) : fullQuestion && (
              <div className="h-[75vh] flex flex-col">
                <div className="flex-1 overflow-y-auto p-12 space-y-8 custom-scrollbar">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-zinc-900 text-white px-3 py-1 text-[10px] font-bold">{QUESTION_TYPE_CONFIG[fullQuestion.type as keyof typeof QUESTION_TYPE_CONFIG]?.label}</Badge>
                    <span className="text-[10px] text-zinc-300 font-bold flex items-center gap-1"><Fingerprint className="h-3 w-3" /> ID: {fullQuestion.id}</span>
                  </div>
                  <section>
                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-1 block italic">题目简称 / {fullQuestion.title}</label>
                    <h2 className="text-xl font-bold leading-relaxed text-zinc-900">{fullQuestion.content}</h2>
                  </section>
                  {detailOptions.length > 0 && (
                    <section className="space-y-3">
                      <label className="text-[10px] font-black text-zinc-400 uppercase italic">选项配置</label>
                      <div className="grid gap-2">
                        {detailOptions.map((opt, i) => (
                          <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-zinc-50 border border-zinc-100/50">
                            <div className="h-7 w-7 shrink-0 bg-white border-2 border-zinc-900 text-zinc-900 rounded-lg flex items-center justify-center text-[11px] font-black">{opt.label}</div>
                            <div className="pt-1 text-[14px] text-zinc-700 font-medium">{opt.text}</div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                  <div className="grid grid-cols-2 gap-4 pt-8 border-t">
                    <div className="p-5 bg-emerald-50 rounded-[1.5rem] border border-emerald-100/50">
                      <div className="text-emerald-600 mb-2 font-black text-[10px] uppercase">正确答案</div>
                      <div className="text-sm font-black text-emerald-900">{fullQuestion.answer}</div>
                    </div>
                    <div className="p-5 bg-zinc-50 rounded-[1.5rem] border border-zinc-100">
                      <div className="text-zinc-400 mb-2 font-black text-[10px] uppercase">题目解析</div>
                      <p className="text-[12px] text-zinc-500 italic">{fullQuestion.analysis || "暂无解析"}</p>
                    </div>
                  </div>
                </div>
                <div className="p-8 bg-zinc-50 border-t flex gap-3">
                  <Button variant="outline" onClick={() => setIsDetailOpen(false)} className="flex-1 h-12 rounded-2xl font-bold">退出预览</Button>
                  <Button onClick={() => { setIsDetailOpen(false); setIsEditOpen(true); }} className="flex-1 h-12 rounded-2xl bg-zinc-900 text-white font-bold">修改题目</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={isEditOpen} onOpenChange={(v) => { setIsEditOpen(v); if(!v) setActiveId(null); }}>
          <DialogContent className="max-w-3xl p-0 rounded-[3rem] overflow-hidden border-none bg-white shadow-2xl h-[85vh] z-[210]">
            {activeId && isFetchingDetail ? (
              <div className="h-full flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-200" />
                <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">全量数据同步中...</span>
              </div>
            ) : (
              <div className="h-full overflow-y-auto p-12 custom-scrollbar">
                <QuestionForm 
                  key={activeId || 'new'} 
                  initialData={fullQuestion} 
                  onSuccess={() => { setIsEditOpen(false); setActiveId(null); utils.questions.list.invalidate(); }} 
                />
              </div>
            )}
          </DialogContent>
        </Dialog>

        <ImportQuestionsDialog isOpen={isImportOpen} onOpenChange={setIsImportOpen} onSuccess={() => utils.questions.list.invalidate()} />
        <ConfirmDeleteDialog isOpen={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen} onConfirm={handleConfirmDelete} title={singleDeleteId ? "确认删除该题目？" : `确认删除选中的 ${selectedIds.length} 道题目？`} />
        
        <style dangerouslySetInnerHTML={{ __html: `.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }` }} />
      </div>
    </DashboardLayout>
  );
}