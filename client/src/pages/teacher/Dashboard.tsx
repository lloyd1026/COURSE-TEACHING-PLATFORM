import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { BookOpen, Users, FileText, ClipboardList } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function TeacherDashboard() {
  const { data: courses, isLoading: coursesLoading } = trpc.courses.list.useQuery();
  const { data: classes, isLoading: classesLoading } = trpc.classes.list.useQuery();

  const stats = [
    {
      title: "我的课程",
      value: courses?.length || 0,
      icon: BookOpen,
      href: "/teacher/courses",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "我的班级",
      value: classes?.length || 0,
      icon: Users,
      href: "/teacher/classes",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "待批改作业",
      value: 0,
      icon: FileText,
      href: "/teacher/assignments",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "进行中考试",
      value: 0,
      icon: ClipboardList,
      href: "/teacher/exams",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">教师工作台</h2>
          <p className="text-muted-foreground mt-2">
            欢迎回来!这里是您的教学管理中心
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link key={stat.title} href={stat.href}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <Icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stat.value}</div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>快速操作</CardTitle>
            <CardDescription>常用功能快捷入口</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Link href="/teacher/courses/create">
              <Button variant="outline" className="w-full justify-start">
                <BookOpen className="mr-2 h-4 w-4" />
                创建课程
              </Button>
            </Link>
            <Link href="/teacher/assignments/create">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="mr-2 h-4 w-4" />
                布置作业
              </Button>
            </Link>
            <Link href="/teacher/exams/create">
              <Button variant="outline" className="w-full justify-start">
                <ClipboardList className="mr-2 h-4 w-4" />
                创建考试
              </Button>
            </Link>
            <Link href="/teacher/questions">
              <Button variant="outline" className="w-full justify-start">
                <BookOpen className="mr-2 h-4 w-4" />
                题库管理
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Courses */}
        <Card>
          <CardHeader>
            <CardTitle>最近的课程</CardTitle>
            <CardDescription>您最近创建或更新的课程</CardDescription>
          </CardHeader>
          <CardContent>
            {coursesLoading ? (
              <div className="text-center py-8 text-muted-foreground">加载中...</div>
            ) : courses && courses.length > 0 ? (
              <div className="space-y-4">
                {courses.slice(0, 5).map((course) => (
                  <Link key={course.id} href={`/teacher/courses/${course.id}`}>
                    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                      <div>
                        <h3 className="font-medium">{course.name}</h3>
                        <p className="text-sm text-muted-foreground">{course.code}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          course.status === 'active' ? 'bg-green-100 text-green-700' :
                          course.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {course.status === 'active' ? '进行中' : course.status === 'draft' ? '草稿' : '已归档'}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                暂无课程,<Link href="/teacher/courses/create"><a className="text-primary hover:underline">创建第一个课程</a></Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
