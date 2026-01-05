import DashboardLayout from "@/components/DashboardLayout";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useRoute } from "wouter";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Trophy, AlertTriangle, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

export default function ExamStatistics() {
    const [, params] = useRoute("/teacher/exams/:id/statistics");
    const examId = parseInt(params?.id || "0");

    const { data: stats, isLoading } = trpc.exams.getStats.useQuery(
        { examId },
        { enabled: !!examId }
    );

    const { data: exam } = trpc.exams.get.useQuery({ id: examId });

    if (isLoading || !stats) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </DashboardLayout>
        );
    }

    // 计算题目类型中文显示
    const getQuestionTypeLabel = (type: string) => {
        const map: Record<string, string> = {
            single_choice: "单选题",
            multiple_choice: "多选题",
            true_false: "判断题",
            fill_in: "填空题",
            subjective: "主观题",
            code: "编程题"
        };
        return map[type] || type;
    };

    return (
        <DashboardLayout>
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href="/teacher/exams">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">考试统计分析</h2>
                        <p className="text-muted-foreground">
                            {exam?.title} · 统计报告
                        </p>
                    </div>
                </div>

                {/* Overview Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">参加人数</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.submitted} / {stats.totalStudents}</div>
                            <p className="text-xs text-muted-foreground">
                                提交率 {stats.totalStudents > 0 ? ((stats.submitted / stats.totalStudents) * 100).toFixed(0) : 0}%
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">平均分</CardTitle>
                            <Trophy className="h-4 w-4 text-yellow-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.avgScore}</div>
                            <p className="text-xs text-muted-foreground">
                                最高分 {stats.maxScore} · 最低分 {stats.minScore}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">待批改</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.pending}</div>
                            <p className="text-xs text-muted-foreground">
                                已批改 {stats.graded} 份试卷
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">及格率</CardTitle>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {/* 简单估算：60分以上算及格。这里前端算一下或者后端传 */}
                                {(() => {
                                    const passCount = stats.scoreDistribution?.filter(x => x.min >= 60).reduce((a, b) => a + b.count, 0) || 0;
                                    return stats.submitted > 0 ? ((passCount / stats.submitted) * 100).toFixed(1) + "%" : "0%";
                                })()}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                以 60 分为及格线
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts Section */}
                <div className="grid gap-4 md:grid-cols-2">
                    {/* Score Distribution */}
                    <Card className="col-span-1">
                        <CardHeader>
                            <CardTitle>成绩分布</CardTitle>
                            <CardDescription>各分数段人数分布情况</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.scoreDistribution}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ borderRadius: '8px' }}
                                    />
                                    <Bar dataKey="count" fill="currentColor" radius={[4, 4, 0, 0]} className="fill-primary" barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Question Accuracy */}
                    <Card className="col-span-1">
                        <CardHeader>
                            <CardTitle>题目正确率分析</CardTitle>
                            <CardDescription>每道题目的平均正确率</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.questionAnalysis?.slice(0, 10)}> {/* Show top 10 or generic */}
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="title"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(val) => val.length > 5 ? val.substring(0, 5) + "..." : val}
                                    />
                                    <YAxis domain={[0, 100]} fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ borderRadius: '8px' }}
                                        formatter={(val: number) => [`${val}%`, '正确率']}
                                    />
                                    <Bar dataKey="accuracy" radius={[4, 4, 0, 0]} barSize={30}>
                                        {stats.questionAnalysis?.slice(0, 10).map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={entry.accuracy < 60 ? "#ef4444" : "#22c55e"} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                {/* Detailed Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>题目详细数据</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[100px]">题号</TableHead>
                                    <TableHead>题目内容</TableHead>
                                    <TableHead>类型</TableHead>
                                    <TableHead className="text-right">答题人数</TableHead>
                                    <TableHead className="text-right">正确率</TableHead>
                                    <TableHead className="text-right">错误率</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stats.questionAnalysis?.map((q: any, i: number) => (
                                    <TableRow key={q.id}>
                                        <TableCell className="font-medium">{i + 1}</TableCell>
                                        <TableCell className="max-w-[300px] truncate" title={q.title}>
                                            {q.title}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{getQuestionTypeLabel(q.type)}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">{q.totalAttempts}</TableCell>
                                        <TableCell className="text-right text-green-600 font-medium">
                                            {q.accuracy}%
                                        </TableCell>
                                        <TableCell className="text-right text-red-600 font-medium">
                                            {q.errorRate}%
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
