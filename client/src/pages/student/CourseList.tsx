import { useState, useMemo } from "react";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { 
  BookOpen, Loader2, ChevronRight, 
  Star, GraduationCap, LayoutGrid 
} from "lucide-react";

// 引入你已经抽象好的通用组件
import { FilterSearch } from "@/components/common/FilterGroup";
import { Pagination } from "@/components/common/Pagination";

export default function StudentCourseList() {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  const { data: courses, isLoading } = trpc.courses.list.useQuery();

  // 筛选逻辑
  const filteredCourses = useMemo(() => {
    return (courses || []).filter((course: any) =>
      course.name.toLowerCase().includes(search.toLowerCase()) ||
      course.code?.toLowerCase().includes(search.toLowerCase())
    );
  }, [courses, search]);

  // 分页切片
  const pagedCourses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCourses.slice(start, start + pageSize);
  }, [filteredCourses, currentPage]);

  if (isLoading) return (
    <div className="h-screen flex items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-zinc-300" />
    </div>
  );

  return (
    <DashboardLayout>
      {/* 极简背景装饰 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-5%] left-[-5%] w-[500px] h-[500px] bg-blue-50/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-5%] w-[400px] h-[400px] bg-indigo-50/20 rounded-full blur-[100px]" />
      </div>

      <div className="relative h-[calc(100vh-4rem)] flex flex-col max-w-6xl mx-auto px-6 py-8 overflow-hidden">
        
        {/* 页头：保持苹果味 */}
        <header className="flex-shrink-0 flex justify-between items-end mb-10">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">我的课程</h1>
            <p className="text-zinc-400 text-[11px] mt-1 tracking-widest uppercase">
              本学期已加入的学习任务
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 bg-white/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/60 shadow-sm">
            <GraduationCap className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Academic Year 2026</span>
          </div>
        </header>

        {/* 使用通用的 FilterSearch */}
        <div className="flex-shrink-0 mb-8">
          <FilterSearch 
            value={search} 
            onChange={(val) => { setSearch(val); setCurrentPage(1); }} 
            placeholder="搜索课程名称或编号..." 
          />
        </div>

        {/* 课程网格：大圆角 + 悬浮感 */}
        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
          {pagedCourses.length > 0 ? (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 pb-10">
              {pagedCourses.map((course: any) => (
                <div 
                  key={course.id}
                  className="group relative bg-white/40 backdrop-blur-xl border border-white/80 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl hover:bg-white/80 hover:scale-[1.02] transition-all duration-300 flex flex-col h-full"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white transition-all shadow-inner">
                      <BookOpen className="h-6 w-6" />
                    </div>
                    <Badge className="bg-emerald-50 text-emerald-600 border-none rounded-full px-3 py-0.5 text-[10px] font-medium uppercase tracking-tighter">
                      学习中
                    </Badge>
                  </div>

                  <div className="flex-1">
                    <h3 className="text-[17px] font-semibold text-zinc-900 leading-tight mb-2">
                      {course.name}
                    </h3>
                    <div className="flex items-center gap-3 opacity-60">
                      <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-tight">
                        {course.code || "NO-CODE"}
                      </span>
                      <span className="text-[10px] text-zinc-300">|</span>
                      <span className="text-[11px] font-medium text-zinc-500 flex items-center gap-1">
                        <Star className="h-3 w-3" /> {course.credits || 0} 学分
                      </span>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-zinc-100/50">
                    <Link href={`/student/courses/${course.id}`}>
                      <Button className="w-full rounded-full bg-zinc-900 text-white h-11 text-[13px] font-medium shadow-lg hover:bg-zinc-800 transition-all active:scale-[0.97] group/btn">
                        继续学习
                        <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-24 text-center">
              <div className="h-20 w-20 bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-6 border border-white/60">
                <LayoutGrid className="h-8 w-8 text-zinc-200" />
              </div>
              <p className="text-[11px] text-zinc-300 tracking-widest uppercase font-bold">目前没有已加入的课程</p>
            </div>
          )}
        </div>

        {/* 使用通用的 Pagination */}
        <div className="flex-none mt-4">
          <Pagination 
            currentPage={currentPage}
            totalItems={filteredCourses.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
      `}</style>
    </DashboardLayout>
  );
}