import { useState } from "react";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Search, FileText, Loader2 } from "lucide-react";

export default function StudentAssignmentList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: assignments, isLoading } = trpc.assignments.list.useQuery();

  const getStatusBadge = (status: string, dueDate: Date) => {
    const now = new Date();
    const due = new Date(dueDate);
    if (status === 'submitted') {
      return <Badge className="bg-green-100 text-green-800">已提交</Badge>;
    }
    if (due < now) {
      return <Badge variant="destructive">已截止</Badge>;
    }
    return <Badge variant="outline">待提交</Badge>;
  };

  const filteredAssignments = assignments?.filter((a: any) => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">我的作业</h1>
          <p className="text-muted-foreground">查看和提交课程作业</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索作业..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="pending">待提交</SelectItem>
                  <SelectItem value="submitted">已提交</SelectItem>
                  <SelectItem value="graded">已批改</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredAssignments && filteredAssignments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>作业名称</TableHead>
                    <TableHead>截止时间</TableHead>
                    <TableHead>总分</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssignments.map((assignment: any) => (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">{assignment.title}</TableCell>
                      <TableCell>{new Date(assignment.dueDate).toLocaleString()}</TableCell>
                      <TableCell>{assignment.totalScore}分</TableCell>
                      <TableCell>{getStatusBadge(assignment.status || 'pending', assignment.dueDate)}</TableCell>
                      <TableCell>
                        <Link href={`/student/assignments/${assignment.id}`}>
                          <Button variant="ghost" size="sm">查看</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">暂无作业</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
