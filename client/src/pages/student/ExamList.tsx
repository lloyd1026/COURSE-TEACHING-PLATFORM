import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { 
  Search, ClipboardList, Loader2, Calendar, 
  Timer, ChevronRight, Trophy, BookOpen, Clock, Activity, CheckCircle2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// 引用通用组件
import { SearchFilterBar } from "@/components/common/SearchFilterBar";
import { FilterTabs } from "@/components/common/FilterGroup";
import { Pagination } from "@/components/common/Pagination";

export default function StudentExamList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [now, setNow] = useState(new Date()); // 用于实时刷新考试按钮状态
  const pageSize = 6;

  // 每分钟更新一次当前时间，确保状态准时切换
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // 1. 获取考试列表
  const { data: exams, isLoading } = trpc.exams.list.useQuery();

  // 2. 状态配置
  const STATUS_CONFIG: any = {
    all: { label: "全部考试" },
    not_started: { label: "未开始", color: "text-blue-500", bg: "bg-blue-50/50", icon: Clock },
    in_progress: { label: "进行中", color: "text-emerald-500", bg: "bg-emerald-50/50", icon: Activity },
    ended: { label: "已结束", color: "text-zinc-400", bg: "bg-zinc-100/50", icon: CheckCircle2 },
  };

  // 3. 筛选逻辑
  const filteredExams = useMemo(() => {
    return (exams || []).filter((e: any) => {
      const matchSearch = !search || e.title.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || e.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [exams, search, statusFilter]);

  const pagedExams = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredExams.slice(start, start + pageSize);
  }, [filteredExams, currentPage]);

  if (isLoading) return (
    <div className="h-screen flex items-center justify-center bg-[#F5F5F7]">
      <Loader2 className="h-6 w-6 animate-spin text-zinc-300" />
    </div>
  );

  return (
    <DashboardLayout>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-50/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative h-[calc(100vh-4rem)] flex flex-col max-w-5xl mx-auto px-8 py-10 overflow-hidden font-sans">
        
        {/* Header */}
        <header className="flex-shrink-0 flex justify-between items-end mb-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">我的考试</h1>
            <p className="text-zinc-400 text-[10px] mt-2 tracking-[0.3em] uppercase font-black">Examination & Performance</p>
          </div>
        </header>

        {/* 筛选区 */}
        <div className="flex-shrink-0 space-y-6 mb-10">
          <SearchFilterBar onSearch={setSearch} placeholder="搜索考试标题或课程..." />
          <FilterTabs
            value={statusFilter}
            onChange={setStatusFilter}
            options={Object.entries(STATUS_CONFIG).map(([key, cfg]: any) => ({
              label: cfg.label,
              value: key,
            }))}
          />
        </div>

        {/* 列表内容 */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-10">
          {pagedExams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pagedExams.map((exam: any) => {
                const status = STATUS_CONFIG[exam.status] || STATUS_CONFIG.not_started;
                
                // 时间逻辑判定
                const startTime = new Date(exam.startTime);
                const endTime = new Date(startTime.getTime() + exam.duration * 60000);
                
                // 核心业务判定
                const isOngoing = now >= startTime && now <= endTime;
                const canTake = isOngoing && exam.status !== 'ended'; // 在时间内且未被手动封盘
                const isResultReady = exam.status === 'ended' && exam.resultsPublished === true;

                return (
                  <div 
                    key={exam.id} 
                    className="group relative bg-white/70 backdrop-blur-2xl border border-white/60 rounded-[2.5rem] p-7 shadow-sm hover:shadow-xl hover:bg-white transition-all duration-500 flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <Badge className={`rounded-full border-none px-4 py-1 text-[10px] font-black uppercase tracking-widest ${status.bg} ${status.color}`}>
                          {status.label}
                        </Badge>
                        <div className="h-10 w-10 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-300 group-hover:bg-zinc-900 group-hover:text-white transition-all shadow-inner">
                          <Trophy className="h-5 w-5" />
                        </div>
                      </div>

                      <div>
                        <h4 className="text-lg font-bold text-zinc-800 line-clamp-1 mb-1">{exam.title}</h4>
                        <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-tighter flex items-center gap-1.5">
                          <BookOpen className="h-3 w-3" /> {exam.courseName}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="flex items-center gap-2 text-zinc-500">
                          <Calendar className="h-4 w-4 opacity-40" />
                          <span className="text-[11px] font-bold">{startTime.toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-500">
                          <Timer className="h-4 w-4 opacity-40" />
                          <span className="text-[11px] font-bold">{exam.duration} 分钟</span>
                        </div>
                      </div>
                    </div>

                    {/* 操作区 */}
                    <div className="mt-8 pt-6 border-t border-zinc-100/50 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-zinc-300 uppercase">考试时间</span>
                        <span className="text-[11px] font-bold text-zinc-600">
                          {startTime.getHours().toString().padStart(2, '0')}:{startTime.getMinutes().toString().padStart(2, '0')} 
                          - 
                          {endTime.getHours().toString().padStart(2, '0')}:{endTime.getMinutes().toString().padStart(2, '0')}
                        </span>
                      </div>
                      
                      {/* 根据你提供的路由逻辑进行动态跳转 */}
                      {canTake ? (
                        <Link href={`/student/exams/${exam.id}/take`}>
                          <Button className="rounded-full px-6 h-10 text-[11px] font-black uppercase tracking-widest bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-100 animate-pulse transition-all">
                            参加考试
                            <ChevronRight className="ml-1.5 h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      ) : isResultReady ? (
                        <Link href={`/student/exams/${exam.id}`}>
                          <Button className="rounded-full px-6 h-10 text-[11px] font-black uppercase tracking-widest bg-zinc-900 text-white hover:bg-black transition-all">
                            查看解析
                            <ChevronRight className="ml-1.5 h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      ) : (
                        <Button disabled className="rounded-full px-6 h-10 text-[11px] font-black uppercase tracking-widest bg-zinc-100 text-zinc-300 border-none cursor-not-allowed">
                          {now < startTime ? "尚未开始" : "阅卷发布中"}
                        </Button>
                      )}
                    </div>

                    {/* 进行中状态的呼吸灯 */}
                    {canTake && (
                      <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-zinc-300 space-y-4">
              <ClipboardList className="h-12 w-12 opacity-10" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em]">暂无相关考试</p>
            </div>
          )}
        </div>

        {/* 分页 */}
        <div className="flex-none mt-6">
          <Pagination
            currentPage={currentPage}
            totalItems={filteredExams.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
      `}} />
    </DashboardLayout>
  );
}