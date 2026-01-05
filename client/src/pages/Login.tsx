import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { GraduationCap, ArrowLeft, UserPlus, Info } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      toast.success("登录成功!");
      window.location.href = "/";
    },
    onError: (error) => {
      toast.error(error.message || "登录失败");
    },
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error("请填写用户名和密码");
      return;
    }
    setLoading(true);
    try {
      await loginMutation.mutateAsync({ username, password });
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = () => {
    window.location.href = getLoginUrl();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
      {/* 装饰背景 */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />

      <Card className="w-full max-w-md shadow-xl border-none ring-1 ring-slate-200">
        <CardHeader className="space-y-4 pb-2">
          <Link href="/" className="flex items-center gap-2 text-sm text-slate-500 hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" />
            返回首页
          </Link>
          <div className="flex flex-col items-center gap-2">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <GraduationCap className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">欢迎回来</CardTitle>
            <CardDescription>使用您的账号进入智慧教学平台</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <Tabs defaultValue="system" className="w-full">
            <TabsList className="grid w-full grid-cols-2 p-1 bg-slate-100 rounded-lg">
              <TabsTrigger value="system">系统账号</TabsTrigger>
              <TabsTrigger value="oauth">Google 登录</TabsTrigger>
            </TabsList>

            <TabsContent value="system" className="space-y-4 mt-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">用户名 / 学号</Label>
                  <Input
                    id="username"
                    placeholder="请输入您的账号"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="h-11 focus-visible:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">密码</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="请输入密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 focus-visible:ring-primary/20"
                  />
                </div>
                <Button type="submit" className="w-full h-11 text-base shadow-lg shadow-primary/20" disabled={loading}>
                  {loading ? "验证中..." : "立即登录"}
                </Button>
                <div className="flex justify-between text-sm text-slate-500 pt-2">
                  <Link href="/forgot-password">
                    <span className="cursor-pointer hover:underline hover:text-primary">
                      忘记密码?
                    </span>
                  </Link>
                  <Link href="/register">
                    <span className="cursor-pointer hover:underline hover:text-primary">
                      没有账号? 去注册
                    </span>
                  </Link>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="oauth" className="space-y-4 mt-6">
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 mb-2">
                <p className="text-xs text-blue-700 leading-relaxed text-center">
                  <strong>教职人员注意：</strong> 仅限管理员及已在系统关联邮箱的教师使用 Google 快速登录。
                </p>
              </div>
              <Button
                onClick={handleOAuthLogin}
                className="w-full h-12 gap-3 font-semibold border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                variant="outline"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                通过 Google 账户登录
              </Button>
            </TabsContent>
          </Tabs>

          <div className="mt-8 pt-6 border-t border-slate-100 space-y-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 justify-center">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">我是教师</span>
              </div>
              <Link href="/register">
                <Button variant="outline" className="w-full gap-2 border-primary/20 text-primary hover:bg-primary/5 hover:text-primary h-11">
                  <UserPlus className="h-4 w-4" />
                  申请教师入驻
                </Button>
              </Link>
            </div>

            <div className="flex gap-3 bg-amber-50/50 p-3 rounded-xl border border-amber-100/50">
              <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-[11px] text-amber-700 leading-relaxed italic">
                学生账号由您的任课教师在系统后台统一创建。如无法登录，请咨询相关课程教师。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}