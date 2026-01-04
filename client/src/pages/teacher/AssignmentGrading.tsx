import { useParams } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ArrowLeft,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Link } from "wouter";

export default function AssignmentGrading() {
  const { id } = useParams<{ id: string }>();
  const assignmentId = parseInt(id || "0");

  const { data: assignment } = trpc.assignments.get.useQuery({
    id: assignmentId,
  });
  const { data: students, isLoading } =
    trpc.submissions.getAssignmentSubmissions.useQuery({ assignmentId });
    
  if (isLoading)
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-zinc-300" />
      </div>
    );

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <header className="flex items-center gap-4">
          <Link href={`/teacher/assignments/${assignmentId}`}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-black italic uppercase tracking-tighter text-zinc-900">
              批阅模式
            </h1>
            <p className="text-zinc-400 text-xs font-bold">
              正在处理：{assignment?.title}
            </p>
          </div>
        </header>

        <div className="bg-white rounded-[2.5rem] border border-zinc-100 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100">
                <th className="px-8 py-5 text-[10px] font-black uppercase text-zinc-400">
                  学生信息
                </th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-zinc-400">
                  所属班级
                </th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-zinc-400">
                  提交状态
                </th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-zinc-400">
                  当前得分
                </th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-zinc-400 text-right">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {students?.map(s => (
                <tr
                  key={s.studentId}
                  className="group hover:bg-zinc-50/50 transition-colors"
                >
                  <td className="px-8 py-5">
                    <div className="font-bold text-zinc-800">
                      {s.studentName}
                    </div>
                    <div className="text-[10px] text-zinc-400 font-medium">
                      学号: {s.studentNumber}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <Badge
                      variant="outline"
                      className="text-[10px] font-bold border-zinc-200 text-zinc-400"
                    >
                      {s.className}
                    </Badge>
                  </td>
                  <td className="px-8 py-5">
                    {s.submissionId ? (
                      <div className="flex items-center gap-2 text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span className="text-xs font-bold">已提交</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-zinc-300">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="text-xs font-bold">未提交</span>
                      </div>
                    )}
                  </td>
                  <td className="px-8 py-5 font-black text-sm">
                    {s.submissionId ? `${s.totalScore} Pts` : "--"}
                  </td>
                  <td className="px-8 py-5 text-right">
                    {s.submissionId ? (
                      <Link href={`/teacher/grading/${s.submissionId}`}>
                        <Button
                          className={`h-8 px-4 rounded-lg font-bold text-[10px] uppercase transition-all ${
                            s.status === "submitted"
                              ? "bg-zinc-900 text-white"
                              : "bg-zinc-100 text-zinc-400 hover:bg-zinc-200"
                          }`}
                        >
                          {s.status === "submitted" ? "立即批改" : "重新查看"}
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        disabled
                        className="h-8 px-4 rounded-lg font-bold text-[10px] uppercase bg-zinc-50 text-zinc-200"
                      >
                        无法操作
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
