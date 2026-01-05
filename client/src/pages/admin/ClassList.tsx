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
import { 
  GraduationCap, 
  Calendar, 
  Users, 
  School, 
  Loader2, 
  LayoutGrid,
  SearchCode
} from "lucide-react";
// ⚡️ 引入你的通用组件
import { Pagination } from "@/components/common/Pagination";
import { SearchFilterBar } from "@/components/common/SearchFilterBar";

export default function ClassList() {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // ⚡️ 保持原 API 不变：调用 trpc.classes.list 接口
  const { data: classes, isLoading } = trpc.classes.list.useQuery();

  // 1. ⚡️ 前端过滤逻辑：在 API 不支持搜索参数时，通过前端进行过滤
  const filteredClasses = useMemo(() => {
    if (!classes) return [];
    if (!search) return classes;
    const s = search.toLowerCase();
    return classes.filter(cls => 
      cls.name.toLowerCase().includes(s) || 
      (cls.major && cls.major.toLowerCase().includes(s)) ||
      cls.grade?.toString().includes(s)
    );
  }, [classes, search]);

  // 2. ⚡️ 前端分页逻辑
  const paginatedClasses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredClasses.slice(start, start + pageSize);
  }, [filteredClasses, currentPage]);

  // 3. ⚡️ 搜索触发逻辑
  const handleSearch = (value: string) => {
    setSearch(value);
    setCurrentPage(1); // 搜索时重置页码
  };

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-100 pb-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge className="bg-orange-500 text-white border-none rounded-lg text-[10px] font-black px-2 py-0.5">STRUCTURE</Badge>
              <div className="h-1 w-1 rounded-full bg-zinc-300" />
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Classroom Assets</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-zinc-900">班级管理</h1>
            <p className="text-zinc-500 mt-2 font-medium">管理系统中所有行政班级档案</p>
          </div>
          
          <div className="w-full md:w-[480px]">
            <SearchFilterBar 
              onSearch={handleSearch} 
              placeholder="在当前列表中搜索班级、专业..." 
              initialValue={search}
            />
          </div>
        </div>

        <Card className="border-none shadow-sm bg-white rounded-[3rem] overflow-hidden">
          <CardHeader className="p-10 border-b border-zinc-50">
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-orange-500" />
              全域行政班级明细
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-zinc-200" />
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">正在检索组织架构...</p>
              </div>
            ) : filteredClasses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="h-16 w-16 bg-zinc-50 rounded-full flex items-center justify-center mb-4 text-zinc-200">
                  <SearchCode className="h-8 w-8" />
                </div>
                <p className="text-zinc-400 font-bold">未找到匹配的班级记录</p>
                <button onClick={() => handleSearch("")} className="text-xs font-black text-orange-500 mt-2 hover:underline">返回完整列表</button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-zinc-50/30">
                      <TableRow className="hover:bg-transparent border-none">
                        <TableHead className="w-24 pl-10 text-[10px] font-black uppercase text-zinc-400 tracking-widest">索引 ID</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">班级名称 (Class Name)</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">年级 (Grade)</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">专业领域 (Major)</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-zinc-400 tracking-widest text-center">学生人数</TableHead>
                        <TableHead className="pr-10 text-[10px] font-black uppercase text-zinc-400 tracking-widest text-right">创建日期</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedClasses.map((cls: any) => (
                        <TableRow key={cls.id} className="group hover:bg-zinc-50/50 border-zinc-50 transition-all">
                          <TableCell className="pl-10 font-mono text-xs text-zinc-400">#{cls.id}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-2xl bg-zinc-900 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                <GraduationCap className="h-5 w-5 text-white" />
                              </div>
                              <span className="font-black text-zinc-900 text-sm">{cls.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-zinc-100 text-zinc-600 border-zinc-200 px-3 py-1 rounded-lg font-black text-[10px] shadow-none">
                              {cls.grade} 级
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-zinc-500 font-bold">
                              <School className="h-3.5 w-3.5 text-zinc-300" />
                              <span className="text-xs">{cls.major || "通用学科"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-600 px-3 py-1 rounded-full font-black text-xs">
                              <Users className="h-3 w-3" />
                              {cls.studentCount || 0}
                            </div>
                          </TableCell>
                          <TableCell className="pr-10 text-right">
                            <div className="flex items-center justify-end gap-2 text-xs font-bold text-zinc-400">
                              <Calendar className="h-3.5 w-3.5" />
                              {cls.createdAt ? new Date(cls.createdAt).toLocaleDateString("zh-CN") : "-"}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* ⚡️ 底部应用分页组件 */}
                <div className="px-10 py-6 border-t border-zinc-50 bg-zinc-50/10">
                  <Pagination
                    currentPage={currentPage}
                    totalItems={filteredClasses.length}
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