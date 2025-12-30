import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Users, Plus, Search } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

export default function ClassList() {
  const { data: classes, isLoading } = trpc.classes.list.useQuery();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredClasses = classes?.filter(cls =>
    cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.major?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">班级管理</h2>
            <p className="text-muted-foreground mt-2">管理您的所有班级</p>
          </div>
          <Link href="/teacher/classes/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              创建班级
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索班级名称或专业..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">加载中...</div>
        ) : filteredClasses && filteredClasses.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredClasses.map((cls) => (
              <Link key={cls.id} href={`/teacher/classes/${cls.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <Users className="h-8 w-8 text-primary" />
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                        {cls.grade}级
                      </span>
                    </div>
                    <CardTitle className="mt-4">{cls.name}</CardTitle>
                    <CardDescription>{cls.major || '未指定专业'}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      <p>年级: {cls.grade || '未指定'}</p>
                      <p className="mt-1">学生人数: {cls.studentCount || 0}人</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">暂无班级</p>
              <Link href="/teacher/classes/create">
                <Button className="mt-4" variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  创建第一个班级
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
