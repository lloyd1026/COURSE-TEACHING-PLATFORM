import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { 
  FileText, Loader2, ChevronRight, 
  Clock, CalendarDays, Inbox, AlertCircle
} from "lucide-react";

// --- 引入新版组件 ---
import { SearchFilterBar } from "@/components/common/SearchFilterBar"; // 替换旧的 FilterSearch
import { FilterTabs } from "@/components/common/FilterGroup";
import { Pagination } from "@/components/common/Pagination";

export default function StudentAssignmentList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  const { data: assignments, isLoading } = trpc.assignments.list.useQuery();

  // 状态解析
  const getAssignmentStatus = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    return { isOverdue: due < now, due };
  };

  // 筛选逻辑 (search 确认后触发)
  const filteredAssignments = useMemo(() => {
    return (assignments || []).filter((a: any) => {
      const matchSearch = !search || a.title.toLowerCase().includes(search.toLowerCase());
      // 后续可结合 submission 状态进行 statusFilter 过滤
      return matchSearch;
    });
  }, [assignments, search]);

  const pagedAssignments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAssignments.slice(start, start + pageSize);
  }, [filteredAssignments, currentPage]);

  // 筛选条件变化重置页码
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
      {/* 极简背景装饰 - 保持 UI 不变 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-5%] left-[-5%] w-[500px] h-[500px] bg-blue-50/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-5%] w-[400px] h-[400px] bg-indigo-50/20 rounded-full blur-[100px]" />
      </div>

      <div className="relative h-[calc(100vh-4rem)] flex flex-col max-w-6xl mx-auto px-6 py-8 overflow-hidden text-zinc-900">
        
        <header className="flex-shrink-0 flex justify-between items-end mb-10">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 selection:bg-zinc-100">任务中心</h1>
            <p className="text-zinc-400 text-[11px] mt-1 tracking-widest uppercase font-bold">Assignments & Tasks</p>
          </div>
          <div className="hidden md:flex items-center gap-2 bg-white/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/60 shadow-sm">
            <Inbox className="h-3.5 w-3.5 text-zinc-400" />
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">
              {filteredAssignments.length} 个任务
            </span>
          </div>
        </header>

        {/* 筛选区域：搜索框在上，标签在下 */}
        <div className="flex-shrink-0 space-y-6 mb-8">
          <div className="max-w-xl">
            <SearchFilterBar 
              onSearch={setSearch} 
              placeholder="搜索作业标题关键字..." 
            />
          </div>

          <FilterTabs 
            options={[
              { label: "全部任务", value: "all" },
              { label: "进行中", value: "pending" },
              { label: "已提交", value: "submitted" },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        </div>

        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
          {pagedAssignments.length > 0 ? (
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 pb-10">
              {pagedAssignments.map((a: any) => {
                const { isOverdue, due } = getAssignmentStatus(a.dueDate);
                return (
                  <div key={a.id} className="group relative bg-white/40 backdrop-blur-xl border border-white/80 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl hover:bg-white hover:border-zinc-200 transition-all duration-300 flex flex-col sm:flex-row gap-6">
                    <div className={`h-16 w-16 flex-shrink-0 rounded-[1.5rem] flex items-center justify-center transition-all duration-300 ${
                      isOverdue ? 'bg-rose-50 text-rose-500' : 'bg-zinc-50 text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white'
                    }`}>
                      <FileText className="h-8 w-8" />
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-[17px] font-bold text-zinc-900 leading-tight group-hover:text-black">{a.title}</h3>
                        {isOverdue && (
                          <Badge className="bg-rose-50 text-rose-500 border-none text-[9px] font-black uppercase px-2 rounded-full">EXPIRED</Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-zinc-400">
                        <div className="flex items-center gap-1.5 text-[12px] font-bold text-zinc-500 uppercase tracking-tighter">
                          <CalendarDays className="h-3.5 w-3.5 text-zinc-300" /> {a.courseName || '课程作业'}
                        </div>
                        <div className={`flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-tighter ${isOverdue ? 'text-rose-400' : 'text-zinc-500'}`}>
                          <Clock className="h-3.5 w-3.5 text-zinc-300" /> {due.toLocaleDateString()} 截止
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <Link href={`/student/assignments/${a.id}`}>
                        <Button className="rounded-full bg-zinc-900 text-white h-11 px-8 text-[12px] font-bold shadow-lg hover:bg-black hover:scale-105 transition-all active:scale-95 group/btn">
                          查看详情
                          <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-24 text-center">
              <div className="h-20 w-20 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="h-8 w-8 text-zinc-200" />
              </div>
              <p className="text-[11px] text-zinc-300 tracking-widest uppercase font-black">No Assignments Found</p>
            </div>
          )}
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

      <style dangerouslySetInnerHTML={{ __html: `.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }` }} />
    </DashboardLayout>
  );
}