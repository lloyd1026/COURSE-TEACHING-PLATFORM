import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { 
  BookOpen, Plus, Search, Loader2, ChevronRight, 
  LayoutGrid, Book, Star, Clock, Layers 
} from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

export default function CourseList() {
  const { data: courses, isLoading } = trpc.courses.list.useQuery();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCourses = courses?.filter(course =>
    course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      {/* 核心布局：锁定整页高度，局部滚动 */}
      <div className="h-screen flex flex-col bg-[#F5F5F7] font-sans antialiased text-[#1D1D1F] overflow-hidden">
        
        {/* Apple Style Header */}
        <header className="flex-none z-30 w-full bg-[#F5F5F7]/80 backdrop-blur-xl border-b border-gray-200/50">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-black p-1.5 rounded-lg shadow-sm">
                <Book className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight leading-none">我的课程</h1>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">管理并维护您的教学档案</p>
              </div>
            </div>
            
            <Link href="/teacher/courses/create">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-5 h-9 text-sm font-medium transition-all shadow-sm shadow-blue-100">
                <Plus className="mr-2 h-4 w-4" /> 创建课程
              </Button>
            </Link>
          </div>
        </header>

        {/* 独立滑动的控制区与列表 */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth px-6 py-8">
          <div className="max-w-7xl mx-auto space-y-8">
            
            {/* 搜索栏：居中或左侧大尺寸搜索框 */}
            <div className="flex items-center justify-between">
              <div className="relative group w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <Input
                  placeholder="搜索课程名称、课程代码..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-white border-none rounded-2xl h-11 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500/10 transition-all"
                />
              </div>
              <div className="hidden md:flex gap-2">
                <Button variant="ghost" size="icon" className="rounded-full text-gray-400 bg-white shadow-sm border border-gray-100">
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full text-gray-400">
                  <Layers className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500 opacity-20" />
                <p className="mt-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">正在载入课程档案</p>
              </div>
            ) : filteredCourses && filteredCourses.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-20">
                {filteredCourses.map((course) => (
                  <Link key={course.id} href={`/teacher/courses/${course.id}`}>
                    <div className="group relative bg-white rounded-[32px] p-6 border border-white shadow-xl shadow-gray-200/40 transition-all hover:shadow-2xl hover:-translate-y-1 cursor-pointer flex flex-col h-full overflow-hidden">
                      {/* 背景微光效果 */}
                      <div className="absolute -right-6 -top-6 h-24 w-24 bg-gray-50 rounded-full blur-2xl group-hover:bg-blue-50 transition-all" />
                      
                      <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-6">
                          <div className="h-12 w-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                            <BookOpen className="h-6 w-6" />
                          </div>
                          <Badge variant="outline" className={`rounded-full px-3 py-0.5 text-[9px] font-bold uppercase tracking-widest border-none ${
                            course.status === 'active' ? 'bg-green-50 text-green-600' : 
                            course.status === 'draft' ? 'bg-gray-100 text-gray-400' : 'bg-red-50 text-red-600'
                          }`}>
                            {course.status === 'active' ? '● 授课中' : course.status === 'draft' ? '草稿' : '已归档'}
                          </Badge>
                        </div>

                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-[#1D1D1F] tracking-tight group-hover:text-blue-600 transition-colors leading-snug">
                            {course.name}
                          </h3>
                          <p className="text-[10px] font-mono text-gray-400 mt-1 uppercase tracking-tighter">
                            CODE: {course.code}
                          </p>
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-50 flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1"><Star className="h-3 w-3" /> {course.credits} Credits</span>
                          </div>
                          <div className="h-7 w-7 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                            <ChevronRight className="h-4 w-4" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[40px] border border-dashed border-gray-200">
                <div className="h-20 w-20 rounded-full bg-gray-50 flex items-center justify-center mb-6">
                  <BookOpen className="h-10 w-10 text-gray-200" />
                </div>
                <h3 className="text-lg font-bold text-gray-800">暂无课程档案</h3>
                <p className="text-sm text-gray-400 mt-1">您可以开始创建您的第一门教学课程</p>
                <Link href="/teacher/courses/create">
                  <Button className="mt-6 rounded-full bg-black text-white px-8 h-10 font-bold shadow-lg shadow-gray-200">
                    <Plus className="mr-2 h-4 w-4" /> 立即创建
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </main>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </DashboardLayout>
  );
}