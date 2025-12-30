import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { BookOpen, Users, GraduationCap, Brain, FileText, ClipboardList, LogIn, UserPlus } from "lucide-react";
import { useEffect } from "react";
import { useLocation, Link } from "wouter";

export default function Home() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && user) {
      // 根据用户角色重定向到对应的仪表板
      if (user.role === 'admin') {
        setLocation('/admin/dashboard');
      } else if (user.role === 'teacher') {
        setLocation('/teacher/dashboard');
      } else {
        setLocation('/student/dashboard');
      }
    }
  }, [user, loading, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-gray-900">课程智慧教学平台</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="outline" className="gap-2">
                <LogIn className="h-4 w-4" />
                登录
              </Button>
            </Link>
            <Link href="/register">
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                教师注册
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="container">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              智能化教学管理平台
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              为教师、学生和管理员提供完整的在线教学解决方案，支持课程管理、作业批改、在线考试、AI助教等功能
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/login">
                <Button size="lg" className="text-lg px-8 gap-2">
                  <LogIn className="h-5 w-5" />
                  立即登录
                </Button>
              </Link>
              <Link href="/register">
                <Button size="lg" variant="outline" className="text-lg px-8 gap-2">
                  <UserPlus className="h-5 w-5" />
                  教师注册
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              学生账户由教师创建，无需自行注册
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white/50">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">核心功能</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <BookOpen className="h-10 w-10 text-primary mb-2" />
                <CardTitle>课程管理</CardTitle>
                <CardDescription>
                  创建和管理课程，支持富文本编辑、课程大纲、状态控制等完整功能
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <Users className="h-10 w-10 text-primary mb-2" />
                <CardTitle>班级管理</CardTitle>
                <CardDescription>
                  按年级专业分组管理班级，支持学生名单管理和课程关联
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <FileText className="h-10 w-10 text-primary mb-2" />
                <CardTitle>作业系统</CardTitle>
                <CardDescription>
                  在线布置作业、学生提交、教师批改打分，支持文件上传
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <Brain className="h-10 w-10 text-primary mb-2" />
                <CardTitle>AI助教</CardTitle>
                <CardDescription>
                  智能作业解析、学生答疑，提供个性化学习辅导
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <ClipboardList className="h-10 w-10 text-primary mb-2" />
                <CardTitle>在线考试</CardTitle>
                <CardDescription>
                  创建考试、在线答题、自动评分、成绩统计分析
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <GraduationCap className="h-10 w-10 text-primary mb-2" />
                <CardTitle>知识图谱</CardTitle>
                <CardDescription>
                  构建课程知识体系，关联作业题目，帮助学生理解知识结构
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="py-16">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">多角色支持</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">管理员</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• 用户管理</li>
                  <li>• 系统配置</li>
                  <li>• 数据统计</li>
                  <li>• 权限控制</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">教师</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• 课程管理</li>
                  <li>• 作业布置与批改</li>
                  <li>• 考试创建与评分</li>
                  <li>• 题库管理</li>
                  <li>• 批量创建学生账户</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">学生</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• 课程学习</li>
                  <li>• 作业提交</li>
                  <li>• 在线考试</li>
                  <li>• AI助教答疑</li>
                  <li>• 学习进度查看</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary/5">
        <div className="container text-center">
          <h2 className="text-3xl font-bold mb-4">准备好开始了吗？</h2>
          <p className="text-gray-600 mb-8">立即注册成为教师，开始您的智能教学之旅</p>
          <div className="flex gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                <UserPlus className="h-5 w-5" />
                教师注册
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="gap-2">
                <LogIn className="h-5 w-5" />
                已有账户？登录
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-sm py-8">
        <div className="container text-center text-sm text-gray-600">
          <p>© 2025 课程智慧教学平台. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
