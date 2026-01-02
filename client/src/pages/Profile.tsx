import { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Camera, ShieldCheck, Key, User, Mail, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Profile() {
  const { user } = useAuth(); 
  console.log("Profile user:", user); // 调试输出，查看 user 对象
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 核心修复：增加对 user 是否存在的深度监听，确保学生进入时能拿到数据
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setAvatar(user.avatar || null);
    }
  }, [user]);

  const updateProfileMutation = trpc.users.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("个人资料已更新");
    },
    onError: (err) => toast.error(err.message),
  });

  const changePasswordMutation = trpc.users.changePassword.useMutation({
    onSuccess: () => {
      toast.success("密码修改成功");
      setDialogOpen(false);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast.error("图片不能超过 2MB");
    const reader = new FileReader();
    reader.onloadend = () => setAvatar(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfileMutation.mutateAsync({
        name: name || undefined,
        email: email || undefined,
        avatar: avatar || undefined, 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return toast.error("新密码两次输入不一致");
    setPwLoading(true);
    try {
      await changePasswordMutation.mutateAsync({ oldPassword, newPassword });
    } finally {
      setPwLoading(false);
    }
  };

  if (!user) return (
    <DashboardLayout>
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-300" />
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      {/* 背景装饰 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-50/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-indigo-50/30 rounded-full blur-[100px]" />
      </div>

      <div className="relative h-[calc(100vh-4rem)] flex flex-col max-w-4xl mx-auto px-6 py-8 overflow-hidden">
        <header className="flex-shrink-0 mb-10">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">个人设置</h1>
          <p className="text-zinc-400 text-[11px] mt-1 tracking-widest uppercase">账户信息与安全偏好</p>
        </header>

        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            
            {/* 左侧：头像上传 (Apple 风格卡片) */}
            <div className="lg:col-span-1 space-y-6">
              <div className="p-8 bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2.5rem] flex flex-col items-center text-center shadow-sm">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <Avatar className="w-32 h-32 border-4 border-white shadow-xl">
                    <AvatarImage src={avatar || ""} className="object-cover" />
                    <AvatarFallback className="text-3xl bg-zinc-100 text-zinc-300 font-bold uppercase">
                      {user.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white backdrop-blur-[2px]">
                    <Camera className="w-6 h-6" />
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                </div>
                <div className="mt-6">
                  <h3 className="font-semibold text-zinc-900">{user.name}</h3>
                  <Badge variant="secondary" className="mt-2 bg-zinc-900 text-white border-none rounded-full px-4 py-0.5 text-[9px] uppercase tracking-tighter">
                    {user.role === 'teacher' ? '教师账户' : '学生账户'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* 右侧：资料表单 */}
            <div className="lg:col-span-2 space-y-8">
              <form onSubmit={handleProfileSubmit} className="p-8 bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2.5rem] space-y-6 shadow-sm">
                <div className="grid gap-6">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold text-zinc-400 uppercase ml-1 flex items-center gap-1.5">
                      <User className="w-3 h-3" /> 用户姓名
                    </Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-2xl border-none bg-white/60 focus:bg-white transition-all text-[13px] font-medium px-4" />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold text-zinc-400 uppercase ml-1 flex items-center gap-1.5">
                      <Mail className="w-3 h-3" /> 电子邮箱
                    </Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 rounded-2xl border-none bg-white/60 focus:bg-white transition-all text-[13px] font-medium px-4" />
                  </div>
                </div>

                <div className="pt-2">
                  <Button type="submit" disabled={loading} className="w-full h-11 rounded-full bg-zinc-900 text-white font-medium shadow-lg hover:bg-zinc-800 transition-all active:scale-[0.98] gap-2">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} 保存更改
                  </Button>
                </div>
              </form>

              {/* 安全区域 */}
              <div className="p-8 bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2.5rem] shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-[14px] font-semibold text-zinc-900 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" /> 账户安全
                    </h3>
                    <p className="text-[11px] text-zinc-400">定期更换密码可以显著提高账户安全性</p>
                  </div>
                  
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="rounded-full h-9 border-zinc-200 text-[12px] font-medium hover:bg-white px-6">
                        修改密码
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[400px] p-0 rounded-[2.5rem] overflow-hidden border-white/60 bg-white/80 backdrop-blur-2xl shadow-2xl focus:outline-none">
                      <div className="p-10 space-y-6">
                        <DialogHeader>
                          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                            <Key className="w-5 h-5" /> 重置登录密码
                          </DialogTitle>
                          <DialogDescription className="text-[12px]">请输入当前密码及新密码进行验证。</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleChangePassword} className="space-y-4">
                          <div className="space-y-1.5">
                            <Label className="text-[11px] text-zinc-400 ml-1">当前密码</Label>
                            <Input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className="rounded-xl border-none bg-zinc-100/50" required />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[11px] text-zinc-400 ml-1">新密码</Label>
                            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="rounded-xl border-none bg-zinc-100/50" required minLength={6} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[11px] text-zinc-400 ml-1">确认新密码</Label>
                            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="rounded-xl border-none bg-zinc-100/50" required />
                          </div>
                          <Button type="submit" disabled={pwLoading} className="w-full h-11 rounded-full bg-zinc-900 mt-4 font-medium">
                            {pwLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 更新密码
                          </Button>
                        </form>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 3px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }`}</style>
    </DashboardLayout>
  );
}