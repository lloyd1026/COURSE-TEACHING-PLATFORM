import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { 
  BookOpen, Plus, Loader2, Edit3, Trash2, Star 
} from "lucide-react";
import CourseForm from "@/components/teacher/courses/CourseForm";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useLocation } from "wouter";

// 引入组件
import { ConfirmDeleteDialog } from "@/components/common/ConfirmDeleteDialog";
import { Pagination } from "@/components/common/Pagination";
import { FilterTabs } from "@/components/common/FilterGroup";
import { SearchFilterBar } from "@/components/common/SearchFilterBar";

export default function CourseList() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

  const utils = trpc.useUtils();
  const { data: courses, isLoading } = trpc.courses.list.useQuery();

  const deleteMutation = trpc.courses.delete.useMutation({
    onSuccess: () => {
      toast.success("课程已移除");
      utils.courses.list.invalidate();
      setIsDeleteAlertOpen(false);
    },
    onError: err => toast.error(err.message),
  });

  const filteredCourses = useMemo(() => {
    return (courses || []).filter(c => {
      const matchSearch = !search || 
                          c.name.toLowerCase().includes(search.toLowerCase()) ||
                          c.code.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [courses, search, statusFilter]);

  const pagedCourses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCourses.slice(start, start + pageSize);
  }, [filteredCourses, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  if (isLoading) return (
    <div className="h-screen flex items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-zinc-300" />
    </div>
  );

  return (
    <DashboardLayout>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[5%] left-[10%] w-[400px] h-[400px] bg-blue-50/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[10%] w-[350px] h-[350px] bg-indigo-50/30 rounded-full blur-[100px]" />
      </div>

      <div className="relative h-[calc(100vh-4rem)] flex flex-col max-w-6xl mx-auto px-6 py-8 overflow-hidden">
        <header className="flex-shrink-0 flex justify-between items-end mb-10">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">课程档案</h1>
            <p className="text-zinc-400 text-[11px] mt-1 tracking-widest uppercase">管理与维护您的教学大纲</p>
          </div>
          <Button 
            onClick={() => { setSelectedCourse(null); setIsFormOpen(true); }} 
            className="rounded-full bg-zinc-900 text-white h-9 px-6 text-[12px] font-medium shadow-sm hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" /> 开设课程
          </Button>
        </header>

        {/* 筛选区域：搜索框在上，标签在下 */}
        <div className="flex-shrink-0 space-y-6 mb-8">
          <SearchFilterBar 
            onSearch={setSearch} 
            placeholder="搜索课程名称或代码..." 
          />
          
          <FilterTabs 
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { label: "全部", value: "all" },
              { label: "授课中", value: "active" },
              { label: "草稿", value: "draft" },
              { label: "归档", value: "archived" },
            ]}
          />
        </div>

        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
          <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-10">
            {pagedCourses.map(course => (
              <div 
                key={course.id} 
                className="group relative p-6 bg-white/50 backdrop-blur-md border border-white/80 rounded-[2rem] hover:bg-white/80 hover:border-zinc-200 hover:scale-[1.02] transition-all duration-300 shadow-sm flex flex-col h-full cursor-pointer" 
                onClick={() => setLocation(`/teacher/courses/${course.id}`)}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="h-10 w-10 rounded-2xl bg-white flex items-center justify-center text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white transition-all shadow-sm">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <Badge 
                    variant="secondary" 
                    className={`rounded-full px-2.5 py-0 border-none text-[9px] font-medium ${
                      course.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-400"
                    }`}
                  >
                    {course.status === "active" ? "授课中" : course.status === "draft" ? "草稿" : "已归档"}
                  </Badge>
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-medium text-zinc-900 leading-snug mb-1">{course.name}</h3>
                  <p className="text-[10px] font-mono text-zinc-400 uppercase">{course.code}</p>
                </div>
                <div className="mt-8 pt-4 border-t border-zinc-100/50 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400 font-medium tracking-wider flex items-center gap-1">
                    <Star className="h-2.5 w-2.5 opacity-60" /> {course.credits} 学分
                  </span>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-zinc-400 hover:text-zinc-900 hover:scale-110 active:scale-90 transition-all" onClick={() => { setSelectedCourse(course); setIsFormOpen(true); }}><Edit3 className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-zinc-300 hover:text-red-500 hover:scale-110 active:scale-90 transition-all" onClick={() => { setSelectedCourse(course); setIsDeleteAlertOpen(true); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {pagedCourses.length === 0 && (
             <div className="py-20 text-center text-zinc-300 text-[11px] tracking-widest uppercase font-medium">暂无课程记录</div>
          )}
        </div>

        <div className="flex-none bg-white/20 backdrop-blur-sm rounded-t-3xl mt-2 px-4">
          <Pagination 
            currentPage={currentPage}
            totalItems={filteredCourses.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl p-0 rounded-[2.5rem] overflow-hidden border-white/60 bg-white/80 backdrop-blur-2xl h-[90vh] focus:outline-none shadow-2xl">
          <div className="h-full overflow-y-auto p-10 custom-scrollbar">
            <CourseForm initialData={selectedCourse} onSuccess={() => { setIsFormOpen(false); utils.courses.list.invalidate(); }} />
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog 
        isOpen={isDeleteAlertOpen}
        onOpenChange={setIsDeleteAlertOpen}
        onConfirm={() => deleteMutation.mutate({ id: selectedCourse?.id })}
        isLoading={deleteMutation.isPending}
        title="移除课程档案？"
        description={`确定要永久删除“${selectedCourse?.name}”吗？此操作将同步移除关联的教学大纲。`}
      />

      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 3px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }`}</style>
    </DashboardLayout>
  );
}