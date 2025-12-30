import { useState, useEffect } from "react";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { UserCircle, Mail, Shield, Key, Loader2, Calendar } from "lucide-react";

export default function Profile() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const updateProfileMutation = trpc.users.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("个人信息更新成功");
    },
    onError: (error) => {
      toast.error(error.message || "更新失败");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfileMutation.mutateAsync({
        name: name || undefined,
        email: email || undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">请先登录</div>
      </DashboardLayout>
    );
  }

  const getRoleBadge = () => {
    switch (user.role) {
      case 'admin':
        return <Badge className="bg-red-100 text-red-800">管理员</Badge>;
      case 'teacher':
        return <Badge className="bg-blue-100 text-blue-800">教师</Badge>;
      default:
        return <Badge className="bg-green-100 text-green-800">学生</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div>
          <h2 className="text-3xl font-bold tracking-tight">个人信息</h2>
          <p className="text-muted-foreground mt-2">管理您的账户信息和安全设置</p>
        </div>

        {/* 用户概览卡片 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20 border-2">
                <AvatarFallback className="text-2xl font-medium bg-primary/10 text-primary">
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-semibold">{user.name || '未设置姓名'}</h3>
                  {getRoleBadge()}
                </div>
                <p className="text-muted-foreground mt-1">{user.email || '未设置邮箱'}</p>
                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    注册时间: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '未知'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 基本信息编辑 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <UserCircle className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>基本信息</CardTitle>
                <CardDescription>更新您的个人资料</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">姓名</Label>
                  <Input
                    id="name"
                    placeholder="请输入姓名"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">邮箱</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="请输入邮箱"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>用户名</Label>
                  <Input
                    value={user.openId || '-'}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">用户名不可修改</p>
                </div>

                <div className="space-y-2">
                  <Label>角色</Label>
                  <Input
                    value={user.role === 'admin' ? '管理员' : user.role === 'teacher' ? '教师' : '学生'}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">角色由管理员分配</p>
                </div>
              </div>

              <div className="pt-4">
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    "保存更改"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* 安全设置 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>安全设置</CardTitle>
                <CardDescription>管理您的账户安全</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Key className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">登录密码</p>
                  <p className="text-sm text-muted-foreground">定期修改密码可以提高账户安全性</p>
                </div>
              </div>
              <Link href="/change-password">
                <Button variant="outline">修改密码</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
