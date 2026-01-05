"use client";

import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  Users,
  BookOpen,
  GraduationCap,
  FlaskConical,
  Activity,
  ArrowUpRight,
  UserCheck,
  Calendar,
  Loader2,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
// ⚡️ 引入你提供的分页组件
import { Pagination } from "@/components/common/Pagination";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444"];

export default function AdminDashboard() {
  const { data: stats, isLoading } = trpc.stats.overview.useQuery();
  
  // ⚡️ 分页状态管理
  const [userPage, setUserPage] = useState(1);
  const [coursePage, setCoursePage] = useState(1);
  const pageSize = 5;

  // 1. 顶部统计配置
  const statItems = useMemo(() => [
    { title: "总用户数", value: stats?.userCount || 0, icon: Users, color: "from-indigo-500 to-blue-500" },
    { title: "总课程数", value: stats?.courseCount || 0, icon: BookOpen, color: "from-emerald-500 to-teal-500" },
    { title: "总班级数", value: stats?.classCount || 0, icon: GraduationCap, color: "from-amber-500 to-orange-500" },
    { title: "实验项目", value: stats?.experimentCount || 0, icon: FlaskConical, color: "from-rose-500 to-pink-500" },
  ], [stats]);

  // 2. 前端分页逻辑：用户列表
  const paginatedUsers = useMemo(() => {
    if (!stats?.recentUsers) return [];
    return stats.recentUsers.slice((userPage - 1) * pageSize, userPage * pageSize);
  }, [stats?.recentUsers, userPage]);

  // 3. 前端分页逻辑：课程列表
  const paginatedCourses = useMemo(() => {
    if (!stats?.recentCourses) return [];
    return stats.recentCourses.slice((coursePage - 1) * pageSize, coursePage * pageSize);
  }, [stats?.recentCourses, coursePage]);

  if (isLoading || !stats) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-zinc-200" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">正在同步全域数据...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-100 pb-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge className="bg-zinc-900 text-white border-none rounded-lg text-[10px] font-black px-2 py-0.5">ADMIN ROOT</Badge>
              <div className="h-1 w-1 rounded-full bg-zinc-300" />
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Real-time Analytics</span>
            </div>
            <h2 className="text-4xl font-black tracking-tight text-zinc-900">平台指挥中心</h2>
          </div>
          <div className="flex gap-3">
            <Link href="/admin/users">
              <Button variant="outline" className="h-12 px-6 rounded-2xl border-zinc-200 font-bold hover:bg-zinc-50 transition-all">用户台账</Button>
            </Link>
            <Link href="/admin/courses">
              <Button className="h-12 px-6 rounded-2xl bg-zinc-900 hover:bg-black text-white font-bold shadow-xl transition-all active:scale-95">课程矩阵</Button>
            </Link>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {statItems.map((item) => (
            <Card key={item.title} className="border-none shadow-sm bg-white rounded-[2.5rem] overflow-hidden group hover:shadow-xl transition-all duration-500">
              <CardContent className="p-8">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-8 shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                  <item.icon className="h-7 w-7 text-white" />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.15em]">{item.title}</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-4xl font-black text-zinc-900 tabular-nums">{item.value}</h3>
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Lists with Your Pagination Component */}
        <div className="grid gap-8 md:grid-cols-2">
          
          {/* Recent Users List */}
          <Card className="border-zinc-100 rounded-[3rem] shadow-sm bg-white flex flex-col">
            <CardHeader className="p-10 pb-6 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-indigo-500" /> 注册活跃动态
                </CardTitle>
                <CardDescription className="font-bold text-xs mt-1 text-zinc-400">实时接入的新成员记录</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="px-10 pb-10 flex-1 flex flex-col">
              <div className="space-y-3 min-h-[420px]">
                {paginatedUsers.map((user: any) => (
                  <div key={user.id} className="flex items-center justify-between p-5 rounded-[1.5rem] border border-zinc-50 bg-zinc-50/30 hover:bg-zinc-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-zinc-900 text-white flex items-center justify-center font-black text-sm shadow-md">
                        {user.name?.[0] || "U"}
                      </div>
                      <div>
                        <div className="font-bold text-zinc-900">{user.name}</div>
                        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">@{user.username}</div>
                      </div>
                    </div>
                    <Badge className="bg-white text-zinc-500 border-zinc-100 rounded-lg px-3 py-1 font-black text-[10px] shadow-sm">
                      {user.role.toUpperCase()}
                    </Badge>
                  </div>
                ))}
              </div>
              
              {/* ⚡️ 应用你的分页组件 (对接接口: totalItems) */}
              <div className="mt-8">
                <Pagination 
                  currentPage={userPage}
                  totalItems={stats.recentUsers?.length || 0}
                  pageSize={pageSize}
                  onPageChange={setUserPage}
                />
              </div>
            </CardContent>
          </Card>

          {/* Recent Courses List */}
          <Card className="border-zinc-100 rounded-[3rem] shadow-sm bg-white flex flex-col">
            <CardHeader className="p-10 pb-6 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-amber-500" /> 课程入库记录
                </CardTitle>
                <CardDescription className="font-bold text-xs mt-1 text-zinc-400">最近上架的教学资源矩阵</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="px-10 pb-10 flex-1 flex flex-col">
              <div className="space-y-3 min-h-[420px]">
                {paginatedCourses.map((course: any) => (
                  <div key={course.id} className="flex items-center justify-between p-5 rounded-[1.5rem] border border-zinc-50 bg-zinc-50/30 hover:bg-zinc-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-sm">
                        <BookOpen className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="font-bold text-zinc-900 line-clamp-1">{course.name}</div>
                        <div className="text-[10px] font-black text-zinc-300 tracking-widest">{course.code}</div>
                      </div>
                    </div>
                    <div className="text-[10px] font-black text-zinc-400 bg-zinc-100 px-3 py-1 rounded-lg">
                      {new Date(course.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>

              {/* ⚡️ 应用你的分页组件 (对接接口: totalItems) */}
              <div className="mt-8">
                <Pagination 
                  currentPage={coursePage}
                  totalItems={stats.recentCourses?.length || 0}
                  pageSize={pageSize}
                  onPageChange={setCoursePage}
                />
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </DashboardLayout>
  );
}