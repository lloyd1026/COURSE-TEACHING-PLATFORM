import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Upload, FileDown, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { downloadImportTemplate } from "@/lib/excel";

interface ImportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ImportQuestionsDialog({
  isOpen,
  onOpenChange,
  onSuccess,
}: ImportDialogProps) {
  const [targetCourseId, setTargetCourseId] = useState<string>("");
  const [isParsing, setIsParsing] = useState(false);

  const utils = trpc.useUtils();
  const { data: courses } = trpc.courses.list.useQuery();

  const importMutation = trpc.questions.import.useMutation({
    onSuccess: res => {
      toast.success(res.count ? `成功导入 ${res.count} 题` : "导入成功");
      utils.questions.list.invalidate();
      onOpenChange(false);
      onSuccess();
    },
    onError: err => {
      toast.error(`提交失败: ${err.message}`);
    },
  });

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!targetCourseId) {
      toast.error("请先选择目标课程");
      e.target.value = "";
      return;
    }

    setIsParsing(true);
    const reader = new FileReader();

    reader.onload = evt => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          toast.error("Excel 文件内容为空");
          return;
        }

        const formatted = data.map((row: any, index: number) => {
          // ⚡️ 1. 深度容错：处理不同的列名写法
          const content = row["题目内容"] || row["题干"] || row["内容"];
          const typeLabel = (row["题型"] || "").trim();
          const optionsRaw = row["选项(JSON格式)"] || row["选项"] || "";
          const answerRaw = String(row["答案"] || "").trim();

          if (!content || !typeLabel) {
            throw new Error(`第 ${index + 2} 行数据不完整（缺少内容或题型）`);
          }

          // ⚡️ 2. 题型转换
          const typeMap: Record<string, string> = {
            单选题: "single_choice",
            多选题: "multiple_choice",
            判断题: "true_false",
            填空题: "fill_blank",
            问答题: "essay",
            编程题: "programming",
          };
          const finalType = typeMap[typeLabel] || typeLabel;

          // ⚡️ 3. 核心修复：针对判断题强制生成标准选项和答案格式
          let finalOptions: any = null;
          let finalAnswer = answerRaw.toUpperCase();

          if (finalType === "true_false") {
            // 无论 Excel 里的 JSON 怎么填，判断题强制使用标准的 T/F 结构
            finalOptions = [
              { label: "T", text: "正确" },
              { label: "F", text: "错误" },
            ];
            // 答案纠偏：兼容“正确/对/T”或“错误/错/F”
            if (
              finalAnswer.includes("对") ||
              finalAnswer.includes("正确") ||
              finalAnswer === "T"
            ) {
              finalAnswer = "T";
            } else {
              finalAnswer = "F";
            }
          } else if (optionsRaw && optionsRaw !== "无") {
            // 普通选择题：增加中文标点符号的清洗转换
            try {
              const cleanJson = String(optionsRaw)
                .replace(/[\u201c\u201d]/g, '"') // 中文引号
                .replace(/[\uff0c]/g, ",") // 中文逗号
                .replace(/[\uff3b]/g, "[") // 中文左中括号
                .replace(/[\uff3d]/g, "]"); // 中文右中括号
              finalOptions = JSON.parse(cleanJson);
            } catch (e) {
              console.warn(`第 ${index + 2} 行选项解析失败`, optionsRaw);
              finalOptions = null;
            }
          }

          return {
            title: String(content).substring(0, 50),
            content: String(content),
            type: finalType,
            difficulty:
              row["难度"] === "困难"
                ? "hard"
                : row["难度"] === "简单"
                  ? "easy"
                  : "medium",
            options: finalOptions,
            answer: finalAnswer,
            analysis: row["解析"] || "",
            courseId: parseInt(targetCourseId),
          };
        });

        importMutation.mutate({ questions: formatted });
      } catch (err: any) {
        toast.error(err.message || "解析失败，请检查 Excel 格式");
      } finally {
        setIsParsing(false);
        e.target.value = "";
      }
    };

    reader.readAsBinaryString(file);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] rounded-[3rem] p-10 border-none bg-white shadow-2xl z-[100] focus:outline-none overflow-hidden">
        <DialogHeader className="space-y-4 text-left">
          <DialogTitle className="text-3xl font-black flex items-center gap-4 text-zinc-900">
            <div className="h-12 w-12 bg-zinc-900 rounded-[1.2rem] flex items-center justify-center shadow-lg">
              <Upload className="h-6 w-6 text-white" />
            </div>
            批量导入试题
          </DialogTitle>
          <DialogDescription className="text-zinc-400 font-bold text-xs uppercase tracking-widest">
            AI-Powered Question Asset Sync
          </DialogDescription>
        </DialogHeader>

        <div className="py-8 space-y-8">
          {/* 第一步：选择归属课程 */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-zinc-400 ml-1 tracking-[0.1em]">
              第一步：指定目标课程
            </label>
            <Select value={targetCourseId} onValueChange={setTargetCourseId}>
              <SelectTrigger className="h-14 rounded-2xl border-none bg-zinc-50 font-bold px-6 focus:ring-2 focus:ring-zinc-900/10 transition-all">
                <SelectValue placeholder="选择目标课程..." />
              </SelectTrigger>
              <SelectContent
                position="popper"
                className="z-[200] rounded-2xl shadow-2xl border-zinc-50 p-2"
              >
                {courses?.map(c => (
                  <SelectItem
                    key={c.id}
                    value={c.id.toString()}
                    className="font-bold py-3 rounded-xl cursor-pointer"
                  >
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 第二步：文件上传区域 */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-zinc-400 ml-1 tracking-[0.1em]">
              第二步：上传数据矩阵 (Excel)
            </label>
            <div
              className={`relative h-40 border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center transition-all duration-300 ${
                !targetCourseId
                  ? "bg-zinc-50 border-zinc-100 opacity-50 cursor-not-allowed"
                  : "bg-zinc-50 border-zinc-200 hover:border-zinc-900 hover:bg-zinc-100 cursor-pointer shadow-inner"
              }`}
            >
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFile}
                disabled={
                  !targetCourseId || isParsing || importMutation.isPending
                }
                className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
              />
              {isParsing || importMutation.isPending ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-10 w-10 animate-spin text-zinc-300" />
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                    解析引擎运行中...
                  </span>
                </div>
              ) : (
                <>
                  <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3">
                    <FileDown className="h-6 w-6 text-zinc-300" />
                  </div>
                  <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">
                    点击或拖拽 Excel 文件至此
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 底部按钮栏 */}
        <div className="flex gap-4">
          <Button
            variant="ghost"
            onClick={downloadImportTemplate}
            className="flex-1 h-14 rounded-2xl text-xs font-black text-zinc-400 uppercase tracking-widest gap-2 hover:bg-zinc-50 transition-all"
          >
            <FileDown className="h-4 w-4" /> 模板下载
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            className="flex-1 h-14 rounded-2xl text-xs font-black bg-zinc-900 text-white shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
          >
            放弃
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
