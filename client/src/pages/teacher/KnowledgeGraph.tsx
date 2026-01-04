import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Search, Plus, BookOpen, Loader2, Edit, Trash, Network, GitBranch, Layers } from "lucide-react";
import KnowledgeGraphViewer from "@/components/KnowledgeGraphViewer";

export default function KnowledgeGraph() {
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");

  // Dialog states
  const [chapterDialogOpen, setChapterDialogOpen] = useState(false);
  const [pointDialogOpen, setPointDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false); // Menu for node actions

  // Selection states
  const [selectedNode, setSelectedNode] = useState<any>(null); // The node clicked on graph
  const [editingChapter, setEditingChapter] = useState<any>(null);
  const [editingPoint, setEditingPoint] = useState<any>(null);
  const [deletingItem, setDeletingItem] = useState<{ type: "chapter" | "point"; id: number; name: string } | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null);

  // Form states
  const [chapterForm, setChapterForm] = useState({ title: "", description: "" });
  const [pointForm, setPointForm] = useState({ name: "", description: "" });

  // Data Query
  const { data: courses } = trpc.courses.list.useQuery();

  const { data: chapters, isLoading: chaptersLoading, refetch: refetchChapters } = trpc.knowledge.chapters.useQuery(
    { courseId: parseInt(selectedCourseId) || 0 },
    { enabled: !!selectedCourseId }
  );

  const { data: allPoints, isLoading: pointsLoading, refetch: refetchPoints } = trpc.knowledge.pointsByCourse.useQuery(
    { courseId: parseInt(selectedCourseId) || 0 },
    { enabled: !!selectedCourseId }
  );

  const refetchAll = () => {
    refetchChapters();
    refetchPoints();
  };

  // Mutations
  const createChapterMutation = trpc.knowledge.createChapter.useMutation({
    onSuccess: () => {
      toast.success("章节创建成功!");
      setChapterDialogOpen(false);
      setChapterForm({ title: "", description: "" });
      refetchAll();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateChapterMutation = trpc.knowledge.updateChapter.useMutation({
    onSuccess: () => {
      toast.success("章节更新成功!");
      setChapterDialogOpen(false);
      setEditingChapter(null);
      setChapterForm({ title: "", description: "" });
      refetchAll();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteChapterMutation = trpc.knowledge.deleteChapter.useMutation({
    onSuccess: () => {
      toast.success("章节删除成功!");
      setDeleteDialogOpen(false);
      setDeletingItem(null);
      refetchAll();
    },
    onError: (error) => toast.error(error.message),
  });

  const createPointMutation = trpc.knowledge.createPoint.useMutation({
    onSuccess: () => {
      toast.success("知识点创建成功!");
      setPointDialogOpen(false);
      setPointForm({ name: "", description: "" });
      refetchAll();
    },
    onError: (error) => toast.error(error.message),
  });

  const updatePointMutation = trpc.knowledge.updatePoint.useMutation({
    onSuccess: () => {
      toast.success("知识点更新成功!");
      setPointDialogOpen(false);
      setEditingPoint(null);
      setPointForm({ name: "", description: "" });
      refetchAll();
    },
    onError: (error) => toast.error(error.message),
  });

  const deletePointMutation = trpc.knowledge.deletePoint.useMutation({
    onSuccess: () => {
      toast.success("知识点删除成功!");
      setDeleteDialogOpen(false);
      setDeletingItem(null);
      refetchAll();
    },
    onError: (error) => toast.error(error.message),
  });

  // Handlers
  const handleChapterSubmit = () => {
    if (!chapterForm.title.trim()) {
      toast.error("请输入章节标题");
      return;
    }

    if (editingChapter) {
      updateChapterMutation.mutate({
        id: editingChapter.id,
        title: chapterForm.title,
        description: chapterForm.description || undefined,
      });
    } else {
      createChapterMutation.mutate({
        courseId: parseInt(selectedCourseId),
        title: chapterForm.title,
        description: chapterForm.description || undefined,
      });
    }
  };

  const handlePointSubmit = () => {
    if (!pointForm.name.trim()) {
      toast.error("请输入知识点名称");
      return;
    }

    if (editingPoint) {
      updatePointMutation.mutate({
        id: editingPoint.id,
        name: pointForm.name,
        description: pointForm.description || undefined,
      });
    } else {
      createPointMutation.mutate({
        courseId: parseInt(selectedCourseId),
        chapterId: selectedChapterId || undefined,
        name: pointForm.name,
        description: pointForm.description || undefined,
      });
    }
  };

  const handleDelete = () => {
    if (!deletingItem) return;

    if (deletingItem.type === "chapter") {
      deleteChapterMutation.mutate({ id: deletingItem.id });
    } else {
      deletePointMutation.mutate({ id: deletingItem.id });
    }
  };

  const handleNodeClick = (_event: React.MouseEvent, node: any) => {
    setSelectedNode(node);
    setActionDialogOpen(true);
  };

  const openEditChapter = (chapter: any) => {
    setEditingChapter(chapter);
    setChapterForm({ title: chapter.title, description: chapter.description || "" });
    setChapterDialogOpen(true);
  };

  const openAddPoint = (chapterId: number) => {
    setSelectedChapterId(chapterId);
    setEditingPoint(null);
    setPointForm({ name: "", description: "" });
    setPointDialogOpen(true);
  };

  const openEditPoint = (point: any) => {
    setEditingPoint(point);
    setPointForm({ name: point.name, description: point.description || "" });
    setPointDialogOpen(true);
  };

  const selectedCourseName = courses?.find(c => c.id.toString() === selectedCourseId)?.name;

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-100px)] flex flex-col space-y-4">
        {/* Header Section */}
        <div className="flex items-center justify-between bg-white p-4 rounded-xl border shadow-sm">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Network className="h-6 w-6 text-primary" />
              课程知识图谱
            </h1>
            <p className="text-muted-foreground text-sm">可视化管理课程知识体系，拖拽节点查看结构</p>
          </div>
          <div className="flex gap-4 items-center">
            <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="请选择课程以加载图谱" />
              </SelectTrigger>
              <SelectContent>
                {courses?.map((course: any) => (
                  <SelectItem key={course.id} value={course.id.toString()}>{course.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button disabled={!selectedCourseId} onClick={() => {
              setEditingChapter(null);
              setChapterForm({ title: "", description: "" });
              setChapterDialogOpen(true);
            }} className="gap-2">
              <Plus className="h-4 w-4" />
              添加章
            </Button>
          </div>
        </div>

        {/* Graph Visualizer Section */}
        <div className="flex-1 bg-white rounded-xl border shadow-sm overflow-hidden relative">
          {!selectedCourseId ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-slate-50/50">
              <BookOpen className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">请先在上放选择一个课程</p>
              <p className="text-sm opacity-70">选择后将展示交互式知识图谱</p>
            </div>
          ) : (chaptersLoading || pointsLoading) ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <KnowledgeGraphViewer
              courseName={selectedCourseName}
              chapters={chapters || []}
              knowledgePoints={allPoints || []}
              onNodeClick={handleNodeClick}
            />
          )}
        </div>
      </div>

      {/* Node Action Dialog (Mini Menu) */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>操作: {selectedNode?.data?.label}</DialogTitle>
            <DialogDescription>
              选择要执行的操作
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-2 py-2">

            {/* Context: Course Node */}
            {selectedNode?.type === 'course' && (
              <Button variant="outline" className="justify-start gap-2" onClick={() => {
                setActionDialogOpen(false);
                setEditingChapter(null);
                setChapterForm({ title: "", description: "" });
                setChapterDialogOpen(true);
              }}>
                <Plus className="h-4 w-4" />
                添加新章节
              </Button>
            )}

            {/* Context: Chapter Node */}
            {selectedNode?.type === 'chapter' && (
              <>
                <Button variant="outline" className="justify-start gap-2" onClick={() => {
                  setActionDialogOpen(false);
                  openAddPoint(selectedNode.data.original.id);
                }}>
                  <Plus className="h-4 w-4" />
                  添加知识点
                </Button>
                <Button variant="outline" className="justify-start gap-2" onClick={() => {
                  setActionDialogOpen(false);
                  openEditChapter(selectedNode.data.original);
                }}>
                  <Edit className="h-4 w-4" />
                  编辑章节信息
                </Button>
                <Button variant="destructive" className="justify-start gap-2" onClick={() => {
                  setActionDialogOpen(false);
                  setDeletingItem({ type: "chapter", id: selectedNode.data.original.id, name: selectedNode.data.label });
                  setDeleteDialogOpen(true);
                }}>
                  <Trash className="h-4 w-4" />
                  删除该章节
                </Button>
              </>
            )}

            {/* Context: Knowledge Point Node */}
            {selectedNode?.type === 'kp' && (
              <>
                <Button variant="outline" className="justify-start gap-2" onClick={() => {
                  setActionDialogOpen(false);
                  openEditPoint(selectedNode.data.original);
                }}>
                  <Edit className="h-4 w-4" />
                  编辑知识点
                </Button>
                <Button variant="destructive" className="justify-start gap-2" onClick={() => {
                  setActionDialogOpen(false);
                  setDeletingItem({ type: "point", id: selectedNode.data.original.id, name: selectedNode.data.label });
                  setDeleteDialogOpen(true);
                }}>
                  <Trash className="h-4 w-4" />
                  删除该知识点
                </Button>
              </>
            )}
          </div>
          <DialogFooter className="sm:justify-start">
            <Button type="button" variant="secondary" onClick={() => setActionDialogOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chapter Dialog */}
      <Dialog open={chapterDialogOpen} onOpenChange={(open) => {
        setChapterDialogOpen(open);
        if (!open) {
          setEditingChapter(null);
          setChapterForm({ title: "", description: "" });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingChapter ? "编辑章节" : "添加新章节"}</DialogTitle>
            <DialogDescription>
              {editingChapter ? "修改章节信息" : "为课程添加新的章节节点"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>章节名称 *</Label>
              <Input
                placeholder="如: 第一章 绪论"
                value={chapterForm.title}
                onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>章节描述</Label>
              <Textarea
                placeholder="简要描述本章核心内容..."
                rows={3}
                value={chapterForm.description}
                onChange={(e) => setChapterForm({ ...chapterForm, description: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setChapterDialogOpen(false)}>取消</Button>
            <Button
              onClick={handleChapterSubmit}
              disabled={createChapterMutation.isPending || updateChapterMutation.isPending}
            >
              {(createChapterMutation.isPending || updateChapterMutation.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {editingChapter ? "保存" : "创建节点"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Point Dialog */}
      <Dialog open={pointDialogOpen} onOpenChange={(open) => {
        setPointDialogOpen(open);
        if (!open) {
          setEditingPoint(null);
          setPointForm({ name: "", description: "" });
          setSelectedChapterId(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPoint ? "编辑知识点" : "添加知识点"}</DialogTitle>
            <DialogDescription>
              {editingPoint ? "修改知识点信息" : "为章节添加新的知识点节点"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>知识点名称 *</Label>
              <Input
                placeholder="如: 二分查找算法"
                value={pointForm.name}
                onChange={(e) => setPointForm({ ...pointForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>知识点描述</Label>
              <Textarea
                placeholder="知识点详细说明..."
                rows={3}
                value={pointForm.description}
                onChange={(e) => setPointForm({ ...pointForm, description: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPointDialogOpen(false)}>取消</Button>
            <Button
              onClick={handlePointSubmit}
              disabled={createPointMutation.isPending || updatePointMutation.isPending}
            >
              {(createPointMutation.isPending || updatePointMutation.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {editingPoint ? "保存" : "创建节点"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除 <span className="font-bold">{deletingItem?.name}</span> 吗？
              {deletingItem?.type === 'chapter' && (
                <p className="text-red-500 mt-2">⚠️ 删除章节将连带删除其下所有知识点！</p>
              )}
              <p className="mt-2">此操作不可撤销。</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {(deleteChapterMutation.isPending || deletePointMutation.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
