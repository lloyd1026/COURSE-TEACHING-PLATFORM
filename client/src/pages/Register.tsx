import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { GraduationCap, ArrowLeft, ShieldCheck, UserCheck } from "lucide-react";

export default function Register() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      toast.success("注册成功! 请联系管理员审核或直接登录");
      setLocation("/login");
    },
    onError: (error) => {
      toast.error(error.message || "注册失败");
    },
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || !name) {
      toast.error("请填写所有必填项");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("两次输入的密码不一致");
      return;
    }
    if (password.length < 6) {
      toast.error("密码长度至少为6位");
      return;
    }

    setLoading(true);
    try {
      await registerMutation.mutateAsync({
        username,
        password,
        name,
        email: email || undefined,
        role: "teacher", 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-lg shadow-2xl border-none ring-1 ring-slate-200">
        <CardHeader className="space-y-1 bg-slate-50/80 rounded-t-xl border-b border-slate-100">
          <Link href="/login" className="flex items-center gap-2 text-sm text-slate-500 hover:text-primary transition-colors mb-2">
            <ArrowLeft className="h-4 w-4" /> 返回登录
          </Link>
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-xl text-white shadow-lg shadow-primary/20">
              <UserCheck className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">教师入驻申请</CardTitle>
              <CardDescription>
                创建您的教师账户以开启数字化智慧教学
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-8">
          <form onSubmit={handleRegister} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-xs font-bold text-slate-500 uppercase">用户名 *</Label>
                <Input id="username" placeholder="登录账号" value={username} onChange={(e) => setUsername(e.target.value)} required className="h-11 bg-slate-50/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-bold text-slate-500 uppercase">真实姓名 *</Label>
                <Input id="name" placeholder="您的姓名" value={name} onChange={(e) => setName(e.target.value)} required className="h-11 bg-slate-50/50" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-bold text-slate-500 uppercase">工作邮箱</Label>
              <Input id="email" type="email" placeholder="example@university.edu" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 bg-slate-50/50" />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="department" className="text-xs font-bold text-slate-500 uppercase">所属院系</Label>
                <Input id="department" placeholder="如: 软件学院" value={department} onChange={(e) => setDepartment(e.target.value)} className="h-11 bg-slate-50/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title" className="text-xs font-bold text-slate-500 uppercase">当前职称</Label>
                <Input id="title" placeholder="如: 副教授" value={title} onChange={(e) => setTitle(e.target.value)} className="h-11 bg-slate-50/50" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="password" id="pass-label" className="text-xs font-bold text-slate-500 uppercase">设置密码 *</Label>
                <Input id="password" type="password" placeholder="至少6位" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-11 bg-slate-50/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-xs font-bold text-slate-500 uppercase">确认密码 *</Label>
                <Input id="confirmPassword" type="password" placeholder="重复输入密码" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="h-11 bg-slate-50/50" />
              </div>
            </div>

            <Button type="submit" className="w-full h-12 text-lg font-bold shadow-xl shadow-primary/20" disabled={loading}>
              {loading ? "申请中..." : "立即提交申请"}
            </Button>
          </form>

          <div className="mt-8 p-4 bg-slate-900 rounded-2xl text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity">
              <ShieldCheck className="h-12 w-12" />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-primary mb-2">学生提示</h4>
            <p className="text-[11px] leading-relaxed text-slate-300 relative z-10">
              本系统严格区分教学角色。学生账户由教师在管理端批量导入，<strong>无需且不支持</strong>自主注册。如您需要进入系统，请关注您的教务邮箱或联系任课教师获取账号。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}