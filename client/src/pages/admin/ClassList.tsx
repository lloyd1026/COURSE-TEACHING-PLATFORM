import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

export default function ClassList() {
  const { data: classes, isLoading } = trpc.classes.list.useQuery();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">班级管理</h1>
          <p className="text-muted-foreground">管理系统中的所有班级</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>班级列表</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">加载中...</div>
            ) : !classes || classes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">暂无班级数据</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>班级名称</TableHead>
                    <TableHead>年级</TableHead>
                    <TableHead>专业</TableHead>
                    <TableHead>学生人数</TableHead>
                    <TableHead>创建时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes.map((cls: any) => (
                    <TableRow key={cls.id}>
                      <TableCell>{cls.id}</TableCell>
                      <TableCell className="font-medium">{cls.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{cls.grade}</Badge>
                      </TableCell>
                      <TableCell>{cls.major || "-"}</TableCell>
                      <TableCell>{cls.studentCount || 0}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {cls.createdAt
                          ? new Date(cls.createdAt).toLocaleDateString("zh-CN")
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
