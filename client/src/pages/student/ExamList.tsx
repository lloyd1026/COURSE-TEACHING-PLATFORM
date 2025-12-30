import { useState } from "react";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Search, ClipboardList, Loader2 } from "lucide-react";

export default function StudentExamList() {
  const [search, setSearch] = useState("");

  const { data: exams, isLoading } = trpc.exams.list.useQuery();

  const getStatusBadge = (status: string, startTime: Date) => {
    const now = new Date();
    const start = new Date(startTime);
    if (status === 'ended') {
      return <Badge variant="secondary">已结束</Badge>;
    }
    if (status === 'ongoing' || (start <= now)) {
      return <Badge className="bg-green-100 text-green-800">进行中</Badge>;
    }
    return <Badge variant="outline">未开始</Badge>;
  };

  const filteredExams = exams?.filter((e: any) =>
    e.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">我的考试</h1>
          <p className="text-muted-foreground">查看考试安排和成绩</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索考试..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredExams && filteredExams.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>考试名称</TableHead>
                    <TableHead>开始时间</TableHead>
                    <TableHead>时长</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExams.map((exam: any) => (
                    <TableRow key={exam.id}>
                      <TableCell className="font-medium">{exam.title}</TableCell>
                      <TableCell>{new Date(exam.startTime).toLocaleString()}</TableCell>
                      <TableCell>{exam.duration}分钟</TableCell>
                      <TableCell>{getStatusBadge(exam.status || 'draft', exam.startTime)}</TableCell>
                      <TableCell>
                        <Link href={`/student/exams/${exam.id}`}>
                          <Button variant="ghost" size="sm">
                            {exam.status === 'ongoing' ? '进入考试' : '查看'}
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">暂无考试</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
