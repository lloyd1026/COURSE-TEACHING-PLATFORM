import { useState } from "react";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Search, Plus, HelpCircle, Loader2 } from "lucide-react";

export default function QuestionBank() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");

  const { data: questions, isLoading } = trpc.questions.list.useQuery();

  const getTypeBadge = (type: string) => {
    const types: Record<string, string> = {
      'single_choice': '单选题',
      'multiple_choice': '多选题',
      'fill_blank': '填空题',
      'short_answer': '简答题',
      'programming': '编程题',
    };
    return <Badge variant="outline">{types[type] || type}</Badge>;
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return <Badge className="bg-green-100 text-green-800">简单</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">中等</Badge>;
      case 'hard':
        return <Badge className="bg-red-100 text-red-800">困难</Badge>;
      default:
        return <Badge variant="secondary">{difficulty}</Badge>;
    }
  };

  const filteredQuestions = questions?.filter((q: any) => {
    const matchSearch = q.content.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || q.type === typeFilter;
    const matchDifficulty = difficultyFilter === "all" || q.difficulty === difficultyFilter;
    return matchSearch && matchType && matchDifficulty;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">题库管理</h1>
            <p className="text-muted-foreground">管理课程题目和试题</p>
          </div>
          <Link href="/teacher/questions/create">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              添加题目
            </Button>
          </Link>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索题目..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="题型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部题型</SelectItem>
                  <SelectItem value="single_choice">单选题</SelectItem>
                  <SelectItem value="multiple_choice">多选题</SelectItem>
                  <SelectItem value="fill_blank">填空题</SelectItem>
                  <SelectItem value="short_answer">简答题</SelectItem>
                  <SelectItem value="programming">编程题</SelectItem>
                </SelectContent>
              </Select>
              <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="难度" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部难度</SelectItem>
                  <SelectItem value="easy">简单</SelectItem>
                  <SelectItem value="medium">中等</SelectItem>
                  <SelectItem value="hard">困难</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredQuestions && filteredQuestions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50%]">题目内容</TableHead>
                    <TableHead>题型</TableHead>
                    <TableHead>难度</TableHead>
                    <TableHead>分值</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuestions.map((q: any) => (
                    <TableRow key={q.id}>
                      <TableCell className="font-medium">
                        <p className="line-clamp-2">{q.content}</p>
                      </TableCell>
                      <TableCell>{getTypeBadge(q.type)}</TableCell>
                      <TableCell>{getDifficultyBadge(q.difficulty)}</TableCell>
                      <TableCell>{q.score}分</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">编辑</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <HelpCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">暂无题目</p>
                <Link href="/teacher/questions/create">
                  <Button variant="link">添加第一道题目</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
