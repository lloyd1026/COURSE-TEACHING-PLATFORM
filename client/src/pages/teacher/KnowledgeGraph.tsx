import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Search, Plus, BookOpen, Loader2, ChevronRight } from "lucide-react";

export default function KnowledgeGraph() {
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: courses } = trpc.courses.list.useQuery();
  const { data: chapters, isLoading } = trpc.knowledge.chapters.useQuery(
    { courseId: parseInt(selectedCourseId) || 0 },
    { enabled: !!selectedCourseId }
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">课程知识图谱</h1>
            <p className="text-muted-foreground">按章节管理课程知识点</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" disabled={!selectedCourseId}>
                <Plus className="h-4 w-4" />
                添加章节
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>添加新章节</DialogTitle>
                <DialogDescription>为课程添加新的章节</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>章节名称</Label>
                  <Input placeholder="如: 第一章 绑定" />
                </div>
                <div className="space-y-2">
                  <Label>章节描述</Label>
                  <Textarea placeholder="章节内容概述..." rows={3} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
                <Button onClick={() => {
                  toast.success("章节添加成功!");
                  setDialogOpen(false);
                }}>添加</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="选择课程" />
                </SelectTrigger>
                <SelectContent>
                  {courses?.map((course: any) => (
                    <SelectItem key={course.id} value={course.id.toString()}>{course.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索知识点..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {!selectedCourseId ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>请先选择一个课程</p>
              </div>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : chapters && chapters.length > 0 ? (
          <Card>
            <CardContent className="pt-6">
              <Accordion type="multiple" className="space-y-2">
                {chapters.map((chapter: any) => (
                  <AccordionItem key={chapter.id} value={chapter.id.toString()} className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{chapter.orderIndex || 1}</Badge>
                        <span className="font-medium">{chapter.title}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pl-8 space-y-2">
                        <p className="text-sm text-muted-foreground mb-4">{chapter.description || "暂无描述"}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">知识点列表</span>
                          <Button variant="ghost" size="sm" className="gap-1">
                            <Plus className="h-3 w-3" />
                            添加知识点
                          </Button>
                        </div>
                        <div className="text-sm text-muted-foreground text-center py-4">
                          暂无知识点
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>该课程暂无章节</p>
                <Button variant="link" onClick={() => setDialogOpen(true)}>添加第一个章节</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
