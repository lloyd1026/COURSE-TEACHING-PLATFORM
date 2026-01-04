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
} from "lucide-react";
import AssignmentForm from "@/components/teacher/assignments/AssignmentForm";
import { toast } from "sonner";
import { Link } from "wouter";

// 引入通用组件
import { ConfirmDeleteDialog } from "@/components/common/ConfirmDeleteDialog";
import { Pagination } from "@/components/common/Pagination";
import { FilterTabs, FilterSlider } from "@/components/common/FilterGroup";
import { SearchFilterBar } from "@/components/common/SearchFilterBar";

export default function AssignmentList() {
  const [search, setSearch] = useState("");
  const [courseSearch, setCourseSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState<number | "all">("all");
  const [classFilter, setClassFilter] = useState<number | "all">("all");

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // 核心状态：控制表单显示
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

  const utils = trpc.useUtils();
  const { data: me } = trpc.auth.me.useQuery();

  // 1. 获取作业列表
  const { data: assignments, isLoading } = trpc.assignments.list.useQuery(
    { teacherId: me?.id },
    { enabled: !!me?.id }
  );
  
  const { data: allCourses } = trpc.courses.list.useQuery();

  // 2. 联动获取班级（用于筛选器）
  const { data: linkedClasses } = trpc.courses.getLinkedClasses.useQuery(
    { courseId: courseFilter as number },
    { enabled: typeof courseFilter === "number" }
  );

  // 3. 筛选逻辑
  const filteredAssignments = useMemo(() => {
    return (assignments || []).filter((a: any) => {
      const matchSearch = !search || a.title.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || a.status === statusFilter;
      const matchCourse = courseFilter === "all" || a.courseId === courseFilter;
      const matchClass = classFilter === "all" || 
        (a.targetClasses && a.targetClasses.some((tc: any) => tc.id === classFilter));

      return matchSearch && matchStatus && matchCourse && matchClass;
    });
  }, [assignments, search, statusFilter, courseFilter, classFilter]);

  const pagedAssignments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAssignments.slice(start, start + pageSize);
  }, [filteredAssignments, currentPage]);

  useEffect(() => { setClassFilter("all"); setCurrentPage(1); }, [courseFilter]);
  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, classFilter]);

  const deleteMutation = trpc.assignments.delete.useMutation({
    onSuccess: () => {
      toast.success("作业档案已移除");
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
        <div className="absolute top-[-5%] right-[-5%] w-[400px] h-[400px] bg-emerald-50/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[10%] left-[-5%] w-[300px] h-[300px] bg-blue-50/10 rounded-full blur-[80px]" />
      </div>

      <div className="relative h-[calc(100vh-4rem)] flex flex-col max-w-5xl mx-auto px-6 py-8 overflow-hidden text-zinc-900">
        <header className="flex-shrink-0 flex justify-between items-center mb-8">
          <div>
            <h1 className="text-xl font-bold">作业管理</h1>
            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mt-1">Multi-Class Distribution</p>
          </div>
          <Button 
            onClick={() => { setSelectedAssignment(null); setIsFormOpen(true); }} 
            className="rounded-full bg-zinc-900 text-white h-10 px-6 text-[12px] font-bold shadow-xl hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4 mr-1.5" /> 布置新作业
          </Button>
        </header>

        <div className="flex-shrink-0 space-y-6 mb-8">
          <SearchFilterBar onSearch={setSearch} placeholder="搜索作业标题..." />
          <FilterTabs 
            value={statusFilter} 
            onChange={setStatusFilter} 
            options={Object.entries(STATUS_CONFIG).map(([key, cfg]: any) => ({ label: cfg.label, value: key }))} 
          />
          <FilterSlider
            label="授课课程"
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
              label="目标班级"
              value={classFilter}
              onChange={setClassFilter}
              options={[
                { label: "全部关联班级", value: "all" },
                ...(linkedClasses || []).map(c => ({ label: c.name, value: c.id }))
              ]}
            />
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar pb-24">
          {pagedAssignments.map((a: any) => (
            <div key={a.id} className="group p-5 bg-white/60 backdrop-blur-md border border-white/60 rounded-[2rem] hover:bg-white hover:shadow-lg transition-all duration-300">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-5 flex-1 min-w-0">
                  <div className="h-11 w-11 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white transition-all shadow-inner">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0 pr-4">
                    <h4 className="text-[15px] text-zinc-800 font-bold truncate mb-1.5">{a.title}</h4>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-[10px] font-black text-zinc-400 flex items-center gap-1.5 uppercase"><BookOpen className="h-3.5 w-3.5" /> {a.courseName}</span>
                      <div className="flex flex-wrap gap-1">
                        {a.targetClasses?.map((cls: any) => (
                          <Badge key={cls.id} variant="outline" className="text-[9px] border-zinc-200 text-zinc-500 font-black px-2 py-0 rounded-md bg-white/50">{cls.name}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge className={`rounded-full border-none px-3 py-0.5 text-[10px] font-black uppercase tracking-tighter ${STATUS_CONFIG[a.status]?.bg} ${STATUS_CONFIG[a.status]?.color}`}>{STATUS_CONFIG[a.status]?.label}</Badge>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-zinc-300 hover:text-zinc-900 transition-all" onClick={() => { setSelectedAssignment(a); setIsFormOpen(true); }}><Edit3 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-zinc-200 hover:text-red-500 transition-all" onClick={() => { setSelectedAssignment(a); setIsDeleteAlertOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-zinc-100/50">
                <div className="flex items-center gap-2 text-zinc-400 text-[10px] font-bold uppercase tracking-widest">
                  <Clock className="h-3.5 w-3.5" />
                  <span>截止：{new Date(a.dueDate).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <Link href={`/teacher/assignments/${a.id}`}><Button variant="ghost" className="h-8 text-[11px] font-black uppercase text-zinc-400 hover:text-zinc-900 gap-1.5">查看批阅详情 <ChevronRight className="h-3 w-3" /></Button></Link>
              </div>
            </div>
          ))}
        </div>

        <div className="flex-none mt-4">
          <Pagination currentPage={currentPage} totalItems={filteredAssignments.length} pageSize={pageSize} onPageChange={setCurrentPage} />
        </div>
      </div>

      {/* --- 核心修改：不再使用 Dialog 容器，直接条件渲染自带遮罩的 Form --- */}
      {isFormOpen && (
        <AssignmentForm 
          key={selectedAssignment?.id || 'new'} 
          initialData={selectedAssignment} 
          onSuccess={() => { 
            setIsFormOpen(false); 
            utils.assignments.list.invalidate(); 
          }}
          onCancel={() => setIsFormOpen(false)} 
        />
      )}

      <ConfirmDeleteDialog 
        isOpen={isDeleteAlertOpen}
        onOpenChange={setIsDeleteAlertOpen}
        onConfirm={() => deleteMutation.mutate({ id: selectedAssignment?.id })}
        isLoading={deleteMutation.isPending}
        title="确认彻底删除？"
        description="此操作将同步移除所有关联班级的作业分发记录及学生已提交的数据。"
      />

      <style dangerouslySetInnerHTML={{ __html: `.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }` }} />
    </DashboardLayout>
  );
}