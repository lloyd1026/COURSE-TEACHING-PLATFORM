import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation, Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save, BookOpen, Settings2, ShieldCheck, Layers } from "lucide-react";

// 使用兼容 React 18 的富文本组件
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

type CourseStatus = "draft" | "active" | "archived";

export default function CourseEdit() {
  const { id } = useParams<{ id: string }>();
  const courseId = parseInt(id || "0");
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);

  // 【功能：灵活学期生成】自动根据当前时间生成可用学期列表
  const semesterOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const options = [];
    for (let i = -1; i <= 1; i++) {
      const year = currentYear + i;
      options.push(`${year}-${year + 1}-1`);
      options.push(`${year}-${year + 1}-2`);
    }
    return options;
  }, []);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    semester: "",
    credits: 3,
    status: "draft" as CourseStatus,
  });

  // 1. 获取现有课程数据（移除不推荐的 onSuccess）
  const { data: course, isLoading: isFetching } = trpc.courses.get.useQuery({ id: courseId });

  // 2. 使用 useEffect 实现数据回显同步
  useEffect(() => {
    if (course) {
        console.log("Fetched course data:", course);
      setFormData({
        name: course.name,
        code: course.code,
        description: course.description || "",
        semester: course.semester,
        credits: course.credits || 3,
        status: course.status as CourseStatus,
      });
    }
  }, [course]);

  // 3. 定义更新 Mutation
  const updateCourseMutation = trpc.courses.update.useMutation({
    onSuccess: () => {
      toast.success("课程信息更新成功");
      setLocation(`/teacher/courses/${courseId}`);
    },
    onError: (error) => {
      toast.error(error.message || "更新失败");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error("课程名称不能为空");
      return;
    }
    setLoading(true);
    try {
      await updateCourseMutation.mutateAsync({
        id: courseId,
        ...formData,
      });
    } finally {
      setLoading(false);
    }
  };

  if (isFetching) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-slate-400 animate-pulse font-medium">加载课程档案中...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout key={courseId}>
      <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
        {/* 顶部导航与操作栏 */}
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <Link href={`/teacher/courses/${courseId}`}>
              <Button variant="outline" size="icon" className="rounded-full">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">编辑课程资料</h1>
              <p className="text-sm text-muted-foreground italic">修改 ID: {courseId} 的课程档案</p>
            </div>
          </div>
          <div className="flex gap-3">
             <Button type="button" variant="ghost" onClick={() => setLocation(`/teacher/courses/${courseId}`)}>取消</Button>
             <Button onClick={handleSubmit} className="px-6 shadow-md" disabled={loading}>
               {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
               保存修改
             </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧主要区域：富文本大纲 */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-sm border-slate-200/60">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" /> 课程介绍与大纲
                </CardTitle>
                <CardDescription>更新详细的课程内容，将即时向选课学生展示</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="font-bold">课程全称 *</Label>
                  <Input
                    id="name"
                    placeholder="请输入课程全称"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-11 focus-visible:ring-primary/20"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="font-bold">教学大纲 (富文本编辑)</Label>
                  <div className="rounded-md border border-input bg-background overflow-hidden">
                    <ReactQuill
                      theme="snow"
                      value={formData.description}
                      onChange={(v) => setFormData({ ...formData, description: v })}
                      className="min-h-[400px]"
                      placeholder="更新课程目标、考核标准等内容..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右侧配置区域 */}
          <div className="space-y-6">
            <Card className="shadow-sm border-slate-200/60">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" /> 基本属性
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-tighter">课程代码 (不可修改)</Label>
                  <Input
                    value={formData.code}
                    disabled
                    className="h-10 font-mono bg-slate-50 opacity-70 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-bold">授课学期</Label>
                  <Select value={formData.semester} onValueChange={(v) => setFormData({ ...formData, semester: v })}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {semesterOptions.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="credits" className="font-bold">学分设定</Label>
                  <Input
                    id="credits"
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={formData.credits}
                    onChange={(e) => setFormData({ ...formData, credits: parseFloat(e.target.value) || 0 })}
                    className="h-10"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200/60">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary" /> 发布状态管理
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { id: 'draft', label: '草稿', desc: '暂不对学生可见' },
                  { id: 'active', label: '发布', desc: '学生可立即访问' },
                  { id: 'archived', label: '归档', desc: '转为只读历史记录' }
                ].map(s => (
                  <div
                    key={s.id}
                    onClick={() => setFormData({ ...formData, status: s.id as CourseStatus })}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.status === s.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-slate-50 hover:border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                      formData.status === s.id ? 'border-primary' : 'border-slate-300'
                    }`}>
                      {formData.status === s.id && <div className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                    <div className="flex-1">
                      <div className={`text-sm font-bold ${formData.status === s.id ? 'text-primary' : 'text-slate-700'}`}>
                        {s.label}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase leading-none mt-1">{s.desc}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </form>
      </div>

      <style>{`
        .ql-toolbar.ql-snow { border-radius: 8px 8px 0 0; border: 1px solid #e2e8f0; background: #f8fafc; }
        .ql-container.ql-snow { border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0; border-top: none; }
        .ql-editor { font-family: inherit; font-size: 16px; }
      `}</style>
    </DashboardLayout>
  );
}