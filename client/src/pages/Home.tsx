import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { BookOpen, Users, GraduationCap, Brain, FileText, ClipboardList, LogIn, UserPlus, ArrowRight, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";

export default function Home() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && user) {
      const routes: Record<string, string> = {
        admin: '/admin/dashboard',
        teacher: '/teacher/dashboard',
        student: '/student/dashboard'
      };
      setLocation(routes[user.role as string] || '/student/dashboard');
    }
  }, [user, loading, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-primary/20 animate-ping"></div>
          <div className="absolute top-0 h-16 w-16 rounded-full border-t-4 border-primary animate-spin"></div>
        </div>
      </div>
    );
  }

  const features = [
    { icon: BookOpen, title: "课程管理", desc: "极简的富文本编辑与大纲管理，教学节奏尽在掌握。" },
    { icon: Users, title: "班级管理", desc: "年级、专业、班级多维度管理，学生数据一目了然。" },
    { icon: FileText, title: "作业系统", desc: "在线分发、自动收齐，支持各类文件格式上传。" },
    { icon: Brain, title: "AI 助教", desc: "基于大模型的智能纠错与答疑，24/7 陪伴学习。" },
    { icon: ClipboardList, title: "在线考试", desc: "随机组卷、自动评分、多维度成绩报告统计。" },
    { icon: GraduationCap, title: "知识图谱", desc: "可视化知识脉络，帮助学生构建系统化思维。" },
  ];

  return (
    <div className="min-h-screen selection:bg-primary/20">
      {/* 动态背景装饰 */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-100/50 blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] rounded-full bg-purple-100/50 blur-[100px]"></div>
      </div>

      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-white/60 backdrop-blur-md border-b border-gray-100">
        <div className="container flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="bg-primary p-1.5 rounded-lg text-white group-hover:scale-110 transition-transform">
              <GraduationCap className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
              EduWise 智慧教学
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <span className="text-sm font-medium text-gray-600 hover:text-primary transition-colors cursor-pointer">登录入口</span>
            </Link>
            <Link href="/register">
              <Button size="sm" className="rounded-full px-5 shadow-lg shadow-primary/20">
                开启教学
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-24">
        {/* Hero Section */}
        <section className="relative py-20 px-6">
          <div className="container text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-semibold mb-8">
                <ShieldCheck className="w-4 h-4" />
                <span>2025 全新升级 · AI 赋能教育</span>
              </div>
              <h1 className="text-6xl md:text-7xl font-extrabold text-gray-900 tracking-tight mb-8">
                让教学更 <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-600">简单</span><br />
                让学习更 <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">高效</span>
              </h1>
              <p className="text-xl text-gray-600 mb-12 leading-relaxed max-w-2xl mx-auto">
                集课程、作业、考试、AI 于一体的一站式教学管理平台。<br />
                为新时代的教育工作者提供前所未有的数字化体验。
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button size="lg" className="h-14 px-10 text-lg rounded-2xl group shadow-xl shadow-primary/25" onClick={() => window.location.href = getLoginUrl()}>
                  使用 Google 账号登录
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Link href="/register">
                  <Button size="lg" variant="outline" className="h-14 px-10 text-lg rounded-2xl border-gray-200 bg-white/50 hover:bg-white">
                    教师免费注册
                  </Button>
                </Link>
              </div>
              <div className="mt-8 flex items-center justify-center gap-6 text-sm text-gray-400">
                <div className="flex -space-x-2">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-200" />
                  ))}
                </div>
                <span>已有 1,200+ 教师加入</span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-white/40">
          <div className="container px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">全方位数字教学武器</h2>
              <div className="h-1 w-20 bg-primary mx-auto rounded-full"></div>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((f, idx) => (
                <motion.div
                  key={idx}
                  whileHover={{ y: -8 }}
                  className="group"
                >
                  <Card className="h-full border-none shadow-sm bg-white/60 backdrop-blur-sm hover:shadow-xl transition-all duration-300 ring-1 ring-gray-100">
                    <CardHeader>
                      <div className="w-12 h-12 bg-primary/5 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                        <f.icon className="h-6 w-6" />
                      </div>
                      <CardTitle className="text-xl mb-2">{f.title}</CardTitle>
                      <CardDescription className="text-gray-500 leading-relaxed">
                        {f.desc}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Roles Section - 现代极简风格 */}
        <section className="py-24">
          <div className="container px-6">
            <div className="grid md:grid-cols-3 gap-8">
              {['管理员', '教师', '学生'].map((role, i) => (
                <div key={i} className="relative p-8 rounded-3xl bg-gradient-to-b from-gray-50 to-white border border-gray-100 overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl"></div>
                  <h3 className="text-2xl font-bold mb-6 text-gray-900">{role}</h3>
                  <ul className="space-y-4">
                    {role === '教师' ? (
                      ['课程全流程管理', '作业/考试批改', '智能题库', '班级批量创建'].map(li => (
                        <li key={li} className="flex items-center gap-3 text-sm text-gray-600">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" /> {li}
                        </li>
                      ))
                    ) : (
                      <li className="text-sm text-gray-500 italic">包含专属工作台与核心业务链路...</li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section - 震撼视觉 */}
        <section className="py-24">
          <div className="container px-6">
            <div className="relative bg-gray-900 rounded-[3rem] p-12 md:p-20 overflow-hidden text-center text-white shadow-2xl">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.2),transparent)]"></div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 relative z-10">准备好开启智能教学了吗？</h2>
              <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto relative z-10">
                无论是管理复杂的课表，还是布置一场自动批改的考试，EduWise 都能助你一臂之力。
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
                <Button size="lg" variant="secondary" className="h-14 px-10 rounded-2xl font-bold" onClick={() => window.location.href = getLoginUrl()}>
                  立即尝试 Google 登录
                </Button>
                <Link href="/register">
                  <Button size="lg" variant="outline" className="h-14 px-10 rounded-2xl border-white/20 text-white hover:bg-white/10">
                    创建教师账户
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-12 border-t border-gray-100 bg-white">
        <div className="container px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span className="font-bold">EduWise</span>
          </div>
          <div className="text-sm text-gray-400">© 2025 课程智慧教学平台. Designed for Future Education.</div>
          <div className="flex gap-8 text-sm text-gray-500">
            <span className="hover:text-primary cursor-pointer">服务协议</span>
            <span className="hover:text-primary cursor-pointer">隐私政策</span>
          </div>
        </div>
      </footer>
    </div>
  );
}