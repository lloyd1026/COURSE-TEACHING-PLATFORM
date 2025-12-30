import { useState } from "react";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Search, FlaskConical, Loader2 } from "lucide-react";

export default function StudentExperimentList() {
  const [search, setSearch] = useState("");

  const { data: experiments, isLoading } = trpc.experiments.list.useQuery();

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

  const filteredExperiments = experiments?.filter((e: any) =>
    e.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">我的实验</h1>
          <p className="text-muted-foreground">查看和提交编程实验</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索实验..."
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
            ) : filteredExperiments && filteredExperiments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>实验名称</TableHead>
                    <TableHead>截止时间</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExperiments.map((exp: any) => (
                    <TableRow key={exp.id}>
                      <TableCell className="font-medium">{exp.title}</TableCell>
                      <TableCell>{new Date(exp.dueDate).toLocaleString()}</TableCell>
                      <TableCell>{getStatusBadge(exp.status || 'pending', exp.dueDate)}</TableCell>
                      <TableCell>
                        <Link href={`/student/experiments/${exp.id}`}>
                          <Button variant="ghost" size="sm">查看</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <FlaskConical className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">暂无实验</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
