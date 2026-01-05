import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useLocation, Link } from "wouter";
import { toast } from "sonner";

export default function ResetPassword() {
    const [location, setLocation] = useLocation();
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get("token");

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const resetPasswordMutation = trpc.auth.resetPassword.useMutation();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!token) {
            toast.error("缺少重置 Token");
            return;
        }

        if (newPassword.length < 6) {
            toast.error("密码至少需要6位");
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error("两次输入的密码不一致");
            return;
        }

        try {
            await resetPasswordMutation.mutateAsync({
                token,
                newPassword,
            });
            toast.success("密码重置成功，请登录");
            setLocation("/login");
        } catch (error: any) {
            toast.error(error.message || "重置失败，链接可能已过期");
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-red-500">参数错误</CardTitle>
                        <CardDescription>
                            缺少重置 Token，请检查链接是否完整。
                        </CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Link href="/login">
                            <Button variant="outline" className="w-full">
                                返回登录
                            </Button>
                        </Link>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>重置密码</CardTitle>
                    <CardDescription>请输入您的新密码</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="new-password">新密码</Label>
                            <Input
                                id="new-password"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm-password">确认新密码</Label>
                            <Input
                                id="confirm-password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-2">
                        <Button
                            className="w-full"
                            type="submit"
                            disabled={resetPasswordMutation.isPending}
                        >
                            {resetPasswordMutation.isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            重置密码
                        </Button>
                        <div className="text-sm text-center text-slate-500">
                            <Link href="/login" className="text-primary hover:underline">
                                返回登录
                            </Link>
                        </div>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
