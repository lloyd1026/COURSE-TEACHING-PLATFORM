import { useParams, Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, FileText, Users, Clock, Loader2 } from "lucide-react";

export default function AssignmentDetail() {
  const { id } = useParams<{ id: string }>();
  const assignmentId = parseInt(id || "0");
  
  const { data: assignment, isLoading } = trpc.assignments.get.useQuery({ id: assignmentId });

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
    </DashboardLayout>
  );
}
