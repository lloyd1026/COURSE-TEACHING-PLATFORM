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
import { Loader2, Camera, ShieldCheck, Key } from "lucide-react";

export default function Profile() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // 修改密码的状态
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setAvatar(user.avatar || null);
    }
  }, [user]);

  // 1. 更新个人资料 Mutation
  const updateProfileMutation = trpc.users.updateProfile.useMutation({
    onSuccess: () => toast.success("Public profile updated."),
    onError: (err) => toast.error(err.message),
  });

  // 2. 修改密码 Mutation
  const changePasswordMutation = trpc.users.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Password changed successfully.");
      setDialogOpen(false); // 关闭弹窗
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.size > 2 * 1024 * 1024) return toast.error("Max 2MB allowed");
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
    if (newPassword !== confirmPassword) return toast.error("Passwords do not match");
    setPwLoading(true);
    try {
      await changePasswordMutation.mutateAsync({ oldPassword, newPassword });
    } finally {
      setPwLoading(false);
    }
  };

  if (!user) return <DashboardLayout><div className="p-8 text-gray-400">Loading profile...</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 py-10">
        <header className="pb-4 mb-8 border-b border-gray-200">
          <h1 className="text-2xl font-semibold text-gray-900">Public profile</h1>
        </header>

        <div className="flex flex-col-reverse md:flex-row gap-16">
          {/* 左侧表单部分 */}
          <div className="flex-1 space-y-8">
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-gray-50 border-gray-300 focus:bg-white" />
                <p className="text-[12px] text-gray-500 italic">Visible to all students and teachers.</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Email address</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-gray-50 border-gray-300 focus:bg-white" />
              </div>

              <div className="pt-2">
                <Button type="submit" disabled={loading} className="bg-[#2da44e] hover:bg-[#2c974b] text-white font-medium px-6 shadow-sm">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Profile
                </Button>
              </div>
            </form>

            {/* 安全设置区域 - GitHub 风格的隔离带 */}
            <div className="pt-10 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-gray-400" /> Account Security
              </h3>
              
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Change Password</div>
                  <div className="text-xs text-gray-500">Ensure your account is using a long, random password.</div>
                </div>
                
                {/* 修改密码 Dialog */}
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="font-semibold border-gray-300 hover:bg-white shadow-sm">
                      Change password
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px] rounded-xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2"><Key className="w-5 h-5" />Update Password</DialogTitle>
                      <DialogDescription>Enter your current password and a new one below.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleChangePassword} className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Current password</Label>
                        <Input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label>New password</Label>
                        <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
                      </div>
                      <div className="space-y-2">
                        <Label>Confirm new password</Label>
                        <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                      </div>
                      <DialogFooter className="pt-4">
                        <Button type="submit" disabled={pwLoading} className="w-full bg-[#2da44e] hover:bg-[#2c974b]">
                          {pwLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save New Password
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>

          {/* 右侧头像部分 - GitHub Style */}
          <div className="w-full md:w-48 flex flex-col items-center md:items-start gap-4">
            <Label className="text-sm font-semibold text-gray-900">Profile picture</Label>
            <div className="relative group w-48 h-48 md:w-44 md:h-44">
              <Avatar className="w-full h-full border border-gray-200 shadow-sm">
                <AvatarImage src={avatar || ""} className="object-cover" />
                <AvatarFallback className="text-4xl bg-gray-100 text-gray-300 uppercase font-bold">
                  {user.name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-gray-900/40 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex flex-col items-center justify-center gap-1 text-[12px] font-medium border border-white/20"
              >
                <Camera className="w-5 h-5" />
                Change image
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}