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
import { Link } from "wouter";
import { toast } from "sonner";

export default function ForgotPassword() {
    const [emailOrUsername, setEmailOrUsername] = useState("");
    const forgotPasswordMutation = trpc.auth.forgotPassword.useMutation();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!emailOrUsername) {
            toast.error("请输入用户名或邮箱");
            return;
        }

        try {
            const result = await forgotPasswordMutation.mutateAsync({
                emailOrUsername,
            });
            toast.success(result.message);
            // Optional: Redirect or clear form
            setEmailOrUsername("");
        } catch (error: any) {
            toast.error(error.message || "请求失败");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>找回密码</CardTitle>
                    <CardDescription>
                        请输入您的注册邮箱或用户名，我们将向您发送重置密码的链接
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">邮箱 / 用户名</Label>
                            <Input
                                id="email"
                                type="text"
                                placeholder="you@example.com"
                                value={emailOrUsername}
                                onChange={(e) => setEmailOrUsername(e.target.value)}
                                required
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-2">
                        <Button
                            className="w-full"
                            type="submit"
                            disabled={forgotPasswordMutation.isPending}
                        >
                            {forgotPasswordMutation.isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            发送重置链接
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
