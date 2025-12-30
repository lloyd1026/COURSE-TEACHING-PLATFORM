import { useParams, Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, BookOpen, Users, FileText, ClipboardList, Loader2 } from "lucide-react";

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const courseId = parseInt(id || "0");
  
  const { data: course, isLoading } = trpc.courses.get.useQuery({ id: courseId });
  const { data: assignments } = trpc.assignments.list.useQuery();
  const { data: exams } = trpc.exams.list.useQuery();

  const courseAssignments = assignments?.filter((a: any) => a.courseId === courseId) || [];
  const courseExams = exams?.filter((e: any) => e.courseId === courseId) || [];

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!course) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">课程不存在</p>
          <Link href="/teacher/courses">
            <Button variant="link">返回课程列表</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-100 text-green-800">已发布</Badge>;
      case 'archived':
        return <Badge variant="secondary">已归档</Badge>;
      default:
        return <Badge variant="outline">草稿</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/teacher/courses">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{course.name}</h1>
              {getStatusBadge(course.status || 'draft')}
            </div>
            <p className="text-muted-foreground">{course.code || "未设置课程代码"}</p>
          </div>
          <Link href={`/teacher/courses/${courseId}/edit`}>
            <Button variant="outline">编辑课程</Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-sm text-muted-foreground">学生人数</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{courseAssignments.length}</p>
                  <p className="text-sm text-muted-foreground">作业数量</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <ClipboardList className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{courseExams.length}</p>
                  <p className="text-sm text-muted-foreground">考试数量</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="outline">
          <TabsList>
            <TabsTrigger value="outline">课程大纲</TabsTrigger>
            <TabsTrigger value="assignments">作业记录</TabsTrigger>
            <TabsTrigger value="exams">考试记录</TabsTrigger>
          </TabsList>
          <TabsContent value="outline" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>课程介绍</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <p className="whitespace-pre-wrap">{course.description || "暂无课程介绍"}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="assignments" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>作业记录</CardTitle>
                <CardDescription>课程历史作业列表</CardDescription>
              </CardHeader>
              <CardContent>
                {courseAssignments.length > 0 ? (
                  <div className="space-y-3">
                    {courseAssignments.map((assignment: any) => (
                      <div key={assignment.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{assignment.title}</p>
                          <p className="text-sm text-muted-foreground">
                            截止: {new Date(assignment.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                        <Link href={`/teacher/assignments/${assignment.id}`}>
                          <Button variant="ghost" size="sm">查看</Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>暂无作业记录</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="exams" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>考试记录</CardTitle>
                <CardDescription>课程历史考试列表</CardDescription>
              </CardHeader>
              <CardContent>
                {courseExams.length > 0 ? (
                  <div className="space-y-3">
                    {courseExams.map((exam: any) => (
                      <div key={exam.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{exam.title}</p>
                          <p className="text-sm text-muted-foreground">
                            开始: {new Date(exam.startTime).toLocaleDateString()}
                          </p>
                        </div>
                        <Link href={`/teacher/exams/${exam.id}`}>
                          <Button variant="ghost" size="sm">查看</Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>暂无考试记录</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
