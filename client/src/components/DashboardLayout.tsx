import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Users,
  Shield,
  BookOpen,
  GraduationCap,
  FileText,
  ClipboardList,
  Brain,
  FlaskConical,
  Settings,
  UserCircle,
  Key,
  Library,
  Network,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation, Link } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

// 管理员菜单
const adminMenuItems = [
  { icon: LayoutDashboard, label: "仪表板", path: "/admin/dashboard" },
  { icon: Users, label: "用户管理", path: "/admin/users" },
  { icon: BookOpen, label: "课程管理", path: "/admin/courses" },
  { icon: GraduationCap, label: "班级管理", path: "/admin/classes" },
];

// 教师菜单
const teacherMenuItems = [
  { icon: LayoutDashboard, label: "仪表板", path: "/teacher/dashboard" },
  { icon: BookOpen, label: "我的课程", path: "/teacher/courses" },
  { icon: GraduationCap, label: "班级管理", path: "/teacher/classes" },
  { icon: FileText, label: "作业管理", path: "/teacher/assignments" },
  { icon: Library, label: "题库管理", path: "/teacher/questions" },
  { icon: ClipboardList, label: "考试管理", path: "/teacher/exams" },
  { icon: Network, label: "知识图谱", path: "/teacher/knowledge-graph" },
  { icon: FlaskConical, label: "实验管理", path: "/teacher/experiments" },
];

// 学生菜单
const studentMenuItems = [
  { icon: LayoutDashboard, label: "仪表板", path: "/student/dashboard" },
  { icon: BookOpen, label: "我的课程", path: "/student/courses" },
  { icon: FileText, label: "我的作业", path: "/student/assignments" },
  { icon: ClipboardList, label: "我的考试", path: "/student/exams" },
  { icon: FlaskConical, label: "我的实验", path: "/student/experiments" },
  { icon: Network, label: "知识图谱", path: "/student/knowledge-graph" },
  { icon: Brain, label: "AI助教", path: "/student/ai-assistant" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full bg-white rounded-xl shadow-lg">
          <div className="flex flex-col items-center gap-6">
            <GraduationCap className="h-16 w-16 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              请先登录
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              访问此页面需要登录认证，请选择登录方式继续
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full">
            <Link href="/login">
              <Button size="lg" className="w-full">
                系统登录
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => {
                window.location.href = getLoginUrl();
              }}
              size="lg"
              className="w-full"
            >
              OAuth登录
            </Button>
          </div>
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-primary"
          >
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // 根据用户角色选择菜单
  const getMenuItems = () => {
    if (location.startsWith("/admin")) return adminMenuItems;
    if (location.startsWith("/teacher")) return teacherMenuItems;
    if (location.startsWith("/student")) return studentMenuItems;
    // 根据用户实际角色返回默认菜单
    if (user?.role === "admin") return adminMenuItems;
    if (user?.role === "teacher") return teacherMenuItems;
    return studentMenuItems;
  };

  const menuItems = getMenuItems();
  const activeMenuItem = menuItems.find(
    item => location === item.path || location.startsWith(item.path + "/")
  );

  // 获取角色显示名称
  const getRoleName = () => {
    if (location.startsWith("/admin")) return "管理员";
    if (location.startsWith("/teacher")) return "教师";
    if (location.startsWith("/student")) return "学生";
    if (user?.role === "admin") return "管理员";
    if (user?.role === "teacher") return "教师";
    return "学生";
  };

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <GraduationCap className="h-5 w-5 text-primary shrink-0" />
                  <span className="font-semibold tracking-tight truncate">
                    {getRoleName()}中心
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {menuItems.map(item => {
                const isActive =
                  location === item.path ||
                  location.startsWith(item.path + "/");
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-10 transition-all font-normal`}
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                      />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {/* 自定义头像组件开始 */}
                  <div className="h-9 w-9 rounded-full border border-slate-200 overflow-hidden bg-slate-100 flex-shrink-0 flex items-center justify-center relative">
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name || "User"}
                        className="h-full w-full object-cover"
                        // 如果图片加载失败，可以在这里处理回退逻辑
                        onError={e => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <span className="text-xs font-bold text-slate-500 uppercase">
                        {user?.name?.charAt(0) || "U"}
                      </span>
                    )}
                  </div>
                  {/* 自定义头像组件结束 */}

                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={() => setLocation("/profile")}
                  className="cursor-pointer"
                >
                  <UserCircle className="mr-2 h-4 w-4" />
                  <span>个人信息</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setLocation("/admin/dashboard")}
                  className="cursor-pointer"
                >
                  <Shield className="mr-2 h-4 w-4" />
                  <span>管理员视图</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setLocation("/teacher/dashboard")}
                  className="cursor-pointer"
                >
                  <Users className="mr-2 h-4 w-4" />
                  <span>教师视图</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setLocation("/student/dashboard")}
                  className="cursor-pointer"
                >
                  <GraduationCap className="mr-2 h-4 w-4" />
                  <span>学生视图</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>退出登录</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-foreground">
                    {activeMenuItem?.label ?? "菜单"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 p-4">{children}</main>
      </SidebarInset>
    </>
  );
}
