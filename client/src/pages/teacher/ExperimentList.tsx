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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { Search, Plus, FlaskConical, Loader2, MoreVertical, Pencil, Trash2, Play, Square, Eye } from "lucide-react";

export default function ExperimentList() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingExperiment, setEditingExperiment] = useState<any>(null);
  const [deletingExperiment, setDeletingExperiment] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    requirements: "",
    courseId: "",
    classId: "",
    dueDate: "",
  });

  const { data: experiments, isLoading, refetch } = trpc.experiments.list.useQuery();
  const { data: courses } = trpc.courses.list.useQuery();
  const { data: classes } = trpc.classes.list.useQuery();

  const createMutation = trpc.experiments.create.useMutation({
    onSuccess: () => {
      toast.success("实验创建成功!");
      closeDialog();
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = trpc.experiments.update.useMutation({
    onSuccess: () => {
      toast.success("实验更新成功!");
      closeDialog();
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = trpc.experiments.delete.useMutation({
    onSuccess: () => {
      toast.success("实验删除成功!");
      setDeleteDialogOpen(false);
      setDeletingExperiment(null);
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const publishMutation = trpc.experiments.publish.useMutation({
    onSuccess: () => {
      toast.success("实验已发布!");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const closeMutation = trpc.experiments.close.useMutation({
    onSuccess: () => {
      toast.success("实验已关闭!");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingExperiment(null);
    setFormData({
      title: "",
      description: "",
      requirements: "",
      courseId: "",
      classId: "",
      dueDate: "",
    });
  };

  const openEdit = (exp: any) => {
    setEditingExperiment(exp);
    setFormData({
      title: exp.title,
      description: exp.description || "",
      requirements: exp.requirements || "",
      courseId: exp.courseId?.toString() || "",
      classId: exp.classId?.toString() || "",
      dueDate: exp.dueDate ? new Date(exp.dueDate).toISOString().slice(0, 16) : "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.courseId || !formData.dueDate) {
      toast.error("请填写必填字段");
      return;
    }

    if (editingExperiment) {
      updateMutation.mutate({
        id: editingExperiment.id,
        title: formData.title,
        description: formData.description || undefined,
        requirements: formData.requirements || undefined,
        dueDate: new Date(formData.dueDate),
      });
    } else {
      createMutation.mutate({
        title: formData.title,
        description: formData.description || undefined,
        requirements: formData.requirements || undefined,
        courseId: parseInt(formData.courseId),
        classId: parseInt(formData.classId) || 1,
        dueDate: new Date(formData.dueDate),
      });
    }
  };

  const getStatusBadge = (status: string, dueDate?: Date) => {
    const now = new Date();
    const due = dueDate ? new Date(dueDate) : null;

    if (status === 'closed') {
      return <Badge variant="secondary">已关闭</Badge>;
    }
    if (status === 'published') {
      if (due && due < now) {
        return <Badge variant="destructive">已截止</Badge>;
      }
      return <Badge className="bg-green-100 text-green-800">进行中</Badge>;
    }
    return <Badge variant="outline">草稿</Badge>;
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
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            if (!open) closeDialog();
            else setDialogOpen(true);
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                创建实验
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingExperiment ? "编辑实验" : "创建新实验"}</DialogTitle>
                <DialogDescription>
                  {editingExperiment ? "修改实验信息" : "设置实验基本信息"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>实验名称 *</Label>
                  <Input
                    placeholder="如: 链表实现"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                {!editingExperiment && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>所属课程 *</Label>
                      <Select value={formData.courseId} onValueChange={(v) => setFormData({ ...formData, courseId: v })}>
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
                      <Select value={formData.classId} onValueChange={(v) => setFormData({ ...formData, classId: v })}>
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
                )}
                <div className="space-y-2">
                  <Label>截止时间 *</Label>
                  <Input
                    type="datetime-local"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>实验描述</Label>
                  <Textarea
                    placeholder="实验背景和目标..."
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>实验要求</Label>
                  <Textarea
                    placeholder="具体实现要求..."
                    rows={3}
                    value={formData.requirements}
                    onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={closeDialog}>取消</Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  {editingExperiment ? "保存" : "创建"}
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
                      <TableCell>{getStatusBadge(exp.status, exp.dueDate)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link href={`/teacher/experiments/${exp.id}`}>
                            <Button variant="ghost" size="sm" className="gap-1">
                              <Eye className="h-4 w-4" />
                              查看
                            </Button>
                          </Link>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(exp)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                编辑
                              </DropdownMenuItem>
                              {exp.status === 'draft' && (
                                <DropdownMenuItem onClick={() => publishMutation.mutate({ id: exp.id })}>
                                  <Play className="h-4 w-4 mr-2" />
                                  发布
                                </DropdownMenuItem>
                              )}
                              {exp.status === 'published' && (
                                <DropdownMenuItem onClick={() => closeMutation.mutate({ id: exp.id })}>
                                  <Square className="h-4 w-4 mr-2" />
                                  关闭
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setDeletingExperiment(exp);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                删除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除实验"<span className="font-medium">{deletingExperiment?.title}</span>"吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate({ id: deletingExperiment?.id })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
