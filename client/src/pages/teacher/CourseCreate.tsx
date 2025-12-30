import { useState } from "react";
import { useLocation, Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function CourseCreate() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    semester: "",
    credits: 3,
    status: "draft" as const,
  });

  const createCourseMutation = trpc.courses.create.useMutation({
    onSuccess: () => {
      toast.success("课程创建成功!");
      setLocation("/teacher/courses");
    },
    onError: (error) => {
      toast.error(error.message || "创建失败");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code) {
      toast.error("请填写课程名称和课程代码");
      return;
    }
    setLoading(true);
    try {
      await createCourseMutation.mutateAsync({
        ...formData,
        teacherId: user?.id || 0,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/teacher/courses">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">创建课程</h1>
            <p className="text-muted-foreground">填写课程基本信息</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>课程信息</CardTitle>
            <CardDescription>请填写课程的基本信息</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">课程名称 *</Label>
                  <Input
                    id="name"
                    placeholder="如: 数据结构与算法"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">课程代码 *</Label>
                  <Input
                    id="code"
                    placeholder="如: CS201"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="semester">学期</Label>
                  <Input
                    id="semester"
                    placeholder="如: 2024-2025-1"
                    value={formData.semester}
                    onChange={(e) => setFormData({...formData, semester: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="credits">学分</Label>
                  <Input
                    id="credits"
                    type="number"
                    min={1}
                    max={10}
                    value={formData.credits}
                    onChange={(e) => setFormData({...formData, credits: parseInt(e.target.value) || 3})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">课程状态</Label>
                <Select value={formData.status} onValueChange={(v: any) => setFormData({...formData, status: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">草稿</SelectItem>
                    <SelectItem value="active">进行中</SelectItem>
                    <SelectItem value="archived">已归档</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">课程介绍</Label>
                <Textarea
                  id="description"
                  placeholder="请输入课程介绍..."
                  rows={6}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      创建中...
                    </>
                  ) : (
                    "创建课程"
                  )}
                </Button>
                <Link href="/teacher/courses">
                  <Button type="button" variant="outline">取消</Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
