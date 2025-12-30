import { useParams, Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Clock, Users, FileText, Loader2 } from "lucide-react";

export default function ExamDetail() {
  const { id } = useParams<{ id: string }>();
  const examId = parseInt(id || "0");
  
  const { data: exam, isLoading } = trpc.exams.get.useQuery({ id: examId });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!exam) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">考试不存在</p>
          <Link href="/teacher/exams">
            <Button variant="link">返回考试列表</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ongoing':
        return <Badge className="bg-green-100 text-green-800">进行中</Badge>;
      case 'ended':
        return <Badge variant="secondary">已结束</Badge>;
      default:
        return <Badge variant="outline">未开始</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/teacher/exams">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{exam.title}</h1>
              {getStatusBadge(exam.status || 'draft')}
            </div>
            <p className="text-muted-foreground">
              开始时间: {new Date(exam.startTime).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{exam.duration}</p>
                  <p className="text-sm text-muted-foreground">分钟</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{exam.totalScore || 100}</p>
                  <p className="text-sm text-muted-foreground">总分</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-sm text-muted-foreground">参考人数</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>考试说明</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{exam.description || "暂无考试说明"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>考生成绩</CardTitle>
            <CardDescription>查看考生答题情况和成绩</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无考生成绩</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
