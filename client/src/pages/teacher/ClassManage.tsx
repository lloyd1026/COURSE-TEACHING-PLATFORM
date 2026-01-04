import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { 
  Plus, Loader2, Edit3, Trash2, GraduationCap, 
  Users, Clock 
} from "lucide-react";
import ClassForm from "@/components/teacher/classes/ClassForm";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/common/ConfirmDeleteDialog";
import { Pagination } from "@/components/common/Pagination";
import { FilterSlider } from "@/components/common/FilterGroup";
import { SearchFilterBar } from "@/components/common/SearchFilterBar"; // 1. 引入组件
import { toast } from "sonner";
import { useLocation } from "wouter";
import { generateGrades } from "@/lib/configs";

export default function ClassManage() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState(""); // 此时 search 仅在确认后更新
  const [gradeFilter, setGradeFilter] = useState<number | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const gradeOptions = useMemo(() => generateGrades(), []);

  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const utils = trpc.useUtils();
  const { data: classes, isLoading } = trpc.classes.list.useQuery();

  const deleteMutation = trpc.classes.delete.useMutation({
    onSuccess: () => {
      toast.success("班级已删除");
      utils.classes.list.invalidate();
      setIsDeleteOpen(false);
    },
    onError: (err) => toast.error(err.message)
  });

  // 2. 筛选逻辑：search 现在是点击确认后才变化，所以这里不再会随着打字而高频触发
  const filteredItems = useMemo(() => {
    return (classes || []).filter(c => {
      const matchSearch = !search || 
                          c.name.toLowerCase().includes(search.toLowerCase()) ||
                          c.major?.toLowerCase().includes(search.toLowerCase());
      const matchGrade = gradeFilter === "all" || c.grade === gradeFilter;
      return matchSearch && matchGrade;
    });
  }, [classes, search, gradeFilter]);

  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, gradeFilter]);

  if (isLoading) return (
    <div className="h-screen flex items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-zinc-300" />
    </div>
  );

  return (
    <DashboardLayout>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-5%] right-[-5%] w-[400px] h-[400px] bg-blue-50/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[10%] left-[-5%] w-[300px] h-[300px] bg-zinc-50/40 rounded-full blur-[80px]" />
      </div>

      <div className="relative h-[calc(100vh-4rem)] flex flex-col max-w-5xl mx-auto px-6 py-8 overflow-hidden">
        <header className="flex-shrink-0 flex justify-between items-end mb-10">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">班级管理</h1>
            <p className="text-zinc-400 text-[11px] mt-1 tracking-widest uppercase">维护学生档案及行政名册</p>
          </div>
          <Button onClick={() => { setSelectedClass(null); setIsFormOpen(true); }} className="rounded-full bg-zinc-900 text-white h-9 px-6 text-[12px] font-medium hover:scale-105 active:scale-95 transition-all">
            <Plus className="h-3.5 w-3.5 mr-1.5" /> 新建班级
          </Button>
        </header>

        <div className="flex-shrink-0 space-y-6 mb-8">
          {/* 3. 替换掉旧的 FilterSearch */}
          <SearchFilterBar 
            onSearch={setSearch} 
            placeholder="搜索班级或专业名称..." 
          />

          <FilterSlider
            label="入学年份"
            value={gradeFilter}
            onChange={setGradeFilter}
            options={[
              { label: "全部", value: "all" },
              ...gradeOptions.map(opt => ({ label: opt.label, value: opt.value }))
            ]}
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
          {pagedItems.map((cls: any) => (
            <div 
              key={cls.id} 
              className="group p-5 bg-white/40 backdrop-blur-md border border-white/60 rounded-[2rem] hover:bg-white/80 hover:border-zinc-200 hover:scale-[1.01] transition-all duration-300 cursor-pointer relative shadow-sm"
              onClick={() => setLocation(`/teacher/classes/${cls.id}`)}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-5">
                  <div className="h-11 w-11 rounded-2xl bg-white flex items-center justify-center text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white transition-all shadow-sm">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-[15px] text-zinc-800 font-medium leading-none mb-2">{cls.name}</h4>
                    <div className="flex items-center gap-3 opacity-60">
                      <span className="text-[10px] font-medium bg-zinc-100 px-2 py-0.5 rounded-md text-zinc-500 uppercase">{cls.major}</span>
                      <span className="text-[10px] flex items-center gap-1 text-zinc-400"><Users className="h-3 w-3" /> {cls.studentCount || 0} 学生</span>
                      <span className="text-[10px] flex items-center gap-1 text-zinc-400"><Clock className="h-3 w-3" /> {cls.grade}级</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-zinc-400 hover:text-zinc-900 hover:scale-110 active:scale-90 transition-all" onClick={() => { setSelectedClass(cls); setIsFormOpen(true); }}>
                    <Edit3 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-zinc-300 hover:text-red-500 hover:scale-110 active:scale-90 transition-all" onClick={() => { setSelectedClass(cls); setIsDeleteOpen(true); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          
          {pagedItems.length === 0 && (
            <div className="py-24 text-center">
              <div className="h-16 w-16 bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-4 border border-white/60">
                <GraduationCap className="h-6 w-6 text-zinc-200" />
              </div>
              <p className="text-[11px] text-zinc-300 tracking-widest uppercase font-medium">未找到符合条件的班级</p>
            </div>
          )}
        </div>

        <div className="flex-none mt-4">
          <Pagination currentPage={currentPage} totalItems={filteredItems.length} pageSize={pageSize} onPageChange={setCurrentPage} />
        </div>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl p-0 rounded-[2.5rem] overflow-hidden border-white/60 bg-white/80 backdrop-blur-2xl h-[60vh] focus:outline-none shadow-2xl">
          <div className="h-full overflow-y-auto p-10 custom-scrollbar">
            <ClassForm initialData={selectedClass} onSuccess={() => { setIsFormOpen(false); utils.classes.list.invalidate(); }} />
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog 
        isOpen={isDeleteOpen} 
        onOpenChange={setIsDeleteOpen} 
        onConfirm={() => deleteMutation.mutate({ id: selectedClass?.id })} 
        isLoading={deleteMutation.isPending}
        title="删除班级档案？"
        description={`该操作将移除“${selectedClass?.name}”，请确保班级内已无关联学生。`}
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