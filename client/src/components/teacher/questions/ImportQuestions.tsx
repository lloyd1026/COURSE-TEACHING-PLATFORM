import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Upload, FileDown, Loader2, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { downloadImportTemplate } from "@/lib/excel";

interface ImportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ImportQuestionsDialog({ isOpen, onOpenChange, onSuccess }: ImportDialogProps) {
  const [targetCourseId, setTargetCourseId] = useState<string>("");
  const [isParsing, setIsParsing] = useState(false);
  
  const utils = trpc.useUtils();
  const { data: courses } = trpc.courses.list.useQuery();

  // 导入 Mutation
  const importMutation = trpc.questions.import.useMutation({
    onSuccess: (res) => {
      toast.success(res.message || "导入成功");
      utils.questions.list.invalidate();
      onOpenChange(false);
      onSuccess();
    },
    onError: (err) => {
      console.error("Server Import Error:", err);
      toast.error(`提交失败: ${err.message}`);
    }
  });

  // 处理文件解析
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

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          toast.error("Excel 文件内容为空");
          return;
        }

        const formatted = data.map((row: any, index: number) => {
          // 1. 基础字段获取与清洗
          const content = row["题目内容"] || row["题干"];
          const typeLabel = row["题型"];
          const optionsRaw = row["选项(JSON格式)"];

          if (!content || !typeLabel) {
            throw new Error(`第 ${index + 2} 行数据不完整（缺少内容或题型）`);
          }

          // 2. 题型中文转枚举映射
          const typeMap: Record<string, string> = {
            "单选题": "single_choice",
            "多选题": "multiple_choice",
            "判断题": "true_false",
            "填空题": "fill_blank",
            "简答题": "essay",
            "编程题": "programming"
          };
          const finalType = typeMap[typeLabel] || typeLabel;

          // 3. 选项 JSON 解析与标点容错
          let parsedOptions = null;
          if (optionsRaw && optionsRaw !== "无") {
            try {
              const cleanJson = String(optionsRaw)
                .replace(/[\u201c\u201d]/g, '"') // 中文双引号
                .replace(/[\uff0c]/g, ",")       // 中文逗号
                .replace(/[\uff3b]/g, "[")       // 中文左中括号
                .replace(/[\uff3d]/g, "]");      // 中文右中括号
              parsedOptions = JSON.parse(cleanJson);
            } catch (e) {
              console.warn(`第 ${index + 2} 行选项解析失败`, optionsRaw);
            }
          }

          return {
            title: String(content).substring(0, 50),
            content: String(content),
            type: finalType,
            difficulty: row["难度"] === "困难" ? "hard" : row["难度"] === "简单" ? "easy" : "medium",
            options: parsedOptions,
            answer: String(row["答案"] || ""),
            analysis: row["解析"] || "",
            courseId: parseInt(targetCourseId)
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
      {/* 这里的 z-[100] 确保 Dialog 在最上层 */}
      <DialogContent className="sm:max-w-[460px] rounded-[2.5rem] p-8 border-none bg-white shadow-2xl z-[100] focus:outline-none">
        <DialogHeader className="space-y-3 text-left">
          <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-zinc-900">
            <div className="h-10 w-10 bg-zinc-900 rounded-2xl flex items-center justify-center">
              <Upload className="h-5 w-5 text-white" />
            </div>
            批量导入试题
          </DialogTitle>
          <DialogDescription className="text-zinc-500 text-xs">
            系统将自动根据 Excel 内容录入题库，请确保题型名称与模板一致。
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {/* 1. 目标课程选择 */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-zinc-400 ml-1">第一步：选择归属课程</label>
            <Select value={targetCourseId} onValueChange={setTargetCourseId}>
              <SelectTrigger className="h-14 rounded-2xl border-none bg-zinc-100 font-bold px-6 focus:ring-2 focus:ring-zinc-900/10">
                <SelectValue placeholder="选择目标课程..." />
              </SelectTrigger>
              {/* z-[200] 确保下拉框内容浮在 Dialog 之上 */}
              <SelectContent position="popper" className="z-[200] rounded-2xl shadow-2xl border-zinc-100">
                {courses?.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()} className="font-medium py-3 cursor-pointer">
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 2. 文件上传区域 */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-zinc-400 ml-1">第二步：上传 Excel 文件</label>
            <div className={`relative h-32 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center transition-all ${
              !targetCourseId 
                ? "bg-zinc-50 border-zinc-100 opacity-50 cursor-not-allowed" 
                : "bg-zinc-50 border-zinc-200 hover:border-zinc-900 hover:bg-zinc-100 cursor-pointer"
            }`}>
              <input 
                type="file" 
                accept=".xlsx,.xls" 
                onChange={handleFile} 
                disabled={!targetCourseId || isParsing || importMutation.isPending}
                className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed z-10" 
              />
              {isParsing || importMutation.isPending ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">处理中...</span>
                </div>
              ) : (
                <>
                  <FileDown className="h-8 w-8 text-zinc-300 mb-2" />
                  <p className="text-[11px] font-bold text-zinc-400">点击上传或拖拽文件</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 底部按钮栏 */}
        <div className="flex gap-3">
          <Button 
            variant="ghost" 
            onClick={downloadImportTemplate} 
            className="flex-1 h-12 rounded-2xl text-xs font-bold text-zinc-500 gap-2 hover:bg-zinc-50"
          >
            <FileDown className="h-4 w-4" /> 模板下载
          </Button>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            className="flex-1 h-12 rounded-2xl text-xs font-bold border-zinc-200"
          >
            取消
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}