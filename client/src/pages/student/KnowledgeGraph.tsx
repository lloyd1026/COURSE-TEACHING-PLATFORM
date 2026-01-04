import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Search, BookOpen, Loader2, Network } from "lucide-react";
import KnowledgeGraphViewer from "@/components/KnowledgeGraphViewer";

export default function StudentKnowledgeGraph() {
    const [selectedCourseId, setSelectedCourseId] = useState<string>("");
    const [selectedNode, setSelectedNode] = useState<any>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);

    const { data: courses } = trpc.courses.list.useQuery();

    // Load both chapters and points for full graph
    const { data: chapters, isLoading: chaptersLoading } = trpc.knowledge.chapters.useQuery(
        { courseId: parseInt(selectedCourseId) || 0 },
        { enabled: !!selectedCourseId }
    );

    const { data: allPoints, isLoading: pointsLoading } = trpc.knowledge.pointsByCourse.useQuery(
        { courseId: parseInt(selectedCourseId) || 0 },
        { enabled: !!selectedCourseId }
    );

    const handleNodeClick = (_event: React.MouseEvent, node: any) => {
        // Only show details for content nodes
        if (node.type === 'chapter' || node.type === 'kp') {
            setSelectedNode(node);
            setDetailsOpen(true);
        }
    };

    const selectedCourseName = courses?.find(c => c.id.toString() === selectedCourseId)?.name;

    return (
        <DashboardLayout>
            <div className="h-[calc(100vh-100px)] flex flex-col space-y-4">
                <div className="flex items-center justify-between bg-white p-4 rounded-xl border shadow-sm">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Network className="h-6 w-6 text-primary" />
                            课程知识图谱
                        </h1>
                        <p className="text-muted-foreground text-sm">探索课程知识结构</p>
                    </div>

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
                </div>

                <div className="flex-1 bg-white rounded-xl border shadow-sm overflow-hidden relative">
                    {!selectedCourseId ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-slate-50/50">
                            <BookOpen className="h-16 w-16 mb-4 opacity-20" />
                            <p className="text-lg font-medium">请先在上放选择一个课程</p>
                            <p className="text-sm opacity-70">将展示该课程的完整知识图谱</p>
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

                {/* Details Dialog */}
                <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {selectedNode?.type === 'chapter' ? '章节详情' : '知识点详情'}
                            </DialogTitle>
                            <DialogDescription>
                                {selectedNode?.data?.label}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="py-4 space-y-4">
                            {selectedNode?.data?.original?.description ? (
                                <div className="bg-slate-50 p-4 rounded-lg border">
                                    <h4 className="text-sm font-semibold mb-2 text-slate-700">描述</h4>
                                    <p className="text-sm text-slate-600 leading-relaxed">
                                        {selectedNode.data.original.description}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground italic">暂无描述信息</p>
                            )}

                            {selectedNode?.type === 'chapter' && (
                                <div className="text-xs text-muted-foreground">
                                    此章节包含下级知识点，请在图谱中查看连接关系。
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button onClick={() => setDetailsOpen(false)}>关闭</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}
