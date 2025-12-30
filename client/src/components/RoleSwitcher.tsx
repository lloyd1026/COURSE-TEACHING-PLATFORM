import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Shield, GraduationCap, User } from "lucide-react";
import { useLocation } from "wouter";

export function RoleSwitcher() {
  const [, setLocation] = useLocation();

  const switchRole = (role: 'admin' | 'teacher' | 'student') => {
    switch (role) {
      case 'admin':
        setLocation('/admin/dashboard');
        break;
      case 'teacher':
        setLocation('/teacher/dashboard');
        break;
      case 'student':
        setLocation('/student/dashboard');
        break;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Shield className="mr-2 h-4 w-4" />
          切换角色
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>选择角色视图</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => switchRole('admin')}>
          <Shield className="mr-2 h-4 w-4" />
          管理员
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchRole('teacher')}>
          <GraduationCap className="mr-2 h-4 w-4" />
          教师
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchRole('student')}>
          <User className="mr-2 h-4 w-4" />
          学生
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
