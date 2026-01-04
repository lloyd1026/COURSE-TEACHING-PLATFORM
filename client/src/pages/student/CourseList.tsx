import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { 
  BookOpen, Loader2, ChevronRight, 
  Star, GraduationCap, LayoutGrid 
} from "lucide-react";

// --- 引入新版组件 ---
import { SearchFilterBar } from "@/components/common/SearchFilterBar"; // 1. 替换旧的 FilterSearch
import { Pagination } from "@/components/common/Pagination";

export default function StudentCourseList() {
  // 核心改动：搜索状态
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  const { data: courses, isLoading } = trpc.courses.list.useQuery();

  // 筛选逻辑 (search 现在只在 SearchFilterBar 确认后更新)
  const filteredCourses = useMemo(() => {
    return (courses || []).filter((course: any) =>
      !search ||
      course.name.toLowerCase().includes(search.toLowerCase()) ||
      course.code?.toLowerCase().includes(search.toLowerCase())
    );
  }, [courses, search]);

  // 分页切片
  const pagedCourses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCourses.slice(start, start + pageSize);
  }, [filteredCourses, currentPage]);

  // 搜索变化时重置页码
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  if (isLoading) return (
    <div className="h-screen flex items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-zinc-300" />
    </div>
  );

  return (
    <DashboardLayout>
      {/* 极简背景装饰 - 保持 UI 不变 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-5%] left-[-5%] w-[500px] h-[500px] bg-blue-50/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-5%] w-[400px] h-[400px] bg-indigo-50/20 rounded-full blur-[100px]" />
      </div>

      <div className="relative h-[calc(100vh-4rem)] flex flex-col max-w-6xl mx-auto px-6 py-8 overflow-hidden text-zinc-900">
        
        {/* 页头 */}
        <header className="flex-shrink-0 flex justify-between items-end mb-10">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 selection:bg-zinc-100">我的课程</h1>
            <p className="text-zinc-400 text-[11px] mt-1 tracking-widest uppercase font-bold">
              My Academic Syllabus
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 bg-white/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/60 shadow-sm">
            <GraduationCap className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Academic Year 2026</span>
          </div>
        </header>

        {/* 2. 替换为统一的搜索框 */}
        <div className="flex-shrink-0 mb-8 max-w-xl">
          <SearchFilterBar 
            onSearch={setSearch} 
            placeholder="搜索课程名称或课程编号..." 
          />
        </div>

        {/* 课程网格 */}
        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
          {pagedCourses.length > 0 ? (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 pb-10">
              {pagedCourses.map((course: any) => (
                <div 
                  key={course.id}
                  className="group relative bg-white/40 backdrop-blur-xl border border-white/80 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl hover:bg-white hover:border-zinc-200 hover:scale-[1.02] transition-all duration-300 flex flex-col h-full"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="h-12 w-12 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white transition-all duration-300 shadow-inner">
                      <BookOpen className="h-6 w-6" />
                    </div>
                    <Badge className="bg-emerald-50 text-emerald-600 border-none rounded-full px-3 py-0.5 text-[9px] font-black uppercase tracking-tighter">
                      Learning
                    </Badge>
                  </div>

                  <div className="flex-1">
                    <h3 className="text-[17px] font-bold text-zinc-900 leading-tight mb-2 group-hover:text-black transition-colors">
                      {course.name}
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-tight font-bold">
                        {course.code || "N/A"}
                      </span>
                      <span className="text-[10px] text-zinc-200">|</span>
                      <span className="text-[10px] font-black text-zinc-400 flex items-center gap-1 uppercase tracking-widest">
                        <Star className="h-3 w-3 text-amber-400" /> {course.credits || 0} Credits
                      </span>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-zinc-100/50">
                    <Link href={`/student/courses/${course.id}`}>
                      <Button className="w-full rounded-full bg-zinc-900 text-white h-11 text-[12px] font-bold shadow-lg hover:bg-black transition-all active:scale-[0.97] group/btn">
                        继续学习课程
                        <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-24 text-center">
              <div className="h-20 w-20 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <LayoutGrid className="h-8 w-8 text-zinc-200" />
              </div>
              <p className="text-[11px] text-zinc-300 tracking-widest uppercase font-black">No Courses Found</p>
            </div>
          )}
        </div>

        {/* 分页 */}
        <div className="flex-none mt-4">
          <Pagination 
            currentPage={currentPage}
            totalItems={filteredCourses.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
      ` }} />
    </DashboardLayout>
  );
}