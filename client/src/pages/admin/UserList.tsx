"use client";

import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { 
  MoreHorizontal, UserPlus, KeyRound, 
  Trash2, AlertCircle, ShieldCheck, Mail, 
  Fingerprint, Loader2 
} from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// ⚡️ 引入你的通用组件
import { Pagination } from "@/components/common/Pagination";
import { SearchFilterBar } from "@/components/common/SearchFilterBar";

const createUserSchema = z.object({
  username: z.string().min(3, "用户名至少3个字符"),
  password: z.string().min(6, "密码至少6个字符"),
  name: z.string().min(1, "姓名不能为空"),
  role: z.enum(["admin", "teacher", "student"]),
  email: z.string().email("邮箱格式不正确").optional().or(z.literal("")),
});

type CreateUserForm = z.infer<typeof createUserSchema>;

export default function UserList() {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // ⚡️ 接口请求逻辑保持原样
  const { data: users, isLoading, isError, error } = trpc.users.list.useQuery(
    { search },
    { retry: false }
  );

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");

  // ⚡️ 前端分页切片 (UI层处理)
  const paginatedUsers = useMemo(() => {
    if (!users) return [];
    const start = (currentPage - 1) * pageSize;
    return users.slice(start, start + pageSize);
  }, [users, currentPage]);

  // ⚡️ 搜索触发 (仅更新状态)
  const handleSearch = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  // Mutations (核心逻辑完全保留)
  const createMutation = trpc.users.create.useMutation({
    onSuccess: () => {
      toast.success("用户创建成功");
      setIsCreateOpen(false);
      reset();
      utils.users.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.users.delete.useMutation({
    onSuccess: () => {
      toast.success("用户已删除");
      utils.users.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const resetPasswordMutation = trpc.users.adminResetPassword.useMutation({
    onSuccess: () => {
      toast.success("密码重置成功");
      setIsResetOpen(false);
      setNewPassword("");
      setSelectedUser(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: "student" },
  });

  const handleCreate = (data: CreateUserForm) => {
    createMutation.mutate({ ...data, email: data.email || undefined });
  };

  const handleDelete = (id: number) => {
    if (confirm("确定要删除该用户吗？此操作不可恢复。")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleResetPassword = () => {
    if (!selectedUser || !newPassword) return;
    resetPasswordMutation.mutate({ userId: selectedUser.id, newPassword });
  };

  const getRoleBadge = (role: string) => {
    const config: Record<string, { label: string; className: string }> = {
      admin: { label: "管理员", className: "bg-indigo-500 text-white" },
      teacher: { label: "教师", className: "bg-emerald-50 text-emerald-600 border-emerald-100" },
      student: { label: "学生", className: "bg-zinc-100 text-zinc-500 border-zinc-200" },
    };
    const item = config[role] || config.student;
    return (
      <Badge className={`${item.className} border-none rounded-lg px-2 py-0.5 font-black text-[10px]`}>
        {item.label}
      </Badge>
    );
  };

  if (isError) return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="h-12 w-12 text-rose-500 mb-4" />
        <h2 className="text-xl font-black text-zinc-900">访问受限</h2>
        <p className="text-zinc-400 font-medium">{error?.message || "您没有权限访问此页面"}</p>
        <Button onClick={() => setLocation("/")} className="mt-6 rounded-2xl h-12 px-8 bg-zinc-900 font-bold">返回首页</Button>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-100 pb-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge className="bg-zinc-900 text-white border-none rounded-lg text-[10px] font-black px-2 py-0.5">DIRECTORY</Badge>
              <div className="h-1 w-1 rounded-full bg-zinc-300" />
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-balance">Identity Management</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-zinc-900">用户管理</h1>
            <p className="text-zinc-500 mt-2 font-medium text-balance">管理系统中的所有用户及其访问权限</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="w-full sm:w-[400px]">
              <SearchFilterBar onSearch={handleSearch} placeholder="搜索用户名、姓名、邮箱..." initialValue={search} />
            </div>
            <Button onClick={() => setIsCreateOpen(true)} className="h-12 px-6 rounded-2xl bg-zinc-900 hover:bg-black font-black gap-2 shadow-xl active:scale-95 transition-all">
              <UserPlus className="h-4 w-4" /> 新建用户
            </Button>
          </div>
        </div>

        <Card className="border-none shadow-sm bg-white rounded-[3rem] overflow-hidden">
          <CardHeader className="p-10 border-b border-zinc-50">
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-indigo-500" /> 全域认证名册
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-zinc-200" />
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">正在拉取名册数据...</p>
              </div>
            ) : !users || users.length === 0 ? (
              <div className="py-24 text-center">
                <Fingerprint className="h-12 w-12 text-zinc-100 mx-auto mb-4" />
                <p className="text-zinc-400 font-bold text-balance">未检索到匹配的用户档案</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-zinc-50/50">
                      <TableRow className="hover:bg-transparent border-none">
                        <TableHead className="w-24 pl-10 text-[10px] font-black uppercase text-zinc-400 tracking-widest">ID</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">认证信息</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">姓名</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">角色权限</TableHead>
                        <TableHead className="pr-10 text-[10px] font-black uppercase text-zinc-400 tracking-widest text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedUsers.map((user) => (
                        <TableRow key={user.id} className="group hover:bg-zinc-50/50 border-zinc-50 transition-all">
                          <TableCell className="pl-10 font-mono text-xs text-zinc-400">#{user.id}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-2xl bg-zinc-900 text-white flex items-center justify-center font-black shadow-lg">
                                {(user.name?.[0] || user.username?.[0] || "U").toUpperCase()}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-black text-zinc-900 text-sm">{user.username || user.openId}</span>
                                <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                                  <Mail className="h-2.5 w-2.5" /> {user.email || "未绑定邮箱"}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-bold text-zinc-600">{user.name || "-"}</TableCell>
                          <TableCell>{getRoleBadge(user.role)}</TableCell>
                          <TableCell className="pr-10 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl hover:bg-white shadow-sm border border-transparent hover:border-zinc-100 transition-all">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-2xl border-zinc-100 shadow-2xl p-2 w-48 animate-in fade-in zoom-in-95">
                                <DropdownMenuLabel className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-2 py-2">账户控制</DropdownMenuLabel>
                                <DropdownMenuItem className="rounded-xl font-bold py-3 cursor-pointer" onClick={() => { setSelectedUser(user); setIsResetOpen(true); }}>
                                  <KeyRound className="mr-3 h-4 w-4 text-zinc-400" /> 重置密码
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-zinc-50" />
                                <DropdownMenuItem className="rounded-xl font-bold py-3 text-rose-600 cursor-pointer focus:bg-rose-50 focus:text-rose-600" onClick={() => handleDelete(user.id)}>
                                  <Trash2 className="mr-3 h-4 w-4" /> 删除用户
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {/* ⚡️ 应用你的分页组件 */}
                <div className="px-10 py-6 border-t border-zinc-50 bg-zinc-50/10 text-balance">
                  <Pagination currentPage={currentPage} totalItems={users.length} pageSize={pageSize} onPageChange={setCurrentPage} />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Create Dialog UI 升级 */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden max-w-lg">
            <div className="bg-zinc-900 p-8 text-white">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black flex items-center gap-3">
                  <UserPlus className="h-6 w-6" /> 新建身份档案
                </DialogTitle>
              </DialogHeader>
            </div>
            <form onSubmit={handleSubmit(handleCreate)} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-zinc-400 ml-1">用户名</Label>
                  <Input {...register("username")} className="h-12 rounded-2xl bg-zinc-50 border-none font-bold" />
                  {errors.username && <p className="text-rose-500 text-[10px] font-bold ml-1">{errors.username.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-zinc-400 ml-1">初始密码</Label>
                  <Input {...register("password")} type="password" className="h-12 rounded-2xl bg-zinc-50 border-none font-bold" />
                  {errors.password && <p className="text-rose-500 text-[10px] font-bold ml-1">{errors.password.message}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-zinc-400 ml-1">真实姓名</Label>
                <Input {...register("name")} className="h-12 rounded-2xl bg-zinc-50 border-none font-bold" />
                {errors.name && <p className="text-rose-500 text-[10px] font-bold ml-1">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-zinc-400 ml-1">全局权限角色</Label>
                <Select onValueChange={(val) => setValue("role", val as any)} defaultValue="student">
                  <SelectTrigger className="h-12 rounded-2xl bg-zinc-50 border-none font-bold">
                    <SelectValue placeholder="选择角色" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-zinc-100">
                    <SelectItem value="student">学生 (Student)</SelectItem>
                    <SelectItem value="teacher">教师 (Teacher)</SelectItem>
                    <SelectItem value="admin">管理员 (Admin)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-zinc-400 ml-1">联系邮箱 (可选)</Label>
                <Input {...register("email")} className="h-12 rounded-2xl bg-zinc-50 border-none font-bold" />
                {errors.email && <p className="text-rose-500 text-[10px] font-bold ml-1">{errors.email.message}</p>}
              </div>
              <DialogFooter className="pt-2">
                <Button type="submit" disabled={createMutation.isPending} className="w-full h-14 rounded-2xl bg-zinc-900 text-white font-black shadow-xl hover:scale-[1.02] transition-all">
                  {createMutation.isPending ? "正在录入档案..." : "完成档案录入"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Reset Password Dialog UI 升级 */}
        <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
          <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden max-w-md">
            <div className="bg-zinc-900 p-8 text-white">
              <DialogHeader>
                <DialogTitle className="text-xl font-black">重置安全密码</DialogTitle>
                <p className="text-zinc-400 text-xs mt-1">正在为用户 <span className="text-white">#{selectedUser?.name}</span> 设置新凭证</p>
              </DialogHeader>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-zinc-400 ml-1">新访问密码</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="输入不少于6位的强密码"
                  className="h-12 rounded-2xl bg-zinc-50 border-none font-bold"
                />
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleResetPassword} 
                  disabled={resetPasswordMutation.isPending || !newPassword}
                  className="w-full h-14 rounded-2xl bg-zinc-900 text-white font-black shadow-xl hover:scale-[1.02] transition-all"
                >
                  {resetPasswordMutation.isPending ? "正在同步凭证..." : "确认更新密码"}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}