import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  Users,
  BookOpen,
  GraduationCap,
  FileText,
  ClipboardList,
  Database,
  FlaskConical,
  TrendingUp,
  Activity,
  ArrowUpRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

export default function AdminDashboard() {
  const { data: stats, isLoading } = trpc.stats.overview.useQuery();

  if (isLoading || !stats) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  const statItems = [
    {
      title: "总用户数",
      value: stats.userCount,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "总课程数",
      value: stats.courseCount,
      icon: BookOpen,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "总班级数",
      value: stats.classCount,
      icon: GraduationCap,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      title: "实验项目",
      value: stats.experimentCount,
      icon: FlaskConical,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  const roleData = [
    { name: "学生", value: stats.roleDistribution?.student || 0 },
    { name: "教师", value: stats.roleDistribution?.teacher || 0 },
    { name: "管理员", value: stats.roleDistribution?.admin || 0 },
  ];

  // Mock activity data since we don't have real logs for this yet
  const activityData = [
    { name: "周一", active: 20 },
    { name: "周二", active: 45 },
    { name: "周三", active: 30 },
    { name: "周四", active: 80 },
    { name: "周五", active: 55 },
    { name: "周六", active: 15 },
    { name: "周日", active: 10 },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">管理员仪表板</h2>
            <p className="text-muted-foreground mt-1">
              欢迎回来，查看平台概况与数据统计
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/users">
              <Button variant="outline" className="gap-2">
                <Users className="h-4 w-4" />
                用户管理
              </Button>
            </Link>
            <Link href="/admin/courses">
              <Button className="gap-2">
                <BookOpen className="h-4 w-4" />
                课程管理
              </Button>
            </Link>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statItems.map((item) => (
            <Card key={item.title} className="border-none shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-slate-600">
                  {item.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${item.bg}`}>
                  <item.icon className={`h-4 w-4 ${item.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{item.value}</div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-green-600 font-medium">+2.5%</span> 较上周
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                平台活跃度趋势
              </CardTitle>
              <CardDescription>
                过去7天的用户活跃情况（基于模拟在近期的操作）
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                  />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar
                    dataKey="active"
                    fill="currentColor"
                    radius={[4, 4, 0, 0]}
                    className="fill-primary"
                    barSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="col-span-3 shadow-sm">
            <CardHeader>
              <CardTitle>用户角色分布</CardTitle>
              <CardDescription>各角色用户占比情况</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={roleData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {roleData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-6 mt-4">
                {roleData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm text-slate-600">
                      {entry.name}: {entry.value}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Lists */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Recent Users */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>最新注册用户</CardTitle>
                <CardDescription>最近加入平台的5位用户</CardDescription>
              </div>
              <Link href="/admin/users">
                <Button variant="ghost" size="sm" className="gap-1">
                  查看全部 <ArrowUpRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.recentUsers?.map((user: any) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-slate-50/50 rounded-lg border border-slate-100/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {user.name?.[0] || user.username[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{user.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {user.username}
                        </div>
                      </div>
                    </div>
                    <Badge variant={user.role === "teacher" ? "default" : "secondary"}>
                      {user.role === "student" ? "学生" :
                        user.role === "teacher" ? "教师" : "管理员"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Courses */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>最新课程</CardTitle>
                <CardDescription>最近创建的5门课程</CardDescription>
              </div>
              <Link href="/admin/courses">
                <Button variant="ghost" size="sm" className="gap-1">
                  查看全部 <ArrowUpRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.recentCourses?.map((course: any) => (
                  <div
                    key={course.id}
                    className="flex items-center justify-between p-3 bg-slate-50/50 rounded-lg border border-slate-100/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">{course.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {course.code}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(course.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}