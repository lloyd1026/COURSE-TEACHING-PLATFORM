"use client";

import { useState } from "react";
import { useParams, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ArrowLeft,
  CheckCircle2,
  Clock,
  User,
  ChevronRight,
  Trophy,
} from "lucide-react";
import { Link } from "wouter";

export default function ExamGradingList() {
  const { examId: routeId } = useParams<{ examId: string }>();
  const examId = parseInt(routeId || "0");

  // 1. 获取考试基本信息
  const { data: exam } = trpc.exams.get.useQuery({ id: examId });
  
  // 2. 获取该场考试的所有学生提交记录
  const { data: students, isLoading } = trpc.exams.getSubmissions.useQuery({ examId });
    
  if (isLoading)
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-zinc-50">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-900" />
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 italic">正在同步考生数据...</p>
      </div>
    );

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        
        {/* Header: 延续黑白简约风 */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <Link href={`/teacher/exams`}>
              <Button variant="ghost" size="icon" className="rounded-2xl bg-white shadow-sm border border-zinc-100 hover:bg-zinc-50 h-12 w-12">
                <ArrowLeft className="h-5 w-5 text-zinc-900" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black italic uppercase tracking-tighter text-zinc-900">
                  考试批阅模式
                </h1>
                <Badge className="bg-zinc-900 text-white border-none rounded-lg text-[10px] font-black px-2 py-0.5">EXAM_GRADING</Badge>
              </div>
              <p className="text-zinc-400 text-xs font-bold mt-1">
                当前考试：<span className="text-zinc-900">{exam?.title}</span>
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="px-6 py-3 bg-white rounded-2xl border border-zinc-100 shadow-sm flex items-center gap-3">
              <Trophy className="h-4 w-4 text-amber-500" />
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-zinc-300 uppercase leading-none">总分设定</span>
                <span className="text-sm font-black text-zinc-900">{exam?.totalScore || 100} Pts</span>
              </div>
            </div>
          </div>
        </header>

        {/* 表格卡片：延续大圆角设计 */}
        <div className="bg-white rounded-[2.5rem] border border-zinc-100 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.02)]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100">
                <th className="px-10 py-6 text-[10px] font-black uppercase text-zinc-400 tracking-widest">
                  学生档案
                </th>
                <th className="px-10 py-6 text-[10px] font-black uppercase text-zinc-400 tracking-widest">
                  所属班级
                </th>
                <th className="px-10 py-6 text-[10px] font-black uppercase text-zinc-400 tracking-widest">
                  当前状态
                </th>
                <th className="px-10 py-6 text-[10px] font-black uppercase text-zinc-400 tracking-widest">
                  最终得分
                </th>
                <th className="px-10 py-6 text-[10px] font-black uppercase text-zinc-400 text-right tracking-widest">
                  管理操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {students?.map(s => {
                const isSubmitted = !!s.submissionId;
                const isPendingGrading = s.status === "submitted";

                return (
                  <tr
                    key={s.studentId}
                    className="group hover:bg-zinc-50/30 transition-all"
                  >
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white transition-all">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-black text-zinc-800 text-sm">
                            {s.studentName}
                          </div>
                          <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">
                            SN: {s.studentNumber}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <Badge
                        variant="outline"
                        className="text-[10px] font-black border-zinc-200 text-zinc-400 px-3 py-1 rounded-lg"
                      >
                        {s.className}
                      </Badge>
                    </td>
                    <td className="px-10 py-6">
                      {isSubmitted ? (
                        <div className="flex items-center gap-2 text-emerald-600">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-xs font-black italic">已交卷</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-zinc-300 italic">
                          <Clock className="h-4 w-4" />
                          <span className="text-xs font-bold">缺考 / 未交</span>
                        </div>
                      )}
                    </td>
                    <td className="px-10 py-6">
                      {isSubmitted ? (
                        <div className="flex items-baseline gap-1">
                          <span className="font-black text-lg text-zinc-900">{s.totalScore}</span>
                          <span className="text-[10px] font-bold text-zinc-400">Pts</span>
                        </div>
                      ) : (
                        <span className="text-zinc-200 font-black">--</span>
                      )}
                    </td>
                    <td className="px-10 py-6 text-right">
                      {isSubmitted ? (
                        <Link href={`/teacher/exams/grading/${s.submissionId}`}>
                          <Button
                            className={`h-11 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-sm ${
                              isPendingGrading
                                ? "bg-zinc-900 text-white hover:shadow-xl hover:scale-105"
                                : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                            }`}
                          >
                            {isPendingGrading ? "立即批阅" : "查看详情"}
                            <ChevronRight className="ml-2 h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          disabled
                          className="h-11 px-6 rounded-xl font-black text-[10px] uppercase bg-zinc-50 text-zinc-200 border-none"
                        >
                          无记录
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {/* 列表底部统计 */}
          <div className="bg-zinc-50/30 px-10 py-6 border-t border-zinc-50 flex justify-between items-center">
            <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest italic">
              Student Records Management Layer
            </p>
            <div className="flex gap-8 text-[11px] font-black text-zinc-400">
               <span className="flex items-center gap-2">已完成: <span className="text-zinc-900">{students?.filter(s => s.submissionId).length || 0}</span></span>
               <span className="flex items-center gap-2">待批阅: <span className="text-blue-600">{students?.filter(s => s.status === 'submitted').length || 0}</span></span>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
      `}} />
    </DashboardLayout>
  );
}