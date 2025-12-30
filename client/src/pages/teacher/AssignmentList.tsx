import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { FileText, Plus } from "lucide-react";
import { Link } from "wouter";

export default function AssignmentList() {
  const { data: assignments, isLoading } = trpc.assignments.list.useQuery();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">作业管理</h2>
            <p className="text-muted-foreground mt-2">管理您的所有作业</p>
          </div>
          <Link href="/teacher/assignments/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              创建作业
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="text-center py-12">加载中...</div>
        ) : assignments && assignments.length > 0 ? (
          <div className="grid gap-4">
            {assignments.map((assignment) => (
              <Link key={assignment.id} href={`/teacher/assignments/${assignment.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="h-6 w-6 text-primary" />
                        <div>
                          <CardTitle>{assignment.title}</CardTitle>
                          <CardDescription className="mt-1">
                            课程 ID: {assignment.courseId}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant={
                        assignment.status === 'published' ? 'default' :
                        assignment.status === 'draft' ? 'secondary' : 'outline'
                      }>
                        {assignment.status === 'published' ? '已发布' :
                         assignment.status === 'draft' ? '草稿' : '已截止'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>截止时间: {new Date(assignment.dueDate).toLocaleString('zh-CN')}</span>
                      <span>状态: {assignment.status === 'published' ? '已发布' : assignment.status === 'draft' ? '草稿' : '已关闭'}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">暂无作业</p>
              <Link href="/teacher/assignments/create">
                <Button className="mt-4" variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  创建第一个作业
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}