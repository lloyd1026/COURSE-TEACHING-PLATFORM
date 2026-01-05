"use client";

import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { BookOpen, Calendar, Hash, Layers, Loader2 } from "lucide-react";
// ⚡️ 引入你的通用组件
import { Pagination } from "@/components/common/Pagination";
import { SearchFilterBar } from "@/components/common/SearchFilterBar";

export default function CourseList() {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // 请求数据时传入搜索关键字
  const { data: courses, isLoading } = trpc.courses.list.useQuery({ search });

  // 1. 状态标签配置
  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      published: { label: "已发布", className: "bg-emerald-50 text-emerald-600 border-emerald-100" },
      draft: { label: "草稿", className: "bg-zinc-100 text-zinc-500 border-zinc-200" },
      archived: { label: "已归档", className: "bg-rose-50 text-rose-600 border-rose-100" },
    };
    const item = config[status] || config.draft;
    return (
      <Badge variant="outline" className={`${item.className} border rounded-lg px-2 py-0.5 font-black text-[10px]`}>
        {item.label}
      </Badge>
    );
  };

  // 2. ⚡️ 前端分页切片逻辑
  const paginatedCourses = useMemo(() => {
    if (!courses) return [];
    const start = (currentPage - 1) * pageSize;
    return courses.slice(start, start + pageSize);
  }, [courses, currentPage]);

  // 3. ⚡️ 搜索触发逻辑
  const handleSearch = (value: string) => {
    setSearch(value);
    setCurrentPage(1); // 搜索新内容时务必重置页码到第一页
  };

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-100 pb-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge className="bg-zinc-900 text-white border-none rounded-lg text-[10px] font-black px-2 py-0.5">ACADEMIC DATA</Badge>
              <div className="h-1 w-1 rounded-full bg-zinc-300" />
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Matrix Management</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-zinc-900">课程矩阵</h1>
            <p className="text-zinc-500 mt-2 font-medium">全域教学课程档案的维护与生命周期管理</p>
          </div>
          
          {/* ⚡️ 集成你的 SearchFilterBar 组件 */}
          <div className="w-full md:w-[480px]">
            <SearchFilterBar 
              onSearch={handleSearch} 
              placeholder="搜索课程名称、代码或关键字..." 
              initialValue={search}
            />
          </div>
        </div>

        <Card className="border-none shadow-sm bg-white rounded-[3rem] overflow-hidden">
          <CardHeader className="p-10 border-b border-zinc-50">
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-500" />
              课程全量明细台账
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-zinc-200" />
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">正在解析档案数据结构...</p>
              </div>
            ) : !courses || courses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="h-16 w-16 bg-zinc-50 rounded-full flex items-center justify-center mb-4">
                  <BookOpen className="h-8 w-8 text-zinc-200" />
                </div>
                <p className="text-zinc-400 font-bold">未检索到匹配的课程数据</p>
                <button onClick={() => handleSearch("")} className="text-xs font-black text-indigo-500 mt-2 hover:underline">重置搜索条件</button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-zinc-50/30">
                      <TableRow className="hover:bg-transparent border-none">
                        <TableHead className="w-24 pl-10 text-[10px] font-black uppercase text-zinc-400 tracking-widest">索引 ID</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">课程名称 (Name)</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">课程代码 (Code)</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-zinc-400 tracking-widest text-center">学分 (Pts)</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">发布状态</TableHead>
                        <TableHead className="pr-10 text-[10px] font-black uppercase text-zinc-400 tracking-widest text-right">创建日期</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedCourses.map((course: any) => (
                        <TableRow key={course.id} className="group hover:bg-zinc-50/50 border-zinc-50 transition-all">
                          <TableCell className="pl-10 font-mono text-xs text-zinc-400">#{course.id}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-2xl bg-zinc-900 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                <BookOpen className="h-5 w-5 text-white" />
                              </div>
                              <span className="font-black text-zinc-900 text-sm">{course.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-zinc-500 font-bold bg-zinc-100/50 w-fit px-3 py-1 rounded-lg border border-zinc-100">
                              <Hash className="h-3 w-3 text-zinc-300" />
                              <span className="tracking-tighter text-xs">{course.code}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-black text-zinc-900 text-base">{course.credits}</TableCell>
                          <TableCell>{getStatusBadge(course.status)}</TableCell>
                          <TableCell className="pr-10 text-right">
                            <div className="flex items-center justify-end gap-2 text-xs font-bold text-zinc-400">
                              <Calendar className="h-3.5 w-3.5" />
                              {course.createdAt ? new Date(course.createdAt).toLocaleDateString("zh-CN") : "-"}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* ⚡️ 分页组件：对齐接口 (totalItems) */}
                <div className="px-10 py-6 border-t border-zinc-50 bg-zinc-50/10">
                  <Pagination
                    currentPage={currentPage}
                    totalItems={courses.length}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}