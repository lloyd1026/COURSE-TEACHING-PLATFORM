import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Users, BookOpen, GraduationCap, FileText, ClipboardList, Database, FlaskConical } from "lucide-react";

export default function AdminDashboard() {
  const { data: stats } = trpc.stats.overview.useQuery();

  const statItems = [
    {
      title: "总用户数",
      value: stats?.userCount || 0,
      icon: Users,
    },
    {
      title: "总课程数",
      value: stats?.courseCount || 0,
      icon: BookOpen,
    },
    {
      title: "总班级数",
      value: stats?.classCount || 0,
      icon: GraduationCap,
    },
    {
      title: "作业总数",
      value: stats?.assignmentCount || 0,
      icon: FileText,
    },
    {
      title: "考试总数",
      value: stats?.examCount || 0,
      icon: ClipboardList,
    },
    {
      title: "题库题目",
      value: stats?.questionCount || 0,
      icon: Database,
    },
    {
      title: "实验项目",
      value: stats?.experimentCount || 0,
      icon: FlaskConical,
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">管理员仪表板</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statItems.map((item) => (
            <Card key={item.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
                <item.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{item.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}