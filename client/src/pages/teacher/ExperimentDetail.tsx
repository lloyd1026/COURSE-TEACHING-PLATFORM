import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Users, Clock, FileCode, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { KnowledgePointManager } from "@/components/KnowledgePointManager";

export default function TeacherExperimentDetail() {
    const [, params] = useRoute("/teacher/experiments/:id");
    const experimentId = parseInt(params?.id || "0");

    const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
    const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
    const [gradeForm, setGradeForm] = useState({ score: "", feedback: "" });

    const { data: experiment, isLoading } = trpc.experiments.get.useQuery(
        { id: experimentId },
        { enabled: !!experimentId }
    );

    const {
        data: progressData,
        isLoading: isProgressLoading,
        isError: isProgressError,
        error: progressError,
        refetch: refetchProgress
    } = trpc.experiments.getProgress.useQuery(
        { experimentId },
        { enabled: !!experimentId }
    );

    const { data: linkedKPs, refetch: refetchLinkedKPs } = trpc.knowledge.getLinkedPoints.useQuery(
        { entityType: "experiment", entityId: experimentId },
        { enabled: !!experimentId }
    );

    const linkPointMutation = trpc.knowledge.linkPoint.useMutation({
        onSuccess: () => {
            toast.success("关联成功");
            refetchLinkedKPs();
        },
        onError: (err) => toast.error(err.message)
    });

    const unlinkPointMutation = trpc.knowledge.unlinkPoint.useMutation({
        onSuccess: () => {
            toast.success("已取消关联");
            refetchLinkedKPs();
        },
        onError: (err) => toast.error(err.message)
    });

    const pointOperationsLoading = linkPointMutation.isPending || unlinkPointMutation.isPending;

    const evaluateMutation = trpc.experiments.evaluate.useMutation({
        onSuccess: () => {
            toast.success("评分成功!");
            setGradeDialogOpen(false);
            setSelectedSubmission(null);
            setGradeForm({ score: "", feedback: "" });
            refetchProgress();
        },
        onError: (error) => toast.error(error.message),
    });

    const handleGrade = () => {
        const score = parseInt(gradeForm.score);
        if (isNaN(score) || score < 0 || score > 100) {
            toast.error("请输入0-100之间的分数");
            return;
        }

        evaluateMutation.mutate({
            submissionId: selectedSubmission.id,
            score,
            feedback: gradeForm.feedback || undefined,
        });
    };

    const getStatusBadge = (status: string | null) => {
        if (!status) return <Badge variant="outline" className="text-gray-400">未开始</Badge>;
        switch (status) {
            case 'evaluated':
            case 'graded':
                return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />已评分</Badge>;
            case 'submitted':
                return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><AlertCircle className="h-3 w-3 mr-1" />待评分</Badge>;
            case 'draft':
            case 'returned':
                return <Badge variant="outline" className="text-orange-500 border-orange-200">草稿/需修改</Badge>;
            default:
                return <Badge variant="outline">未知状态</Badge>;
        }
    };

    // Query for Dialog details
    const { data: detailSubmission, isLoading: isDetailLoading } = trpc.experiments.getStudentSubmission.useQuery(
        { experimentId, studentId: selectedSubmission?.studentId || -1 },
        { enabled: !!selectedSubmission?.studentId }
    );

    useEffect(() => {
        if (detailSubmission) {
            setGradeForm({
                score: detailSubmission.score?.toString() || "",
                feedback: detailSubmission.feedback || "",
            });
        }
    }, [detailSubmission]);

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    if (!experiment) {
        return (
            <DashboardLayout>
                <div className="text-center py-12">
                    <p className="text-muted-foreground">实验不存在</p>
                    <Link href="/teacher/experiments">
                        <Button variant="link">返回列表</Button>
                    </Link>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Error Alert */}
                {isProgressError && (
                    <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        <span>无法加载班级进度: {progressError?.message}</span>
                    </div>
                )}

                <div className="flex items-center gap-4">
                    <Link href="/teacher/experiments">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold">{experiment.title}</h1>
                            <Badge variant="outline" className="text-xs text-muted-foreground">ID: {experiment.id}</Badge>
                        </div>
                        <p className="text-muted-foreground">实验详情与班级进度概览</p>
                    </div>
                    <Badge variant={experiment.status === 'published' ? 'default' : 'secondary'}>
                        {experiment.status === 'published' ? '已发布' : experiment.status === 'closed' ? '已关闭' : '草稿'}
                    </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <Clock className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <p className="text-sm text-muted-foreground">截止时间</p>
                                    <p className="font-medium">{new Date(experiment.dueDate).toLocaleString()}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <Users className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <p className="text-sm text-muted-foreground">已提交 / 总人数</p>
                                    <p className="font-medium">
                                        {progressData?.filter(s => s.status === 'submitted' || s.status === 'evaluated').length || 0} / {progressData?.length || 0}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <FileCode className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <p className="text-sm text-muted-foreground">已评分</p>
                                    <p className="font-medium">
                                        {progressData?.filter((s: any) => s.status === 'evaluated').length || 0}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="submissions">
                    <TabsList>
                        <TabsTrigger value="submissions">班级进度</TabsTrigger>
                        <TabsTrigger value="details">实验详情</TabsTrigger>
                        <TabsTrigger value="knowledge">关联知识点</TabsTrigger>
                    </TabsList>

                    <TabsContent value="submissions" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>学生提交状态</CardTitle>
                                <CardDescription>查看每位学生的实验进度</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0">
                                {!progressData || progressData.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        暂无班级数据
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>学号</TableHead>
                                                <TableHead>姓名</TableHead>
                                                <TableHead>状态</TableHead>
                                                <TableHead>最近活动</TableHead>
                                                <TableHead>得分</TableHead>
                                                <TableHead>操作</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {progressData.map((row: any) => (
                                                <TableRow key={row.studentId}>
                                                    <TableCell className="font-mono">{row.studentId}</TableCell>
                                                    <TableCell>{row.name}</TableCell>
                                                    <TableCell>{getStatusBadge(row.status)}</TableCell>
                                                    <TableCell>
                                                        {row.lastActionAt ? new Date(row.lastActionAt).toLocaleString() : '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {row.score ? `${row.score}分` : '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {row.submissionId && (row.status === 'submitted' || row.status === 'evaluated') ? (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setSelectedSubmission({
                                                                        id: row.submissionId,
                                                                        studentName: row.name,
                                                                        studentId: row.studentId,
                                                                        score: row.score
                                                                    });
                                                                    setGradeDialogOpen(true);
                                                                }}
                                                            >
                                                                {row.status === 'evaluated' ? '重新评分' : '评分'}
                                                            </Button>
                                                        ) : (
                                                            <Button variant="ghost" size="sm" disabled className="text-muted-foreground">
                                                                无提交
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="details" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>实验要求</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="prose max-w-none">
                                    <p>{experiment.description || "暂无描述"}</p>
                                    {experiment.requirements && (
                                        <>
                                            <h4>具体要求</h4>
                                            <p>{experiment.requirements}</p>
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="knowledge" className="mt-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>关联知识点</CardTitle>
                                    <CardDescription>管理本实验关联的课程知识点</CardDescription>
                                </div>
                                <KnowledgePointManager
                                    courseId={experiment.courseId}
                                    linkedKPs={linkedKPs || []}
                                    onLink={(kpId) => linkPointMutation.mutate({
                                        knowledgePointId: kpId,
                                        experimentId: experiment.id
                                    })}
                                    onUnlink={(relId) => unlinkPointMutation.mutate({ relationId: relId })}
                                    isLoading={pointOperationsLoading}
                                />
                            </CardHeader>
                            <CardContent>
                                {!linkedKPs || linkedKPs.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                                        暂未关联知识点，点击右上角添加
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {linkedKPs.map((kp: any) => (
                                            <Badge key={kp.id} variant="secondary" className="px-3 py-1 bg-slate-100 hover:bg-slate-200 gap-2 text-sm">
                                                <div className="flex items-center gap-1">
                                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                                    {kp.name}
                                                </div>
                                                <button
                                                    className="ml-1 text-slate-400 hover:text-red-500 transition-colors"
                                                    onClick={() => unlinkPointMutation.mutate({ relationId: kp.relationId })}
                                                >
                                                    <XCircle className="h-3 w-3" />
                                                </button>
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Grade Dialog */}
            <Dialog open={gradeDialogOpen} onOpenChange={setGradeDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>评分 - {selectedSubmission?.studentName}</DialogTitle>
                        <DialogDescription>
                            学号: {selectedSubmission?.studentId}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {/* AI Score Reference */}
                        {!!detailSubmission?.evaluationResult && (detailSubmission.evaluationResult as any).aiScore !== undefined && (
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">AI 评分参考</span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-blue-600 border-blue-200 hover:bg-blue-100"
                                        onClick={() => setGradeForm({
                                            ...gradeForm,
                                            score: String((detailSubmission.evaluationResult as any).aiScore || detailSubmission.score || "")
                                        })}
                                    >
                                        采用 AI 分数
                                    </Button>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-3xl font-bold text-blue-600">
                                        {(detailSubmission.evaluationResult as any).aiScore || detailSubmission.score}
                                    </div>
                                    <div className="flex-1 text-sm text-muted-foreground">
                                        {detailSubmission.feedback || (detailSubmission.evaluationResult as any).feedback || "无 AI 评语"}
                                    </div>
                                </div>
                                {(detailSubmission.evaluationResult as any).suggestions && (
                                    <div className="mt-2 text-xs text-blue-600/80">
                                        <strong>建议:</strong> {(detailSubmission.evaluationResult as any).suggestions}
                                    </div>
                                )}
                            </div>
                        )}

                        <div>
                            <Label className="text-sm font-medium">提交的代码</Label>
                            <pre className="mt-2 p-4 bg-muted rounded-lg overflow-auto max-h-48 text-sm font-mono">
                                {detailSubmission?.code || "无代码内容"}
                            </pre>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>综合评分 (0-100) *</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={gradeForm.score}
                                    onChange={(e) => setGradeForm({ ...gradeForm, score: e.target.value })}
                                    placeholder="输入最终分数"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>评语</Label>
                            <Textarea
                                rows={3}
                                value={gradeForm.feedback}
                                onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })}
                                placeholder="输入评语..."
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setGradeDialogOpen(false)}>取消</Button>
                        <Button onClick={handleGrade} disabled={evaluateMutation.isPending}>
                            {evaluateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            确认评分
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
