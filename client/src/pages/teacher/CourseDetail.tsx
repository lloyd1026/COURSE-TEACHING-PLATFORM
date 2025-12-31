import { useParams, Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { 
  ArrowLeft, BookOpen, Users, FileText, ClipboardList, 
  Loader2, Edit3, Calendar, GraduationCap, LayoutDashboard 
} from "lucide-react";

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const courseId = parseInt(id || "0");
  
  const { data: course, isLoading } = trpc.courses.get.useQuery({ id: courseId });
  const { data: assignments } = trpc.assignments.list.useQuery();
  const { data: exams } = trpc.exams.list.useQuery();

  // 数据过滤与统计
  const courseAssignments = assignments?.filter((a: any) => a.courseId === courseId) || [];
  const courseExams = exams?.filter((e: any) => e.courseId === courseId) || [];

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-slate-400 animate-pulse font-medium">正在调取课程档案...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!course) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <div className="bg-slate-50 inline-flex p-6 rounded-full mb-4">
            <BookOpen className="h-12 w-12 text-slate-300" />
          </div>
          <p className="text-xl font-bold text-slate-900">该课程档案不存在</p>
          <Link href="/teacher/courses">
            <Button variant="link" className="mt-2 text-primary">返回课程中心</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  // 状态标签美化
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm",
      archived: "bg-slate-100 text-slate-600 border-slate-200",
      draft: "bg-amber-50 text-amber-600 border-amber-100"
    };
    const labels: Record<string, string> = {
      active: "授课中",
      archived: "已归档",
      draft: "草案"
    };
    return (
      <Badge variant="outline" className={`px-3 py-1 rounded-full font-bold ${styles[status] || styles.draft}`}>
        {labels[status] || "草案"}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-10 animate-in fade-in duration-700">
        {/* 顶部面包屑与标题区 */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <Link href="/teacher/courses">
              <Button variant="ghost" size="sm" className="gap-2 text-slate-500 hover:text-primary pl-0">
                <ArrowLeft className="h-4 w-4" /> 返回我的课程
              </Button>
            </Link>
            <div className="flex flex-wrap items-center gap-4">
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">{course.name}</h1>
              {getStatusBadge(course.status || 'draft')}
            </div>
            <div className="flex items-center gap-6 text-slate-500 font-medium">
              <span className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-lg text-xs tracking-widest font-mono">
                CODE: {course.code}
              </span>
              <span className="flex items-center gap-1 text-sm">
                <Calendar className="h-4 w-4" /> {course.semester}
              </span>
              <span className="flex items-center gap-1 text-sm">
                <GraduationCap className="h-4 w-4" /> {course.credits} 学分
              </span>
            </div>
          </div>
          <Link href={`/teacher/courses/${courseId}/edit`}>
            <Button className="h-12 px-8 rounded-2xl gap-2 shadow-lg shadow-primary/20">
              <Edit3 className="h-4 w-4" /> 编辑课程信息
            </Button>
          </Link>
        </div>

        {/* 数据概览卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {[
            { icon: Users, label: "选课学生", value: "0", color: "text-indigo-600", bg: "bg-indigo-50" },
            { icon: FileText, label: "已发布作业", value: courseAssignments.length, color: "text-blue-600", bg: "bg-blue-50" },
            { icon: ClipboardList, label: "安排考试", value: courseExams.length, color: "text-orange-600", bg: "bg-orange-50" }
          ].map((stat, i) => (
            <Card key={i} className="border-none shadow-sm bg-white/50 backdrop-blur-sm group hover:shadow-md transition-all">
              <CardContent className="pt-6 flex items-center gap-5">
                <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                  <stat.icon className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-3xl font-black text-slate-900">{stat.value}</p>
                  <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 核心内容区：Tabs 切换 */}
        <Tabs defaultValue="outline" className="w-full">
          <TabsList className="bg-slate-100/50 p-1 rounded-2xl mb-6">
            <TabsTrigger value="outline" className="rounded-xl px-8 data-[state=active]:shadow-sm">课程大纲</TabsTrigger>
            <TabsTrigger value="assignments" className="rounded-xl px-8 data-[state=active]:shadow-sm">作业记录</TabsTrigger>
            <TabsTrigger value="exams" className="rounded-xl px-8 data-[state=active]:shadow-sm">考试记录</TabsTrigger>
          </TabsList>

          {/* 课程大纲：富文本解析核心 */}
          <TabsContent value="outline">
            <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2.5rem]">
              <CardHeader className="border-b border-slate-50 px-8 py-8">
                <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
                  <LayoutDashboard className="h-5 w-5 text-primary" /> 教学详细介绍
                </CardTitle>
              </CardHeader>
              <CardContent className="px-10 py-10">
                {/* 符合需求：通过 HTML 解析显示富文本 */}
                <div className="prose prose-slate max-w-none prose-headings:font-black prose-headings:tracking-tight prose-p:leading-relaxed prose-li:my-1">
                  {course.description ? (
                    <div 
                      dangerouslySetInnerHTML={{ __html: course.description }} 
                      className="course-rich-text"
                    />
                  ) : (
                    <div className="flex flex-col items-center py-12 text-slate-400 italic">
                      <p>暂无详细介绍，请点击右上方按钮编辑</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 作业列表 */}
          <TabsContent value="assignments">
            <Card className="border-none shadow-lg rounded-[2.5rem]">
              <CardHeader className="px-8 pt-8">
                <CardTitle className="text-xl">历史作业记录</CardTitle>
                <CardDescription>管理该课程下发布的所有作业任务</CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                {courseAssignments.length > 0 ? (
                  <div className="grid gap-4">
                    {courseAssignments.map((assignment: any) => (
                      <div key={assignment.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200">
                        <div className="flex items-center gap-4">
                          <div className="bg-white p-3 rounded-xl shadow-sm text-blue-500"><FileText className="h-5 w-5" /></div>
                          <div>
                            <p className="font-bold text-slate-800">{assignment.title}</p>
                            <p className="text-xs text-slate-400 font-medium">截止时间: {new Date(assignment.dueDate).toLocaleString()}</p>
                          </div>
                        </div>
                        <Link href={`/teacher/assignments/${assignment.id}`}>
                          <Button variant="outline" size="sm" className="rounded-xl font-bold">批改作业</Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-slate-50 rounded-[2rem]">
                    <FileText className="h-16 w-16 mx-auto mb-4 text-slate-200" />
                    <p className="text-slate-400 font-medium">暂无发布的作业</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 考试记录 */}
          <TabsContent value="exams">
            <Card className="border-none shadow-lg rounded-[2.5rem]">
              <CardHeader className="px-8 pt-8">
                <CardTitle className="text-xl">课程考试安排</CardTitle>
                <CardDescription>查看历史及待进行的考试</CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                {courseExams.length > 0 ? (
                  <div className="grid gap-4">
                    {courseExams.map((exam: any) => (
                      <div key={exam.id} className="flex items-center justify-between p-5 bg-orange-50/30 rounded-2xl border border-orange-100">
                        <div className="flex items-center gap-4">
                          <div className="bg-white p-3 rounded-xl shadow-sm text-orange-500"><ClipboardList className="h-5 w-5" /></div>
                          <div>
                            <p className="font-bold text-slate-800">{exam.title}</p>
                            <p className="text-xs text-slate-400 font-medium tracking-tight">
                              开始时间: {new Date(exam.startTime).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <Link href={`/teacher/exams/${exam.id}`}>
                          <Button variant="ghost" size="sm" className="rounded-xl font-bold text-orange-600 hover:bg-orange-100">结果分析</Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-slate-50 rounded-[2rem]">
                    <ClipboardList className="h-16 w-16 mx-auto mb-4 text-slate-200" />
                    <p className="text-slate-400 font-medium">暂无考试安排</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <style>{`
        .course-rich-text h1 { font-size: 2.25rem !important; line-height: 2.5rem !important; margin-top: 2rem !important; margin-bottom: 1.5rem !important; }
        .course-rich-text h2 { font-size: 1.875rem !important; line-height: 2.25rem !important; margin-top: 1.5rem !important; margin-bottom: 1rem !important; }
        .course-rich-text p { margin-bottom: 1.25rem !important; font-size: 1.125rem !important; color: #475569 !important; }
        .course-rich-text ul, .course-rich-text ol { margin-left: 2rem !important; margin-bottom: 1.5rem !important; }
        .course-rich-text ul { list-style-type: disc !important; }
        .course-rich-text blockquote { background: #f8fafc; border-left: 5px solid #cbd5e1; padding: 1.5rem; border-radius: 0.5rem; margin: 2rem 0; font-style: italic; }
      `}</style>
    </DashboardLayout>
  );
}