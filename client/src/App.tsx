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
import ClassManage from "./pages/teacher/ClassManage";
import ClassDetail from "./pages/teacher/ClassDetail";
import AssignmentList from "./pages/teacher/AssignmentList";
import AssignmentDetail from "./pages/teacher/AssignmentDetail";
import QuestionBank from "./pages/teacher/QuestionBank";
import ExamList from "./pages/teacher/ExamList";
import ExamDetail from "./pages/teacher/ExamDetail";
import KnowledgeGraph from "./pages/teacher/KnowledgeGraph";
import ExperimentList from "./pages/teacher/ExperimentList";
import TeacherExperimentDetail from "./pages/teacher/ExperimentDetail";
import StudentCourseList from "./pages/student/CourseList";
import StudentAssignmentList from "./pages/student/AssignmentList";
import StudentAssignmentDetail from "./pages/student/AssignmentDetail";
import StudentExamList from "./pages/student/ExamList";
import StudentExamTaking from "./pages/student/ExamTaking";
import AIAssistant from "./pages/student/AIAssistant";
import StudentExperimentList from "./pages/student/ExperimentList";
import StudentExperimentDetail from "./pages/student/ExperimentDetail";
import StudentKnowledgeGraph from "./pages/student/KnowledgeGraph";
import Profile from "./pages/Profile";
import StudentCourseDetail from "./pages/student/StudentCourseDetail";
import AssignmentGrading from "./pages/teacher/AssignmentGrading";
import GradingDetail from "./pages/teacher/GradingDetail";

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

      {/* Teacher Routes - specific routes first */}
      <Route path="/teacher/dashboard" component={TeacherDashboard} />
      <Route path="/teacher/courses/:id" component={CourseDetail} />
      <Route path="/teacher/courses" component={CourseList} />
      <Route path="/teacher/classes/:id" component={ClassDetail} />
      <Route path="/teacher/classes" component={ClassManage} />
      <Route path="/teacher/assignments/:id" component={AssignmentDetail} />
      <Route path="/teacher/assignments" component={AssignmentList} />
      <Route path="/teacher/questions" component={QuestionBank} />
      <Route path="/teacher/exams/:id" component={ExamDetail} />
      <Route path="/teacher/exams" component={ExamList} />
      <Route path="/teacher/knowledge-graph" component={KnowledgeGraph} />
      <Route path="/teacher/experiments/:id" component={TeacherExperimentDetail} />
      <Route path="/teacher/experiments" component={ExperimentList} />
      <Route
        path="/teacher/assignments/:id/grading"
        component={AssignmentGrading}
      />
      <Route path="/teacher/grading/:submissionId" component={GradingDetail} />

      {/* Student Routes - specific routes first */}
      <Route path="/student/dashboard" component={StudentDashboard} />
      <Route path="/student/courses/:id" component={StudentCourseDetail} />
      <Route path="/student/courses" component={StudentCourseList} />
      <Route path="/student/assignments/:id" component={StudentAssignmentDetail} />
      <Route path="/student/assignments" component={StudentAssignmentList} />
      <Route path="/student/exams/:id/take" component={StudentExamTaking} />
      <Route path="/student/exams" component={StudentExamList} />
      <Route path="/student/ai-assistant" component={AIAssistant} />
      <Route path="/student/experiments/:id" component={StudentExperimentDetail} />
      <Route path="/student/experiments" component={StudentExperimentList} />
      <Route path="/student/knowledge-graph" component={StudentKnowledgeGraph} />

      {/* Common Routes */}
      <Route path="/profile" component={Profile} />

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
