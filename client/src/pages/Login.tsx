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
import { GraduationCap, ArrowLeft, UserPlus } from "lucide-react";

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" />
            返回首页
          </Link>
          <div className="flex items-center justify-center">
            <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <div className="text-center">
            <CardTitle className="text-2xl">课程智慧教学平台</CardTitle>
            <CardDescription>教师/学生登录</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="system" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="system">系统登录</TabsTrigger>
              <TabsTrigger value="oauth">OAuth登录</TabsTrigger>
            </TabsList>

            <TabsContent value="system" className="space-y-4 mt-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">用户名</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="请输入用户名"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
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
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "登录中..." : "登录"}
                </Button>
              </form>
              
              {/* 演示账户提示 */}
              {/* <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                <p className="font-medium mb-1">演示账户:</p>
                <p>管理员: admin / admin123</p>
                <p>教师: teacher1 / teacher123</p>
                <p>学生: student1 / student123</p>
              </div> */}
            </TabsContent>

            <TabsContent value="oauth" className="space-y-4 mt-4">
              <div className="text-center text-sm text-muted-foreground mb-4">
                使用第三方账户快速登录
              </div>
              <Button onClick={handleOAuthLogin} className="w-full" variant="outline">
                使用Manus账户登录
              </Button>
            </TabsContent>
          </Tabs>

          <div className="mt-6 pt-4 border-t">
            <div className="text-center text-sm space-y-2">
              <p className="text-muted-foreground">教师用户可以自行注册</p>
              <Link href="/register">
                <Button variant="outline" className="w-full gap-2">
                  <UserPlus className="h-4 w-4" />
                  教师注册
                </Button>
              </Link>
              <p className="text-xs text-muted-foreground mt-2">
                学生账户由教师在班级管理中创建
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
