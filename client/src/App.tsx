import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUserList from "./pages/admin/UserList";
import AdminCourseList from "./pages/admin/CourseList";
import AdminClassList from "./pages/admin/ClassList";
import TeacherDashboard from "./pages/teacher/Dashboard";
import StudentDashboard from "./pages/student/Dashboard";
import CourseList from "./pages/teacher/CourseList";
import CourseDetail from "./pages/teacher/CourseDetail";
import CourseCreate from "./pages/teacher/CourseCreate";
import ClassList from "./pages/teacher/ClassList";
import ClassDetail from "./pages/teacher/ClassDetail";
import AssignmentList from "./pages/teacher/AssignmentList";
import AssignmentDetail from "./pages/teacher/AssignmentDetail";
import AssignmentCreate from "./pages/teacher/AssignmentCreate";
import QuestionBank from "./pages/teacher/QuestionBank";
import QuestionCreate from "./pages/teacher/QuestionCreate";
import ExamList from "./pages/teacher/ExamList";
import ExamCreate from "./pages/teacher/ExamCreate";
import ExamDetail from "./pages/teacher/ExamDetail";
import KnowledgeGraph from "./pages/teacher/KnowledgeGraph";
import ExperimentList from "./pages/teacher/ExperimentList";
import StudentCourseList from "./pages/student/CourseList";
import StudentAssignmentList from "./pages/student/AssignmentList";
import StudentAssignmentDetail from "./pages/student/AssignmentDetail";
import StudentExamList from "./pages/student/ExamList";
import StudentExamTaking from "./pages/student/ExamTaking";
import AIAssistant from "./pages/student/AIAssistant";
import StudentExperimentList from "./pages/student/ExperimentList";
import Profile from "./pages/Profile";
import ChangePassword from "./pages/ChangePassword";
import StudentImport from "./pages/teacher/StudentImport";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/login"} component={Login} />
      <Route path={"/register"} component={Register} />
      {/* Admin Routes */}
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/users" component={AdminUserList} />
      <Route path="/admin/courses" component={AdminCourseList} />
      <Route path="/admin/classes" component={AdminClassList} />

      {/* Teacher Routes */}
      <Route path="/teacher/dashboard" component={TeacherDashboard} />
      <Route path="/teacher/courses" component={CourseList} />
      <Route path="/teacher/courses/create" component={CourseCreate} />
      <Route path="/teacher/courses/:id" component={CourseDetail} />
      <Route path="/teacher/classes" component={ClassList} />
      <Route path="/teacher/classes/:id" component={ClassDetail} />
      <Route path="/teacher/assignments" component={AssignmentList} />
      <Route path="/teacher/assignments/create" component={AssignmentCreate} />
      <Route path="/teacher/assignments/:id" component={AssignmentDetail} />
      <Route path="/teacher/questions" component={QuestionBank} />
      <Route path="/teacher/questions/create" component={QuestionCreate} />
      <Route path="/teacher/exams" component={ExamList} />
      <Route path="/teacher/exams/create" component={ExamCreate} />
      <Route path="/teacher/exams/:id" component={ExamDetail} />
      <Route path="/teacher/knowledge-graph" component={KnowledgeGraph} />
      <Route path="/teacher/experiments" component={ExperimentList} />

      {/* Student Routes */}
      <Route path="/student/dashboard" component={StudentDashboard} />
      <Route path="/student/courses" component={StudentCourseList} />
      <Route path="/student/assignments" component={StudentAssignmentList} />
      <Route
        path="/student/assignments/:id"
        component={StudentAssignmentDetail}
      />
      <Route path="/student/exams" component={StudentExamList} />
      <Route path="/student/exams/:id/take" component={StudentExamTaking} />
      <Route path="/student/ai-assistant" component={AIAssistant} />
      <Route path="/student/experiments" component={StudentExperimentList} />

      {/* Teacher Additional Routes */}
      <Route path="/teacher/students/import" component={StudentImport} />

      {/* Common Routes */}
      <Route path="/profile" component={Profile} />
      <Route path="/change-password" component={ChangePassword} />

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
