import { useState } from "react";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { Search, Plus, FlaskConical, Loader2 } from "lucide-react";

export default function ExperimentList() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newExperiment, setNewExperiment] = useState({
    title: "",
    description: "",
    courseId: "",
    classId: "",
    dueDate: "",
  });

  const { data: experiments, isLoading, refetch } = trpc.experiments.list.useQuery();
  const { data: courses } = trpc.courses.list.useQuery();
  const { data: classes } = trpc.classes.list.useQuery();

  const createExperimentMutation = trpc.experiments.create.useMutation({
    onSuccess: () => {
      toast.success("实验创建成功!");
      setDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "创建失败");
    },
  });

  const handleCreate = () => {
    if (!newExperiment.title || !newExperiment.courseId || !newExperiment.dueDate) {
      toast.error("请填写必填字段");
      return;
    }
    createExperimentMutation.mutate({
      title: newExperiment.title,
      description: newExperiment.description || undefined,
      courseId: parseInt(newExperiment.courseId),
      classId: parseInt(newExperiment.classId) || 1,
      dueDate: new Date(newExperiment.dueDate),
      createdBy: user?.id || 0,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">进行中</Badge>;
      case 'ended':
        return <Badge variant="secondary">已结束</Badge>;
      default:
        return <Badge variant="outline">草稿</Badge>;
    }
  };

  const filteredExperiments = experiments?.filter((exp: any) =>
    exp.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">实验管理</h1>
            <p className="text-muted-foreground">创建和管理编程实验</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                创建实验
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>创建新实验</DialogTitle>
                <DialogDescription>设置实验基本信息</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>实验名称 *</Label>
                  <Input
                    placeholder="如: 链表实现"
                    value={newExperiment.title}
                    onChange={(e) => setNewExperiment({...newExperiment, title: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>所属课程 *</Label>
                    <Select value={newExperiment.courseId} onValueChange={(v) => setNewExperiment({...newExperiment, courseId: v})}>
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
                    <Select value={newExperiment.classId} onValueChange={(v) => setNewExperiment({...newExperiment, classId: v})}>
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
                <div className="space-y-2">
                  <Label>截止时间 *</Label>
                  <Input
                    type="datetime-local"
                    value={newExperiment.dueDate}
                    onChange={(e) => setNewExperiment({...newExperiment, dueDate: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>实验描述</Label>
                  <Textarea
                    placeholder="实验要求和说明..."
                    rows={4}
                    value={newExperiment.description}
                    onChange={(e) => setNewExperiment({...newExperiment, description: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
                <Button onClick={handleCreate} disabled={createExperimentMutation.isPending}>
                  {createExperimentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  创建
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索实验..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredExperiments && filteredExperiments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>实验名称</TableHead>
                    <TableHead>截止时间</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExperiments.map((exp: any) => (
                    <TableRow key={exp.id}>
                      <TableCell className="font-medium">{exp.title}</TableCell>
                      <TableCell>{new Date(exp.dueDate).toLocaleString()}</TableCell>
                      <TableCell>{getStatusBadge(exp.status)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">查看</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <FlaskConical className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">暂无实验</p>
                <Button variant="link" onClick={() => setDialogOpen(true)}>创建第一个实验</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
