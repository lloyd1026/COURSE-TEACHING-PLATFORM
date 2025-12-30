import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { BookOpen, FileText, ClipboardList, Brain } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function StudentDashboard() {
  // const { data: profile } = trpc.students.getProfile.useQuery();

  const stats = [
    {
      title: "我的课程",
      value: 0,
      icon: BookOpen,
      href: "/student/courses",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "待提交作业",
      value: 0,
      icon: FileText,
      href: "/student/assignments",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "即将考试",
      value: 0,
      icon: ClipboardList,
      href: "/student/exams",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "AI助教",
      value: "在线",
      icon: Brain,
      href: "/student/ai-assistant",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">学生工作台</h2>
          <p className="text-muted-foreground mt-2">
            欢迎回来!继续您的学习之旅
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
            <Link href="/student/courses">
              <Button variant="outline" className="w-full justify-start">
                <BookOpen className="mr-2 h-4 w-4" />
                浏览课程
              </Button>
            </Link>
            <Link href="/student/assignments">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="mr-2 h-4 w-4" />
                查看作业
              </Button>
            </Link>
            <Link href="/student/exams">
              <Button variant="outline" className="w-full justify-start">
                <ClipboardList className="mr-2 h-4 w-4" />
                我的考试
              </Button>
            </Link>
            <Link href="/student/ai-assistant">
              <Button variant="outline" className="w-full justify-start">
                <Brain className="mr-2 h-4 w-4" />
                AI助教
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Learning Progress */}
        <Card>
          <CardHeader>
            <CardTitle>学习进度</CardTitle>
            <CardDescription>您的最近学习活动</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              暂无学习记录
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
