import { useState, useMemo } from "react";
import { useParams, Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  ArrowLeft,
  Users,
  BookOpen,
  Plus,
  Loader2,
  UserPlus,
  Calendar,
  GraduationCap,
  Search,
  Trash2,
  Link as LinkIcon,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Info,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function ClassDetail() {
  const { id } = useParams<{ id: string }>();
  const classId = parseInt(id || "0");
  const utils = trpc.useUtils();
  const { user: currentUser } = useAuth();

  // --- 1. 状态管理 ---
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isLinkCourseOpen, setIsLinkCourseOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isUnlinkConfirmOpen, setIsUnlinkConfirmOpen] = useState(false);

  const [importText, setImportText] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [allCourseSearch, setAllCourseSearch] = useState("");

  const [studentPage, setStudentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [pendingUnlinkCourse, setPendingUnlinkCourse] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const itemsPerPage = 15;

  // --- 2. 数据查询 ---
  const { data: classInfo, isLoading: isClassLoading } =
    trpc.classes.get.useQuery({ id: classId });
  const { data: allStudents } = trpc.classes.getStudents.useQuery({ classId });
  const { data: linkedCourses } = trpc.classes.listCourses.useQuery({
    classId,
  });
  const { data: allAvailableCourses } = trpc.courses.list.useQuery();

  // --- 3. 计算属性 ---
  const filteredStudents = useMemo(() => {
    return (allStudents || []).filter(
      s =>
        (s.name ?? "").toLowerCase().includes(studentSearch.toLowerCase()) ||
        (s.studentId ?? "").includes(studentSearch)
    );
  }, [allStudents, studentSearch]);

  const pagedStudents = filteredStudents.slice(
    (studentPage - 1) * itemsPerPage,
    studentPage * itemsPerPage
  );
  const studentTotalPages = Math.ceil(filteredStudents.length / itemsPerPage);

  const unlinkedCourses = useMemo(() => {
    const linkedIds = new Set(linkedCourses?.map(c => c.id));
    return (allAvailableCourses || []).filter(
      c =>
        !linkedIds.has(c.id) &&
        (c.name.toLowerCase().includes(allCourseSearch.toLowerCase()) ||
          c.code.toLowerCase().includes(allCourseSearch.toLowerCase()))
    );
  }, [allAvailableCourses, linkedCourses, allCourseSearch]);

  // --- 4. 交互逻辑 ---
  const importMutation = trpc.classes.createStudentsBatch.useMutation({
    onSuccess: () => {
      toast.success("同步成功");
      setIsImportOpen(false);
      setImportText("");
      utils.classes.getStudents.invalidate({ classId });
    },
  });

  const removeMutation = trpc.classes.removeStudentsFromClassBatch.useMutation({
    onSuccess: () => {
      toast.success("已移除学生");
      setSelectedIds([]);
      setIsConfirmOpen(false);
      utils.classes.getStudents.invalidate({ classId });
    },
  });

  const linkCourseMutation = trpc.courses.linkClass.useMutation({
    onSuccess: () => {
      toast.success("课程关联成功");
      utils.classes.listCourses.invalidate({ classId });
    },
  });

  const unlinkMutation = trpc.courses.unlinkClass.useMutation({
    onSuccess: () => {
      toast.success("教学关联已解除");
      setIsUnlinkConfirmOpen(false);
      utils.classes.listCourses.invalidate({ classId });
    },
  });

  const handleBatchImport = () => {
    const lines = importText.split("\n").filter(l => l.trim());
    const studentData = lines.map(line => {
      const [studentId, name] = line.trim().split(/\s+/);
      return { studentId, name };
    });
    if (studentData.some(s => !s.studentId || !s.name))
      return toast.error("数据格式有误");
    importMutation.mutate({ classId, students: studentData });
  };

  const handleToggleAll = () => {
    if (selectedIds.length === pagedStudents.length) setSelectedIds([]);
    else setSelectedIds(pagedStudents.map(s => s.studentId));
  };

  if (isClassLoading)
    return (
      <div className="flex h-screen items-center justify-center bg-[#F5F5F7]">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );

  return (
    <DashboardLayout>
      {/* 核心修改：容器设为 h-screen 和 flex-col，防止整页滚动 */}
      <div className="h-screen flex flex-col bg-[#F5F5F7] font-sans antialiased text-[#1D1D1F] overflow-hidden">
        {/* Apple Style Header */}
        <header className="flex-none z-30 w-full bg-[#F5F5F7]/80 backdrop-blur-xl border-b border-gray-200/50">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.history.back()}
                className="rounded-full hover:bg-gray-200/50"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="h-6 w-[1px] bg-gray-300" />
              <div>
                <h1 className="text-lg font-semibold tracking-tight leading-none">
                  {classInfo?.name}
                </h1>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">
                  {classInfo?.major} • {classInfo?.grade}级
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => setIsImportOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-5 h-9 text-sm font-medium transition-all shadow-sm shadow-blue-100"
              >
                <UserPlus className="h-4 w-4 mr-2" /> 导入学生
              </Button>
              <Dialog
                open={isLinkCourseOpen}
                onOpenChange={setIsLinkCourseOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="rounded-full border-gray-300 bg-white h-9 px-5 text-sm font-medium"
                  >
                    <Plus className="h-4 w-4 mr-2" /> 关联课程
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[480px] rounded-[24px] bg-white/95 backdrop-blur-xl border-none shadow-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold tracking-tight">
                      关联课程
                    </DialogTitle>
                    <DialogDescription className="text-xs text-zinc-400">
                      搜索并选择要加入本班教学计划的课程。
                    </DialogDescription>
                  </DialogHeader>

                  <div className="py-4 space-y-4">
                    {/* 搜索框 */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                      <Input
                        placeholder="搜索课程名称或代码..."
                        className="rounded-xl bg-zinc-100 border-none h-11 pl-10 focus-visible:ring-1 focus-visible:ring-zinc-200"
                        value={allCourseSearch}
                        onChange={e => setAllCourseSearch(e.target.value)}
                      />
                    </div>

                    {/* 课程列表 */}
                    <div className="max-h-[380px] overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                      {unlinkedCourses.length > 0 ? (
                        unlinkedCourses.map(course => {
                          const isActive = course.status === "active";

                          return (
                            <div
                              key={course.id}
                              className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                                isActive
                                  ? "bg-white border-zinc-100 hover:border-zinc-300 hover:shadow-sm"
                                  : "bg-zinc-50/50 border-transparent opacity-60"
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <p
                                    className={`text-sm font-bold ${isActive ? "text-zinc-900" : "text-zinc-400"}`}
                                  >
                                    {course.name}
                                  </p>
                                  {!isActive && (
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] h-4 px-1 border-zinc-200 text-zinc-400 font-normal"
                                    >
                                      {course.status === "draft"
                                        ? "草稿"
                                        : "已归档"}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-tighter">
                                  {course.code}
                                </p>
                              </div>

                              {isActive ? (
                                <Button
                                  size="sm"
                                  className="rounded-full bg-zinc-900 text-white px-4 h-8 text-xs font-bold hover:scale-105 transition-transform"
                                  onClick={() =>
                                    linkCourseMutation.mutate({
                                      courseId: course.id,
                                      classId,
                                      semester: "Spring",
                                      year: 2026,
                                    })
                                  }
                                  disabled={linkCourseMutation.isPending}
                                >
                                  {linkCourseMutation.isPending ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    "关联"
                                  )}
                                </Button>
                              ) : (
                                <div className="text-[10px] font-bold text-rose-400/80 px-2 text-right leading-tight max-w-[80px]">
                                  无法关联
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="py-10 text-center text-zinc-300 text-xs font-medium">
                          未找到可关联的课程
                        </div>
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </header>

        {/* 内容区域：flex-1 并 overflow-hidden */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-6 overflow-hidden flex flex-col lg:flex-row gap-8">
          {/* 左侧主体：占据大部分空间，自身包含滚动条 */}
          <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
            <Tabs
              defaultValue="students"
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="flex-none flex items-center justify-between mb-6">
                <TabsList className="bg-gray-200/50 p-1 rounded-xl h-10 border-none">
                  <TabsTrigger
                    value="students"
                    className="rounded-lg px-6 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    学生名册
                  </TabsTrigger>
                  <TabsTrigger
                    value="courses"
                    className="rounded-lg px-6 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    教学关联
                  </TabsTrigger>
                </TabsList>

                <div className="relative group w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input
                    placeholder="快速检索..."
                    className="pl-9 bg-white border-none rounded-xl h-10 text-sm shadow-sm"
                    value={studentSearch}
                    onChange={e => {
                      setStudentSearch(e.target.value);
                      setStudentPage(1);
                    }}
                  />
                </div>
              </div>

              {/* 学生名册滚动容器 */}
              <TabsContent
                value="students"
                className="flex-1 mt-0 overflow-hidden flex flex-col"
              >
                <div className="flex-1 bg-white rounded-[24px] border border-gray-200/50 shadow-sm flex flex-col overflow-hidden">
                  {/* 固定列表头 */}
                  <div className="flex-none px-6 py-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                    <div className="flex items-center gap-4">
                      <Checkbox
                        checked={
                          selectedIds.length === pagedStudents.length &&
                          pagedStudents.length > 0
                        }
                        onCheckedChange={handleToggleAll}
                        className="rounded-[4px]"
                      />
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                        {selectedIds.length > 0
                          ? `已选 ${selectedIds.length} 项`
                          : `学生列表 (${filteredStudents.length})`}
                      </span>
                    </div>
                    {selectedIds.length > 0 && (
                      <Button
                        variant="ghost"
                        className="h-8 text-xs text-red-500 font-bold"
                        onClick={() => {
                          setPendingDeleteIds(selectedIds);
                          setIsConfirmOpen(true);
                        }}
                      >
                        批量移除
                      </Button>
                    )}
                  </div>

                  {/* 核心：列表纵向滚动 */}
                  <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
                    {pagedStudents.map(s => (
                      <div
                        key={s.id}
                        className="group flex items-center px-6 py-4 hover:bg-blue-50/20 transition-all"
                      >
                        <Checkbox
                          checked={selectedIds.includes(s.studentId)}
                          onCheckedChange={() =>
                            setSelectedIds(prev =>
                              prev.includes(s.studentId)
                                ? prev.filter(id => id !== s.studentId)
                                : [...prev, s.studentId]
                            )
                          }
                          className="mr-6 rounded-[4px]"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{s.name}</p>
                          <p className="text-[10px] font-mono text-gray-400 mt-0.5">
                            {s.studentId}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 h-8 w-8 rounded-full text-gray-300 hover:text-red-500"
                          onClick={() => {
                            setPendingDeleteIds([s.studentId]);
                            setIsConfirmOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* 固定页码 */}
                  <div className="flex-none px-6 py-3 flex items-center justify-between border-t border-gray-50 bg-gray-50/20">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">
                      Page {studentPage} / {studentTotalPages || 1}
                    </p>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg"
                        disabled={studentPage === 1}
                        onClick={() => setStudentPage(p => p - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg"
                        disabled={studentPage >= studentTotalPages}
                        onClick={() => setStudentPage(p => p + 1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* 教学关联滚动容器 */}
              <TabsContent
                value="courses"
                className="flex-1 mt-0 overflow-y-auto pr-2"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                  {linkedCourses?.map((course: any) => (
                    <div
                      key={course.id}
                      className="bg-white p-5 rounded-[22px] border border-gray-100 shadow-sm hover:shadow-md transition-all group flex justify-between items-start"
                    >
                      <div className="space-y-1">
                        <Badge className="bg-blue-50 text-blue-600 border-none text-[9px] font-bold rounded-md px-1.5 py-0 mb-2">
                          {course.semester}
                        </Badge>
                        <h4 className="font-bold text-[#1D1D1F] tracking-tight">
                          {course.name}
                        </h4>
                        <p className="text-[10px] font-mono text-gray-400 uppercase tracking-tighter">
                          {course.code}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full text-gray-300 hover:bg-red-50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        onClick={() => {
                          setPendingUnlinkCourse(course);
                          setIsUnlinkConfirmOpen(true);
                        }}
                      >
                        <LinkIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* 右侧边栏：在移动端或大屏上固定或随页面分布 */}
          <aside className="lg:w-80 flex-none space-y-6 h-full overflow-y-auto pb-10 scrollbar-hide">
            <div className="bg-white rounded-[24px] p-6 border border-gray-200/50 shadow-sm">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <Info className="h-3 w-3" /> Class Meta
              </h3>
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                    <GraduationCap className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-400 font-bold uppercase">
                      Major
                    </p>
                    <p className="text-xs font-bold leading-none mt-1">
                      {classInfo?.major}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-400 font-bold uppercase">
                      Academic Year
                    </p>
                    <p className="text-xs font-bold leading-none mt-1">
                      {classInfo?.grade} 级
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-400 font-bold uppercase">
                      Enrollment
                    </p>
                    <p className="text-xs font-bold leading-none mt-1">
                      {allStudents?.length || 0} Students
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-black rounded-[24px] p-6 text-white overflow-hidden relative shadow-lg shadow-black/10">
              <div className="absolute -right-4 -bottom-4 opacity-10">
                <LayoutGrid className="h-24 w-24" />
              </div>
              <h4 className="font-bold text-sm mb-2 font-sans">数据同步助手</h4>
              <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                导入时请使用 [学号 姓名]
                格式。系统会自动匹配已有用户，若不存在将自动为您创建账号。
              </p>
            </div>
          </aside>
        </main>
      </div>

      {/* --- 弹窗区域 --- */}
      {/* --- 批量导入弹窗 --- */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="rounded-[28px] p-8 border-none shadow-2xl bg-white/95 backdrop-blur-xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight">
              批量导入学生名册
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400 mt-1">
              支持空格分隔学号与姓名，每行一位学生。
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            <div className="relative group">
              {/* 核心修改：设置 max-h 并开启 overflow-y-auto，配合自定义滚动条 */}
              <Textarea
                placeholder="2026001 张三&#10;2026002 李四&#10;..."
                className="min-h-[260px] max-h-[400px] overflow-y-auto bg-zinc-100/50 border-none rounded-[20px] p-5 font-mono text-[13px] leading-relaxed focus-visible:ring-2 focus-visible:ring-blue-500/20 resize-none custom-scrollbar"
                value={importText}
                onChange={e => setImportText(e.target.value)}
              />
              {/* 装饰性的计数器 */}
              <div className="absolute bottom-4 right-4 text-[10px] font-bold text-zinc-300 pointer-events-none uppercase tracking-widest">
                {importText.split("\n").filter(l => l.trim()).length} Students
                detected
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setIsImportOpen(false);
                setImportText("");
              }}
              className="rounded-full flex-1 font-semibold h-12 text-zinc-400 hover:text-zinc-600"
            >
              取消
            </Button>
            <Button
              onClick={handleBatchImport}
              disabled={importMutation.isPending || !importText.trim()}
              className="bg-zinc-900 hover:bg-black text-white rounded-full flex-1 font-semibold h-12 shadow-lg shadow-zinc-200 transition-all active:scale-95"
            >
              {importMutation.isPending ? (
                <Loader2 className="animate-spin h-4 w-4" />
              ) : (
                "开始同步数据"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 添加全局样式用于滚动条优化 */}
      <style>{`
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 10px;
    border: 2px solid transparent;
    background-clip: content-box;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.2);
    background-clip: content-box;
  }
`}</style>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent className="rounded-[24px] border-none p-8">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">
              确认移除学生？
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              此操作会将学生从本行政班级中移除，但不会注销学生的系统账号。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full border-none bg-gray-100 font-semibold h-10">
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                removeMutation.mutate({ studentIds: pendingDeleteIds })
              }
              className="rounded-full bg-red-500 hover:bg-red-600 text-white font-semibold h-10"
            >
              确认移除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isUnlinkConfirmOpen}
        onOpenChange={setIsUnlinkConfirmOpen}
      >
        <AlertDialogContent className="rounded-[24px] border-none p-8">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">
              解除教学关联
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-gray-500">
              确定要解绑课程{" "}
              <span className="font-bold text-black italic">
                “{pendingUnlinkCourse?.name}”
              </span>{" "}
              吗？ 解除后，学生将无法再访问课程。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full border-none bg-gray-100 font-semibold h-10">
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                pendingUnlinkCourse &&
                unlinkMutation.mutate({
                  courseId: pendingUnlinkCourse.id,
                  classId,
                })
              }
              className="rounded-full bg-black text-white font-semibold h-10"
            >
              确认解除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
