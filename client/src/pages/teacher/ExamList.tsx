import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import {
  Plus,
  Loader2,
  Calendar,
  Timer,
  Activity,
  CheckCircle2,
  CircleDashed,
  Trash2,
  Edit3,
  BookOpen,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

// 引用通用组件
import { ConfirmDeleteDialog } from "@/components/common/ConfirmDeleteDialog";
import { Pagination } from "@/components/common/Pagination";
import {
  FilterTabs,
  FilterSlider,
} from "@/components/common/FilterGroup";
import { SearchFilterBar } from "@/components/common/SearchFilterBar"; // 1. 引入统一搜索框
import { ExamForm } from "@/components/teacher/exams/ExamForm";

export default function ExamList() {
  // --- 1. 状态管理 ---
  const [search, setSearch] = useState("");
  const [courseSearch, setCourseSearch] = useState("");
  const [classSearch, setClassSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState<number | "all">("all");
  const [classFilter, setClassFilter] = useState<number | "all">("all");

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const [showForm, setShowForm] = useState(false);
  const [editingExam, setEditingExam] = useState<any>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<any>(null);

  const utils = trpc.useUtils();

  // --- 2. 数据请求 ---
  const { data: exams, isLoading } = trpc.exams.list.useQuery();
  const { data: teacherCourses } = trpc.courses.list.useQuery();

  // 联动获取：当课程筛选器变动时，计算该课程下的班级
  const availableClasses = useMemo(() => {
    if (courseFilter === "all" || !teacherCourses) return [];
    const course = teacherCourses.find((c: any) => c.id === courseFilter);
    return (course as any)?.linkedClasses || [];
  }, [courseFilter, teacherCourses]);

  // --- 3. 筛选逻辑 (search 确认后再触发) ---
  const filteredExams = useMemo(() => {
    return (exams || []).filter((e: any) => {
      const matchSearch = !search || e.title.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || e.status === statusFilter;
      const matchCourse = courseFilter === "all" || e.courseId === courseFilter;

      // 级联过滤：检查该考试是否分发给了选中的班级
      const matchClass =
        classFilter === "all" ||
        (e.targetClasses &&
          e.targetClasses.some((tc: any) => tc.id === classFilter));

      return matchSearch && matchStatus && matchCourse && matchClass;
    });
  }, [exams, search, statusFilter, courseFilter, classFilter]);

  const pagedExams = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredExams.slice(start, start + pageSize);
  }, [filteredExams, currentPage]);

  // 切换课程时重置班级和页码
  useEffect(() => {
    setClassFilter("all");
    setCurrentPage(1);
  }, [courseFilter]);
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, classFilter]);

  const deleteMutation = trpc.exams.delete.useMutation({
    onSuccess: () => {
      toast.success("考试已成功撤回");
      utils.exams.list.invalidate();
      setIsDeleteAlertOpen(false);
    },
  });

  const STATUS_CONFIG: any = {
    all: { label: "全部" },
    in_progress: {
      label: "进行中",
      color: "text-emerald-500",
      bg: "bg-emerald-50/50",
      icon: Activity,
    },
    not_started: {
      label: "未开始",
      color: "text-blue-500",
      bg: "bg-blue-50/50",
      icon: CircleDashed,
    },
    ended: {
      label: "已结束",
      color: "text-zinc-400",
      bg: "bg-zinc-50/50",
      icon: CheckCircle2,
    },
  };

  if (isLoading)
    return (
      <div className="h-screen flex items-center justify-center bg-[#F5F5F7]">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-300" />
      </div>
    );

  return (
    <DashboardLayout>
      <div className="relative h-[calc(100vh-4rem)] flex flex-col max-w-6xl mx-auto px-8 py-10 overflow-hidden font-sans">
        {/* Header */}
        <header className="flex-shrink-0 flex justify-between items-end mb-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
              考试管理
            </h1>
            <p className="text-zinc-400 text-[10px] mt-2 tracking-[0.3em] uppercase font-black">
              Examination Aggregate View
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingExam(null);
              setShowForm(true);
            }}
            className="rounded-[1.5rem] bg-zinc-900 text-white h-14 px-8 text-sm font-bold shadow-2xl hover:scale-[1.02] active:scale-95 transition-all gap-2"
          >
            <Plus className="h-5 w-5" /> 发布新考试
          </Button>
        </header>

        {/* 筛选区域：搜索框在上，标签在下 */}
        <div className="flex-shrink-0 space-y-6 mb-10">
          <SearchFilterBar 
            onSearch={setSearch} 
            placeholder="搜索考试标题..." 
          />

          <FilterTabs
            value={statusFilter}
            onChange={setStatusFilter}
            options={Object.entries(STATUS_CONFIG).map(([key, cfg]: any) => ({
              label: cfg.label,
              value: key,
            }))}
          />

          {/* 课程筛选 */}
          <FilterSlider
            label="授课课程"
            searchValue={courseSearch}
            onSearchChange={setCourseSearch}
            searchPlaceholder="检索课程..."
            value={courseFilter}
            onChange={setCourseFilter}
            options={[
              { label: "全部课程", value: "all" },
              ...(teacherCourses || [])
                .filter(c =>
                  c.name.toLowerCase().includes(courseSearch.toLowerCase())
                )
                .map(c => ({ label: c.name, value: c.id })),
            ]}
          />

          {/* 班级筛选 */}
          {courseFilter !== "all" && (
            <div className="animate-in slide-in-from-top-2 duration-300">
              <FilterSlider
                label="目标班级"
                searchValue={classSearch}
                onSearchChange={setClassSearch}
                searchPlaceholder="检索行政班..."
                value={classFilter}
                onChange={setClassFilter}
                options={[
                  { label: "全部班级", value: "all" },
                  ...availableClasses
                    .filter((c: any) =>
                      c.name.toLowerCase().includes(classSearch.toLowerCase())
                    )
                    .map((c: any) => ({ label: c.name, value: c.id })),
                ]}
              />
            </div>
          )}
        </div>

        {/* 列表内容 */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-10">
            {pagedExams.map((exam: any) => {
              const status =
                STATUS_CONFIG[exam.status] || STATUS_CONFIG.not_started;
              return (
                <div
                  key={exam.id}
                  className="group relative bg-white/70 backdrop-blur-2xl border border-white/50 rounded-[3rem] p-8 shadow-sm hover:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] transition-all duration-500"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div
                      className={`h-16 w-16 rounded-[1.5rem] ${status.bg} ${status.color} flex items-center justify-center shadow-inner`}
                    >
                      <status.icon className="h-8 w-8" />
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <Link href={`/teacher/exams/${exam.id}`}>
                        <Button variant="ghost" size="icon" className="h-11 w-11 rounded-2xl bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white transition-all shadow-sm">
                          <ChevronRight className="h-5 w-5" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingExam(exam);
                          setShowForm(true);
                        }}
                        className="h-11 w-11 rounded-2xl bg-zinc-100 hover:bg-zinc-900 hover:text-white transition-all"
                      >
                        <Edit3 className="h-4.5 w-4.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedExam(exam);
                          setIsDeleteAlertOpen(true);
                        }}
                        className="h-11 w-11 rounded-2xl bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-500 transition-all"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-zinc-900 tracking-tight leading-tight">
                      {exam.title}
                    </h3>

                    <div className="flex flex-wrap gap-1.5">
                      {exam.targetClasses?.map((cls: any) => (
                        <span
                          key={cls.id}
                          className="px-2.5 py-1 bg-blue-50/50 text-blue-600 rounded-lg text-[10px] font-bold border border-blue-100/50"
                        >
                          {cls.name}
                        </span>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-4 text-zinc-400 pt-2">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100/50 rounded-full text-[11px] font-bold">
                        <Calendar className="h-3.5 w-3.5" />{" "}
                        {new Date(exam.startTime).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100/50 rounded-full text-[11px] font-bold">
                        <Timer className="h-3.5 w-3.5" /> {exam.duration}m
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100/50 rounded-full text-[11px] font-bold">
                        <BookOpen className="h-3.5 w-3.5" /> {exam.courseName}
                      </div>
                    </div>
                  </div>

                  <div className="absolute bottom-10 right-10">
                    <span
                      className={`text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border border-current/10 ${status.color} ${status.bg}`}
                    >
                      {status.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          {pagedExams.length === 0 && (
            <div className="h-64 flex flex-col items-center justify-center text-zinc-300 space-y-4">
              <CircleDashed className="h-10 w-10 animate-spin opacity-20" />
              <p className="text-[10px] font-bold uppercase tracking-widest">
                暂无匹配的考试档案
              </p>
            </div>
          )}
        </div>

        <div className="flex-none mt-6">
          <Pagination
            currentPage={currentPage}
            totalItems={filteredExams.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {showForm && (
        <ExamForm
          initialData={editingExam}
          onSuccess={() => {
            setShowForm(false);
            utils.exams.list.invalidate();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <ConfirmDeleteDialog
        isOpen={isDeleteAlertOpen}
        onOpenChange={setIsDeleteAlertOpen}
        onConfirm={() => deleteMutation.mutate({ id: selectedExam?.id })}
        isLoading={deleteMutation.isPending}
        title="彻底撤销该考试？"
        description="此操作将永久移除考试计划及其在所有班级的分发状态，不可恢复。"
      />
    </DashboardLayout>
  );
}