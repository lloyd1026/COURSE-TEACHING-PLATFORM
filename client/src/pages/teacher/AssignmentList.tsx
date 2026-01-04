import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  Plus,
  FileText,
  ChevronRight,
  Loader2,
  BookOpen,
  Clock,
  Edit3,
  Trash2,
  GraduationCap,
  RotateCcw,
} from "lucide-react";
import AssignmentForm from "@/components/teacher/assignments/AssignmentForm";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Link } from "wouter";

// 引入通用组件
import { ConfirmDeleteDialog } from "@/components/common/ConfirmDeleteDialog";
import { Pagination } from "@/components/common/Pagination";
import { FilterTabs, FilterSlider } from "@/components/common/FilterGroup";
import { SearchFilterBar } from "@/components/common/SearchFilterBar"; // 1. 引入新组件

export default function AssignmentList() {
  const [search, setSearch] = useState("");
  const [courseSearch, setCourseSearch] = useState("");
  const [classSearch, setClassSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState<number | "all">("all");
  const [classFilter, setClassFilter] = useState<number | "all">("all");

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

  const utils = trpc.useUtils();
  const { data: me } = trpc.auth.me.useQuery();

  // 数据请求
  const { data: assignments, isLoading } = trpc.assignments.list.useQuery(
    { teacherId: me?.id },
    { enabled: !!me?.id }
  );
  const { data: allCourses } = trpc.courses.list.useQuery();

  // 联动获取：根据选中的课程获取班级
  const { data: linkedClasses } = trpc.courses.getLinkedClasses.useQuery(
    { courseId: courseFilter as number },
    { enabled: typeof courseFilter === "number" }
  );

  // 筛选逻辑 (search 现在确认后触发)
  const filteredAssignments = useMemo(() => {
    return (assignments || []).filter((a: any) => {
      const matchSearch = !search || a.title.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || a.status === statusFilter;
      const matchCourse = courseFilter === "all" || a.courseId === courseFilter;
      const matchClass = classFilter === "all" || a.classId === classFilter;
      return matchSearch && matchStatus && matchCourse && matchClass;
    });
  }, [assignments, search, statusFilter, courseFilter, classFilter]);

  // 分页切片
  const pagedAssignments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAssignments.slice(start, start + pageSize);
  }, [filteredAssignments, currentPage]);

  // 联动重置页码
  useEffect(() => { setClassFilter("all"); setCurrentPage(1); }, [courseFilter]);
  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, classFilter]);

  const withdrawMutation = trpc.assignments.update.useMutation({
    onSuccess: () => {
      toast.success("已撤回至草稿箱");
      utils.assignments.list.invalidate();
    },
  });

  const deleteMutation = trpc.assignments.delete.useMutation({
    onSuccess: () => {
      toast.success("作业已删除");
      utils.assignments.list.invalidate();
      setIsDeleteAlertOpen(false);
    },
  });

  const STATUS_CONFIG: any = {
    all: { label: "全部" },
    published: { label: "进行中", color: "text-emerald-500", bg: "bg-emerald-50/50" },
    draft: { label: "草稿箱", color: "text-zinc-400", bg: "bg-zinc-100/50" },
    closed: { label: "已截止", color: "text-rose-400", bg: "bg-rose-50/50" },
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-zinc-300" /></div>;

  return (
    <DashboardLayout>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-5%] right-[-5%] w-[400px] h-[400px] bg-emerald-50/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[10%] left-[-5%] w-[300px] h-[300px] bg-blue-50/20 rounded-full blur-[80px]" />
      </div>

      <div className="relative h-[calc(100vh-4rem)] flex flex-col max-w-5xl mx-auto px-6 py-8 overflow-hidden">
        <header className="flex-shrink-0 flex justify-between items-center mb-8">
          <h1 className="text-xl font-medium text-zinc-900">作业管理</h1>
          <Button onClick={() => { setSelectedAssignment(null); setIsEditOpen(true); }} className="rounded-full bg-zinc-900 text-white h-9 px-5 text-[12px] font-normal hover:scale-105 active:scale-95 transition-all shadow-sm">
            <Plus className="h-3.5 w-3.5 mr-1" /> 布置作业
          </Button>
        </header>

        {/* 筛选区域：搜索框在上，标签在下 */}
        <div className="flex-shrink-0 space-y-6 mb-8">
          <SearchFilterBar 
            onSearch={setSearch} 
            placeholder="搜索作业标题..." 
          />

          <FilterTabs 
            value={statusFilter} 
            onChange={setStatusFilter} 
            options={Object.entries(STATUS_CONFIG).map(([key, cfg]: any) => ({ label: cfg.label, value: key }))} 
          />

          <FilterSlider
            label="课程"
            searchValue={courseSearch}
            onSearchChange={setCourseSearch}
            searchPlaceholder="检索课程..."
            value={courseFilter}
            onChange={setCourseFilter}
            options={[
              { label: "全部课程", value: "all" },
              ...(allCourses || []).filter(c => c.status === "active" && c.name.toLowerCase().includes(courseSearch.toLowerCase())).map(c => ({ label: c.name, value: c.id }))
            ]}
          />

          {courseFilter !== "all" && (
            <FilterSlider
              label="班级"
              searchValue={classSearch}
              onSearchChange={setClassSearch}
              searchPlaceholder="检索班级..."
              value={classFilter}
              onChange={setClassFilter}
              options={[
                { label: "全部班级", value: "all" },
                ...(linkedClasses || []).filter(c => c.name.toLowerCase().includes(classSearch.toLowerCase())).map(c => ({ label: c.name, value: c.id }))
              ]}
            />
          )}
        </div>

        {/* 列表内容 */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
          {pagedAssignments.map((a: any) => (
            <div key={a.id} className="group p-4 bg-white/40 backdrop-blur-md border border-white/60 rounded-2xl hover:bg-white/80 hover:scale-[1.01] transition-all shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <Link href={`/teacher/assignments/${a.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white transition-all shadow-sm"><FileText className="h-4 w-4" /></div>
                  <div className="flex-1 min-w-0 pr-4">
                    <h4 className="text-[13px] text-zinc-800 font-medium truncate">{a.title}</h4>
                    <div className="flex items-center gap-2 mt-1 opacity-60">
                      <span className="text-[9px] flex items-center gap-1"><BookOpen className="h-2.5 w-2.5" /> {a.courseName}</span>
                      <span className="text-[9px] flex items-center gap-1"><GraduationCap className="h-2.5 w-2.5" /> {a.className}</span>
                    </div>
                  </div>
                </Link>
                <div className="flex items-center gap-1.5">
                  <Badge className={`rounded-full border-none px-2 py-0 text-[9px] font-normal ${STATUS_CONFIG[a.status]?.bg} ${STATUS_CONFIG[a.status]?.color}`}>{STATUS_CONFIG[a.status]?.label}</Badge>
                  <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                    {a.status === "published" && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-zinc-400 hover:text-zinc-900 hover:scale-110 active:scale-90 transition-all" onClick={() => withdrawMutation.mutate({ id: a.id, status: "draft" })}>
                        <RotateCcw className={`h-3 w-3 ${withdrawMutation.isPending ? 'animate-spin' : ''}`} />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-zinc-400 hover:text-zinc-900 hover:scale-110 active:scale-90 transition-all" onClick={() => { setSelectedAssignment(a); setIsEditOpen(true); }}><Edit3 className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-zinc-300 hover:text-red-500 hover:scale-110 active:scale-90 transition-all" onClick={() => { setSelectedAssignment(a); setIsDeleteAlertOpen(true); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-white/40">
                <div className="flex items-center gap-1.5 text-zinc-400 text-[10px]"><Clock className="h-3 w-3" /><span>截止：{new Date(a.dueDate).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span></div>
                <ChevronRight className="h-3.5 w-3.5 text-zinc-200" />
              </div>
            </div>
          ))}
          {pagedAssignments.length === 0 && <div className="py-20 text-center text-zinc-300 text-[11px] tracking-widest uppercase font-medium">暂无作业档案</div>}
        </div>

        <div className="flex-none mt-4">
          <Pagination 
            currentPage={currentPage}
            totalItems={filteredAssignments.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl p-0 rounded-[2rem] border-white/60 bg-white/80 backdrop-blur-2xl h-[80vh] overflow-hidden shadow-2xl">
          <div className="h-full overflow-y-auto p-10 custom-scrollbar">
            <AssignmentForm initialData={selectedAssignment} onSuccess={() => { setIsEditOpen(false); utils.assignments.list.invalidate(); }} />
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog 
        isOpen={isDeleteAlertOpen}
        onOpenChange={setIsDeleteAlertOpen}
        onConfirm={() => deleteMutation.mutate({ id: selectedAssignment?.id })}
        isLoading={deleteMutation.isPending}
        title="彻底删除该作业？"
        description="此操作将同步删除所有学生的提交记录及批改数据，且不可恢复。"
      />

      <style dangerouslySetInnerHTML={{ __html: `.no-scrollbar::-webkit-scrollbar { display: none; } .custom-scrollbar::-webkit-scrollbar { width: 3px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }` }} />
    </DashboardLayout>
  );
}