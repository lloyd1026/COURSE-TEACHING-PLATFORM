import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, DialogContent, DialogDescription, 
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { 
  Users, Plus, Search, Calendar, GraduationCap, 
  ChevronRight, Loader2, ListFilter, ChevronLeft,
  Info, LayoutGrid, Clock
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { generateGrades, COMPUTER_MAJORS, type ComputerMajor } from "@/lib/configs";

export default function ClassManage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  
  // --- 1. 状态管理 ---
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const gradeOptions = generateGrades();
  const { data: classes, isLoading } = trpc.classes.list.useQuery();

  const [formData, setFormData] = useState<{
    name: string;
    grade: number;
    major: ComputerMajor;
  }>({
    name: "",
    grade: gradeOptions[0]?.value || new Date().getFullYear(),
    major: COMPUTER_MAJORS[0],
  });

  // --- 2. 创建逻辑 ---
  const createMutation = trpc.classes.create.useMutation({
    onSuccess: () => {
      toast.success("班级档案已成功创建");
      setIsDialogOpen(false);
      utils.classes.list.invalidate();
      setFormData({ name: "", grade: gradeOptions[0]?.value, major: COMPUTER_MAJORS[0] });
    },
    onError: (err) => toast.error(err.message)
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error("请输入班级名称");
    createMutation.mutate(formData);
  };

  // --- 3. 搜索与分页逻辑 ---
  const filteredClasses = useMemo(() => {
    const list = classes?.filter(cls =>
      cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.major?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];
    return list;
  }, [classes, searchTerm]);

  const totalPages = Math.ceil(filteredClasses.length / itemsPerPage);
  
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredClasses.slice(start, start + itemsPerPage);
  }, [filteredClasses, currentPage]);

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  if (isLoading)
    return (
      <div className="flex h-screen items-center justify-center bg-[#F5F5F7]">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );

  return (
    <DashboardLayout>
      {/* 核心布局：h-screen + overflow-hidden 锁定整页 */}
      <div className="h-screen flex flex-col bg-[#F5F5F7] font-sans antialiased text-[#1D1D1F] overflow-hidden">
        
        {/* Apple Style Header: 保持固定 */}
        <header className="flex-none z-30 w-full bg-[#F5F5F7]/80 backdrop-blur-xl border-b border-gray-200/50">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-black p-1.5 rounded-lg shadow-sm">
                <LayoutGrid className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight leading-none">行政班级管理</h1>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">维护学校档案及学生名册</p>
              </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-5 h-9 text-sm font-medium transition-all shadow-sm shadow-blue-100">
                  <Plus className="mr-2 h-4 w-4" /> 新建班级
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[420px] rounded-[28px] p-8 border-none shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold tracking-tight">创建班级档案</DialogTitle>
                  <DialogDescription className="text-xs">填写基础信息以建立班级，后续可导入学生名册。</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-5 pt-4">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold text-gray-400 uppercase ml-1">班级名称</Label>
                    <Input 
                      placeholder="例如：24级 软件工程 1班" 
                      className="rounded-xl bg-gray-100 border-none h-11 focus-visible:ring-2 focus-visible:ring-blue-500/20"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-gray-400 uppercase ml-1">入学年级</Label>
                      <Select 
                        value={formData.grade.toString()} 
                        onValueChange={v => setFormData({...formData, grade: parseInt(v)})}
                      >
                        <SelectTrigger className="rounded-xl bg-gray-100 border-none h-11"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl border-gray-100 shadow-xl">
                          {gradeOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value.toString()} className="rounded-lg">{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-gray-400 uppercase ml-1">所属专业</Label>
                      <Select 
                        value={formData.major} 
                        onValueChange={v => setFormData({...formData, major: v as ComputerMajor})}
                      >
                        <SelectTrigger className="rounded-xl bg-gray-100 border-none h-11"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl border-gray-100 shadow-xl">
                          {COMPUTER_MAJORS.map(m => (
                            <SelectItem key={m} value={m} className="rounded-lg">{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter className="pt-4">
                    <Button type="submit" className="w-full bg-black hover:bg-gray-800 text-white rounded-full h-11 font-bold transition-all" disabled={createMutation.isPending}>
                      {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      立即保存档案
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* 内容区域：Flexbox 布局配合局部滚动 */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-6 overflow-hidden flex flex-col lg:flex-row gap-8">
          
          {/* 左侧主体：班级列表容器 */}
          <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
            
            {/* 列表控制栏 */}
            <div className="flex-none flex items-center justify-between mb-6">
              <div className="relative group w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <Input 
                  placeholder="搜索班级、专业名称..." 
                  className="pl-9 bg-white border-none rounded-xl h-10 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500/10 transition-all"
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </div>
              <Button variant="ghost" size="sm" className="h-10 px-4 font-bold text-gray-400 rounded-xl hover:bg-gray-200/50 gap-2">
                <ListFilter className="h-4 w-4" /> 筛选条件
              </Button>
            </div>

            {/* 班级列表：独立滑动区域 */}
            <div className="flex-1 bg-white rounded-[24px] border border-gray-200/50 shadow-sm flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto divide-y divide-gray-50 scroll-smooth">
                {currentItems && currentItems.length > 0 ? (
                  currentItems.map((cls) => (
                    <div key={cls.id} className="group flex items-center justify-between px-6 py-5 hover:bg-blue-50/20 transition-all">
                      <div className="flex items-center gap-5">
                        <div className="h-12 w-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-inner">
                          <GraduationCap className="h-6 w-6" />
                        </div>
                        <div>
                          <Link href={`/teacher/classes/${cls.id}`}>
                            <span className="text-[15px] font-bold text-gray-800 hover:text-blue-600 cursor-pointer transition-colors leading-none">
                              {cls.name}
                            </span>
                          </Link>
                          <div className="flex items-center gap-4 mt-2">
                             <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 rounded-md">
                               <div className="w-1 h-1 rounded-full bg-gray-400" />
                               <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">{cls.major}</span>
                             </div>
                             <div className="flex items-center gap-1.5 text-gray-400">
                               <Users className="h-3 w-3" />
                               <span className="text-[11px] font-medium">{cls.studentCount || 0} 位学生</span>
                             </div>
                             <div className="flex items-center gap-1.5 text-gray-400">
                               <Clock className="h-3 w-3" />
                               <span className="text-[11px] font-medium">{new Date(cls.createdAt).toLocaleDateString()} 创建</span>
                             </div>
                          </div>
                        </div>
                      </div>
                      
                      <Link href={`/teacher/classes/${cls.id}`}>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-gray-300 group-hover:text-blue-600 group-hover:bg-blue-50 transition-all">
                          <ChevronRight className="h-5 w-5" />
                        </Button>
                      </Link>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center py-20 text-center">
                    <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                      <Users className="h-8 w-8 text-gray-200" />
                    </div>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">未检索到班级档案</p>
                  </div>
                )}
              </div>

              {/* 页码页脚：固定在容器底部 */}
              {totalPages > 1 && (
                <div className="flex-none px-6 py-4 flex items-center justify-between border-t border-gray-50 bg-gray-50/30">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5 mr-2">
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i + 1)}
                          className={`h-1.5 rounded-full transition-all duration-300 ${currentPage === i + 1 ? 'bg-blue-600 w-6' : 'bg-gray-200 w-1.5 hover:bg-gray-300'}`}
                        />
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 rounded-lg hover:bg-white hover:shadow-sm transition-all" 
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 rounded-lg hover:bg-white hover:shadow-sm transition-all" 
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => p + 1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 右侧边栏：补充信息 */}
          <aside className="lg:w-80 flex-none space-y-6 h-full overflow-y-auto pb-10 scrollbar-hide">
            <div className="bg-white rounded-[24px] p-6 border border-gray-200/50 shadow-sm">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <Info className="h-3 w-3" /> Management Note
              </h3>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="h-9 w-9 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 flex-none"><Calendar className="h-4 w-4" /></div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">按年级归档</p>
                    <p className="text-[11px] text-gray-400 leading-relaxed mt-1">系统会自动根据入学年份对班级进行逻辑分组，方便在教学任务中快速关联。</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="h-9 w-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-500 flex-none"><Users className="h-4 w-4" /></div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">名册同步</p>
                    <p className="text-[11px] text-gray-400 leading-relaxed mt-1">点击进入班级详情页，可支持 Excel 批量导入或手动同步学生数据。</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-[24px] p-6 text-white overflow-hidden relative shadow-lg">
              <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12"><GraduationCap className="h-24 w-24" /></div>
              <h4 className="font-bold text-sm mb-2">快速提示</h4>
              <p className="text-[11px] text-gray-400 leading-relaxed opacity-80">
                如果需要删除班级档案，请务必先清空该班级下的所有关联学生，以确保数据的一致性。
              </p>
            </div>
          </aside>
        </main>
      </div>
    </DashboardLayout>
  );
}