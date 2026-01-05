"use client";

import { useMemo, useEffect } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { FileCode, FileEdit, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  question: any;
  value: any;
  onChange: (value: any) => void;
  readOnly?: boolean;
}

export function QuestionRenderer({ question, value, onChange, readOnly = false }: Props) {
  
  // 1. 核心修复：极致兼容后端 options
  const options = useMemo(() => {
    if (!question?.options) return [];
    // 如果后端已经解析过了（是数组），直接用
    if (Array.isArray(question.options)) return question.options;
    // 如果后端没解析（是字符串），这里解析
    if (typeof question.options === 'string') {
      try {
        return JSON.parse(question.options);
      } catch (e) {
        return [];
      }
    }
    return [];
  }, [question.options]);

  // 2. 强制转换 type 为小写，防止匹配失败
  const type = (question.type || "").toLowerCase();

  // --- 分支 A: 选择类 (单选/多选/判断) ---
  if (type === "single_choice" || type === "true_false" || type === "multiple_choice") {
    const isMultiple = type === "multiple_choice";
    
    return (
      <div className="space-y-4">
        {options.map((opt: any) => {
          // 兼容后端可能出现的 key 或 label 字段
          const optionKey = opt.key || opt.label;
          const currentAnswers = isMultiple ? (value || "").split(",").filter(Boolean) : [];
          const isSelected = isMultiple ? currentAnswers.includes(optionKey) : value === optionKey;

          return (
            <div 
              key={optionKey} 
              onClick={() => {
                if (readOnly) return;
                if (isMultiple) {
                  const next = currentAnswers.includes(optionKey)
                    ? currentAnswers.filter((v: string) => v !== optionKey)
                    : [...currentAnswers, optionKey];
                  onChange(next.sort().join(","));
                } else {
                  onChange(optionKey);
                }
              }}
              className={`flex items-center p-6 rounded-[2rem] border-2 transition-all cursor-pointer ${
                isSelected ? "bg-blue-600 border-blue-600 text-white shadow-xl" : "bg-slate-50 border-transparent hover:border-slate-200"
              }`}
            >
              <div className={`h-12 w-12 rounded-2xl border-2 flex items-center justify-center text-lg font-black mr-6 ${
                isSelected ? "bg-white text-blue-600" : "bg-white text-slate-400"
              }`}>{optionKey}</div>
              <Label className="flex-1 cursor-pointer text-lg font-bold">{opt.text}</Label>
            </div>
          );
        })}
      </div>
    );
  }

  // --- 分支 B: 编程题 (programming) ---
  if (type === "programming") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-2 text-blue-600">
            <FileCode className="h-5 w-5" />
            <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Code Editor</span>
          </div>
          <Badge className="bg-zinc-900 text-emerald-400 font-mono text-[10px]">main.cpp</Badge>
        </div>
        <Textarea 
          disabled={readOnly}
          value={value || ""} 
          onChange={(e) => onChange(e.target.value)}
          placeholder="// 请在此编写代码实现..." 
          className="min-h-[450px] rounded-[2.5rem] bg-zinc-900 border-none p-10 text-emerald-400 font-mono text-base leading-relaxed focus:ring-4 focus:ring-blue-500/10 shadow-2xl resize-none" 
        />
      </div>
    );
  }

  // --- 分支 C: 填空题 (fill_blank) ---
  if (type === "fill_blank") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-zinc-400 px-4">
          <HelpCircle className="h-4 w-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">请填写答案</span>
        </div>
        <Input 
          disabled={readOnly}
          value={value || ""} 
          onChange={(e) => onChange(e.target.value)}
          className="h-20 rounded-2xl bg-zinc-100 border-none px-10 text-2xl font-bold shadow-inner focus:bg-white transition-all"
        />
      </div>
    );
  }

  // --- 默认分支: 简答题 (essay) 或 异常兜底 ---
  // 只要 ID 存在，这个分支保证一定能看到 Textarea
  return (
    <div className="space-y-4">
       <div className="flex items-center gap-2 text-zinc-400 px-4 italic">
         <FileEdit className="h-4 w-4" />
         <span className="text-[10px] font-black uppercase tracking-widest">作答区域</span>
       </div>
       <Textarea 
         disabled={readOnly}
         value={value || ""} 
         onChange={(e) => onChange(e.target.value)}
         placeholder="请详细描述您的回答..." 
         className="min-h-[400px] rounded-[2.5rem] bg-zinc-50 border-none p-10 text-xl font-medium leading-relaxed shadow-inner focus:bg-white transition-all resize-none text-zinc-800" 
       />
    </div>
  );
}