import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { useState, useEffect } from "react";
import { Search, MoreHorizontal, UserPlus, KeyRound, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";

const createUserSchema = z.object({
  username: z.string().min(3, "用户名至少3个字符"),
  //...
  password: z.string().min(6, "密码至少6个字符"),
  name: z.string().min(1, "姓名不能为空"),
  role: z.enum(["admin", "teacher", "student"]),
  email: z.string().email("邮箱格式不正确").optional().or(z.literal("")),
});

type CreateUserForm = z.infer<typeof createUserSchema>;

export default function UserList() {
  const [search, setSearch] = useState("");
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { data: users, isLoading, isError, error } = trpc.users.list.useQuery(
    { search },
    {
      retry: false, // Don't retry if failed (e.g. 403)
    }
  );

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");

  // Mutations
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

  // Form
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      role: "student",
    },
  });

  const handleCreate = (data: CreateUserForm) => {
    createMutation.mutate({
      ...data,
      email: data.email || undefined,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("确定要删除该用户吗？此操作不可恢复。")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleResetPassword = () => {
    if (!selectedUser || !newPassword) return;
    resetPasswordMutation.mutate({
      userId: selectedUser.id,
      newPassword
    });
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      admin: "default",
      teacher: "secondary",
      student: "outline",
    };
    const labels: Record<string, string> = {
      admin: "管理员",
      teacher: "教师",
      student: "学生",
    };
    return (
      <Badge variant={variants[role] || "outline"}>
        {labels[role] || role}
      </Badge>
    );
  };

  if (isError) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <h2 className="text-xl font-bold text-red-600">访问受限</h2>
          <p className="text-muted-foreground">{error?.message || "您没有权限访问此页面"}</p>
          <Button onClick={() => setLocation("/")} variant="outline">
            返回首页
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">用户管理</h1>
            <p className="text-muted-foreground">管理系统中的所有用户</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            新建用户
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>用户列表</CardTitle>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索用户名、姓名或邮箱..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">加载中...</div>
            ) : !users || users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">暂无用户数据</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>用户名</TableHead>
                    <TableHead>姓名</TableHead>
                    <TableHead>邮箱</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.id}</TableCell>
                      <TableCell className="font-medium">
                        {user.username || user.openId || "-"}
                      </TableCell>
                      <TableCell>{user.name || "-"}</TableCell>
                      <TableCell>{user.email || "-"}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>操作</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setIsResetOpen(true);
                              }}
                            >
                              <KeyRound className="mr-2 h-4 w-4" />
                              重置密码
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDelete(user.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              删除用户
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Create User Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建用户</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(handleCreate)} className="space-y-4">
              <div className="space-y-2">
                <Label>用户名</Label>
                <Input {...register("username")} />
                {errors.username && <p className="text-red-500 text-sm">{errors.username.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>初始密码</Label>
                <Input {...register("password")} type="password" />
                {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>姓名</Label>
                <Input {...register("name")} />
                {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>角色</Label>
                <Select onValueChange={(val) => setValue("role", val as any)} defaultValue="student">
                  <SelectTrigger>
                    <SelectValue placeholder="选择角色" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">学生</SelectItem>
                    <SelectItem value="teacher">教师</SelectItem>
                    <SelectItem value="admin">管理员</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>邮箱 (可选)</Label>
                <Input {...register("email")} />
                {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "创建中..." : "创建"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Reset Password Dialog */}
        <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>重置密码: {selectedUser?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>新密码</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="输入新密码"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleResetPassword} disabled={resetPasswordMutation.isPending || !newPassword}>
                {resetPasswordMutation.isPending ? "重置中..." : "确认重置"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
