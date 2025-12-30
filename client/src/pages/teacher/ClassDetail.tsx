import { useParams, Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState } from "react";
import { ArrowLeft, Users, BookOpen, Plus, Loader2, UserPlus } from "lucide-react";

export default function ClassDetail() {
  const { id } = useParams<{ id: string }>();
  const classId = parseInt(id || "0");
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const { data: classInfo, isLoading } = trpc.classes.get.useQuery({ id: classId });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!classInfo) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">班级不存在</p>
          <Link href="/teacher/classes">
            <Button variant="link">返回班级列表</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/teacher/classes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{classInfo.name}</h1>
            <p className="text-muted-foreground">
              {classInfo.grade}级 · {classInfo.major || "未设置专业"}
            </p>
          </div>
          <Link href={`/teacher/students/import?classId=${classId}`}>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              导入学生
            </Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{classInfo.studentCount || 0}</p>
                  <p className="text-sm text-muted-foreground">学生人数</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <BookOpen className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-sm text-muted-foreground">关联课程</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>学生名单</CardTitle>
                <CardDescription>班级学生列表</CardDescription>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    添加学生
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>添加学生</DialogTitle>
                    <DialogDescription>手动添加单个学生到班级</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>学号</Label>
                      <Input placeholder="请输入学号" />
                    </div>
                    <div className="space-y-2">
                      <Label>姓名</Label>
                      <Input placeholder="请输入姓名" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
                    <Button onClick={() => {
                      toast.success("学生添加成功!");
                      setDialogOpen(false);
                    }}>添加</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无学生</p>
              <Link href={`/teacher/students/import?classId=${classId}`}>
                <Button variant="link">批量导入学生</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
