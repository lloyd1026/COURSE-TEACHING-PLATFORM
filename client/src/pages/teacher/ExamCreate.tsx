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
import { ArrowLeft, Loader2 } from "lucide-react";

export default function ExamCreate() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    courseId: "",
    classId: "",
    duration: 120,
    totalScore: 100,
    startTime: "",
    endTime: "",
  });

  const { data: courses } = trpc.courses.list.useQuery();
  const { data: classes } = trpc.classes.list.useQuery();

  const createExamMutation = trpc.exams.create.useMutation({
    onSuccess: () => {
      toast.success("考试创建成功!");
      setLocation("/teacher/exams");
    },
    onError: (error) => {
      toast.error(error.message || "创建失败");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.courseId || !formData.startTime) {
      toast.error("请填写必填字段");
      return;
    }
    setLoading(true);
    try {
      await createExamMutation.mutateAsync({
        title: formData.title,
        description: formData.description || undefined,
        courseId: parseInt(formData.courseId),
        classId: formData.classId ? parseInt(formData.classId) : 1,
        duration: formData.duration,
        totalScore: formData.totalScore,
        startTime: new Date(formData.startTime),
        endTime: formData.endTime ? new Date(formData.endTime) : new Date(new Date(formData.startTime).getTime() + formData.duration * 60000),
        createdBy: 1,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/teacher/exams">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">创建考试</h1>
            <p className="text-muted-foreground">设置考试基本信息</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>考试信息</CardTitle>
            <CardDescription>填写考试的基本信息</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">考试名称 *</Label>
                <Input
                  id="title"
                  placeholder="如: 期中考试"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>所属课程 *</Label>
                  <Select value={formData.courseId} onValueChange={(v) => setFormData({...formData, courseId: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择课程" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses?.map((course: any) => (
                        <SelectItem key={course.id} value={course.id.toString()}>{course.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>关联班级</Label>
                  <Select value={formData.classId} onValueChange={(v) => setFormData({...formData, classId: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择班级" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes?.map((cls: any) => (
                        <SelectItem key={cls.id} value={cls.id.toString()}>{cls.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">考试时长(分钟)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min={10}
                    max={300}
                    value={formData.duration}
                    onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value) || 120})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalScore">总分</Label>
                  <Input
                    id="totalScore"
                    type="number"
                    min={1}
                    value={formData.totalScore}
                    onChange={(e) => setFormData({...formData, totalScore: parseInt(e.target.value) || 100})}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">开始时间 *</Label>
                  <Input
                    id="startTime"
                    type="datetime-local"
                    value={formData.startTime}
                    onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">结束时间</Label>
                  <Input
                    id="endTime"
                    type="datetime-local"
                    value={formData.endTime}
                    onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">考试说明</Label>
                <Textarea
                  id="description"
                  placeholder="考试注意事项..."
                  rows={4}
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
                    "创建考试"
                  )}
                </Button>
                <Link href="/teacher/exams">
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
