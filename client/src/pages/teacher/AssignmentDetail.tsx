import { useParams, Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowLeft, FileText, Users, Clock, Loader2, XCircle } from "lucide-react";
import { KnowledgePointManager } from "@/components/KnowledgePointManager";

export default function AssignmentDetail() {
  const { id } = useParams<{ id: string }>();
  const assignmentId = parseInt(id || "0");

  const { data: assignment, isLoading } = trpc.assignments.get.useQuery({ id: assignmentId });

  const { data: linkedKPs, refetch: refetchLinkedKPs } = trpc.knowledge.getLinkedPoints.useQuery(
    { entityType: "assignment", entityId: assignmentId },
    { enabled: !!assignmentId }
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

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!assignment) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">作业不存在</p>
          <Link href="/teacher/assignments">
            <Button variant="link">返回作业列表</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center gap-4">
          <Link href="/teacher/assignments">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{assignment.title}</h1>
              {getStatusBadge(assignment.status || 'draft')}
            </div>
            <p className="text-muted-foreground">
              截止时间: {new Date(assignment.dueDate).toLocaleString()}
            </p>
          </div>
        </div>

        {/* 作业概览 */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{(assignment as any).totalScore || 100}</p>
                  <p className="text-sm text-muted-foreground">总分</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-sm text-muted-foreground">已提交</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-sm text-muted-foreground">待批改</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* 作业内容 */}
            <Card>
              <CardHeader>
                <CardTitle>作业内容</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <p className="whitespace-pre-wrap">{assignment.description || "暂无作业描述"}</p>
                </div>
              </CardContent>
            </Card>

            {/* 提交列表 */}
            <Card>
              <CardHeader>
                <CardTitle>学生提交</CardTitle>
                <CardDescription>查看和批改学生提交的作业</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>暂无学生提交</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* 关联知识点 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">关联知识点</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <KnowledgePointManager
                  courseId={assignment.courseId}
                  linkedKPs={linkedKPs || []}
                  onLink={(kpId) => linkPointMutation.mutate({
                    knowledgePointId: kpId,
                    assignmentId: assignment.id
                  })}
                  onUnlink={(relId) => unlinkPointMutation.mutate({ relationId: relId })}
                  isLoading={pointOperationsLoading}
                />

                <div className="flex flex-wrap gap-2 mt-2">
                  {!linkedKPs || linkedKPs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">暂未关联课程知识点</p>
                  ) : (
                    linkedKPs.map((kp: any) => (
                      <Badge key={kp.id} variant="secondary" className="px-2 py-1 bg-slate-100 hover:bg-slate-200 gap-1 text-xs">
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                          {kp.name}
                        </div>
                        <button
                          className="ml-1 text-slate-400 hover:text-red-500 transition-colors"
                          onClick={() => unlinkPointMutation.mutate({ relationId: kp.relationId })}
                        >
                          <XCircle className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
