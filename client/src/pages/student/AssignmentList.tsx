import { useState, useMemo } from "react";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { 
  FileText, Loader2, ChevronRight, 
  Clock, CalendarDays, Inbox, AlertCircle
} from "lucide-react";

// 严格使用你的组件定义
import { FilterSearch, FilterTabs } from "@/components/common/FilterGroup";
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

  const filteredAssignments = useMemo(() => {
    return (assignments || []).filter((a: any) => {
      const matchSearch = a.title.toLowerCase().includes(search.toLowerCase());
      // 后续可结合 submission 状态进行 statusFilter 过滤
      return matchSearch;
    });
  }, [assignments, search]);

  const pagedAssignments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAssignments.slice(start, start + pageSize);
  }, [filteredAssignments, currentPage]);

  if (isLoading) return (
    <div className="h-screen flex items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-zinc-300" />
    </div>
  );

  return (
    <DashboardLayout>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-5%] left-[-5%] w-[500px] h-[500px] bg-blue-50/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-5%] w-[400px] h-[400px] bg-indigo-50/20 rounded-full blur-[100px]" />
      </div>

      <div className="relative h-[calc(100vh-4rem)] flex flex-col max-w-6xl mx-auto px-6 py-8 overflow-hidden">
        
        <header className="flex-shrink-0 flex justify-between items-end mb-10">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">任务中心</h1>
            <p className="text-zinc-400 text-[11px] mt-1 tracking-widest uppercase font-bold">Assignments & Tasks</p>
          </div>
          <div className="hidden md:flex items-center gap-2 bg-white/40 backdrop-blur-md px-4 py-1.5 rounded-2xl border border-white/60 shadow-sm">
            <Inbox className="h-3.5 w-3.5 text-zinc-400" />
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">
              {filteredAssignments.length} 个任务
            </span>
          </div>
        </header>

        {/* 适配你的组件定义 */}
        <div className="flex-shrink-0 flex flex-wrap items-center gap-4 mb-8">
          <FilterSearch 
            value={search} 
            onChange={setSearch} 
            placeholder="搜索作业标题..." 
          />
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
                  <div key={a.id} className="group relative bg-white/40 backdrop-blur-xl border border-white/80 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl hover:bg-white/80 transition-all duration-300 flex flex-col sm:flex-row gap-6">
                    <div className={`h-16 w-16 flex-shrink-0 rounded-[1.5rem] flex items-center justify-center transition-all ${
                      isOverdue ? 'bg-rose-50 text-rose-500' : 'bg-zinc-50 text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white'
                    }`}>
                      <FileText className="h-8 w-8" />
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-[17px] font-semibold text-zinc-900 leading-tight">{a.title}</h3>
                        {isOverdue && (
                          <Badge className="bg-rose-50 text-rose-500 border-none text-[9px] font-bold uppercase px-2 rounded-full">EXPIRED</Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-zinc-400">
                        <div className="flex items-center gap-1.5 text-[12px] font-medium text-zinc-500">
                          <CalendarDays className="h-3.5 w-3.5 text-zinc-300" /> {a.courseName || '课程作业'}
                        </div>
                        <div className={`flex items-center gap-1.5 text-[12px] font-medium ${isOverdue ? 'text-rose-400' : 'text-zinc-500'}`}>
                          <Clock className="h-3.5 w-3.5 text-zinc-300" /> {due.toLocaleDateString()} 截止
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <Link href={`/student/assignments/${a.id}`}>
                        <Button className="rounded-full bg-zinc-900 text-white h-11 px-8 text-[13px] font-medium shadow-lg hover:scale-105 active:scale-95 transition-all group/btn">
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
              <div className="h-20 w-20 bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-6 border border-white/60">
                <AlertCircle className="h-8 w-8 text-zinc-200" />
              </div>
              <p className="text-[11px] text-zinc-300 tracking-widest uppercase font-bold">没有找到相关作业任务</p>
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

      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 3px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }`}</style>
    </DashboardLayout>
  );
}