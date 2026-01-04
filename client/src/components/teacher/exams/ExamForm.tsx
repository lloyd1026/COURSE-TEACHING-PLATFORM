import { useState, useEffect, useMemo, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { 
  Loader2, Save, BookOpen, Clock, Trophy, Users, X, 
  CheckCircle2, FileText, Sparkles, AlertCircle 
} from "lucide-react";
import { toast } from "sonner";
import { formatToLocalDatetime } from "@/lib/utils";

interface ExamFormProps {
  initialData?: any; 
  onSuccess: () => void;
  onCancel: () => void;
}

export function ExamForm({ initialData, onSuccess, onCancel }: ExamFormProps) {
  const utils = trpc.useUtils();
  const isInitialized = useRef(false);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    courseId: "", 
    classIds: [] as number[], 
    duration: 120,
    totalScore: 100,
    startTime: "",
  });

  // 1. 获取课程与关联班级数据
  const { data: courses, isLoading: isCoursesLoading } = trpc.courses.list.useQuery();

  // 2. 级联逻辑：获取当前选中课程下的可用班级
  const availableClasses = useMemo(() => {
    if (!formData.courseId || !courses) return [];
    const selectedCourse = courses.find((c: any) => c.id.toString() === formData.courseId);
    return (selectedCourse as any)?.linkedClasses || [];
  }, [formData.courseId, courses]);

  // 3. 核心修复：数据回填逻辑 (处理 ID 转换与时间格式)
  useEffect(() => {
    if (initialData && !isInitialized.current) {
      // 解决回填失效：如果 initialData 来自列表，classIds 可能是 targetClasses 数组，需要 map 出 ID
      const initialClassIds = initialData.classIds 
        ? initialData.classIds 
        : (initialData.targetClasses?.map((c: any) => c.id) || []);

      setFormData({
        title: initialData.title || "",
        description: initialData.description || "",
        courseId: initialData.courseId?.toString() || "",
        classIds: initialClassIds, 
        duration: initialData.duration || 120,
        totalScore: initialData.totalScore || 100,
        // 核心修复：调用本地化时间转换函数，防止时间乱跳
        startTime: formatToLocalDatetime(initialData.startTime),
      });

      // 标记已初始化，防止用户修改时被 initialData 覆盖
      if (initialData.id) {
        isInitialized.current = true;
      }
    }
  }, [initialData]);

  // 4. Upsert 提交
  const upsertMutation = trpc.exams.upsert.useMutation({
    onSuccess: () => {
      toast.success(initialData ? "考试配置已更新" : "考试已成功分发至各班级");
      utils.exams.list.invalidate();
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleCourseChange = (newCourseId: string) => {
    setFormData(prev => ({
      ...prev,
      courseId: newCourseId,
      classIds: [] // 切换课程时重置班级，确保数据安全性
    }));
  };

  const handleClassToggle = (id: number) => {
    setFormData(prev => ({
      ...prev,
      classIds: prev.classIds.includes(id) 
        ? prev.classIds.filter(v => v !== id) 
        : [...prev.classIds, id]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.courseId) return toast.error("请选择关联课程");
    if (formData.classIds.length === 0) return toast.error("请至少选择一个班级");
    if (!formData.startTime) return toast.error("请设置考试开始时间");
    
    upsertMutation.mutate({
      ...formData,
      id: initialData?.id,
      courseId: parseInt(formData.courseId),
      // 提交时 new Date() 会根据字符串自动识别本地时间并转为标准 ISO 传给后端
      startTime: new Date(formData.startTime),
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/20 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-2xl bg-white/95 backdrop-blur-2xl rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.16)] overflow-hidden flex flex-col max-h-[90vh] border border-white">
        
        <header className="px-10 pt-10 pb-6 flex justify-between items-start">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
              {initialData ? "管理考试分发" : "发布新考试"}
            </h2>
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Aggregate Distribution Layer</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel} className="rounded-full h-10 w-10 bg-zinc-100/50 hover:bg-zinc-100 transition-colors">
            <X className="h-5 w-5 text-zinc-400" />
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto px-10 py-2 custom-scrollbar">
          <div className="space-y-8 pb-10">
            
            <div className="space-y-6 p-6 bg-zinc-50/50 rounded-[2rem] border border-zinc-100 shadow-inner">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-zinc-400 ml-1 flex items-center gap-2">
                  <BookOpen className="h-3 w-3" /> 1. 核心课程
                </Label>
                <Select value={formData.courseId} onValueChange={handleCourseChange}>
                  <SelectTrigger className="h-14 rounded-2xl border-none bg-white shadow-sm px-6 font-bold text-zinc-700">
                    <SelectValue placeholder={isCoursesLoading ? "正在载入..." : "选择一门课程..."} />
                  </SelectTrigger>
                  <SelectContent position="popper" className="rounded-2xl border-zinc-100 shadow-2xl z-[110] min-w-[var(--radix-select-trigger-width)]">
                    {courses?.map((c: any) => (
                      <SelectItem key={c.id} value={c.id.toString()} className="rounded-xl my-1 mx-1 font-medium text-xs">
                        {c.name} ({c.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-zinc-400 ml-1 flex items-center gap-2">
                  <Sparkles className="h-3 w-3" /> 2. 考试名称
                </Label>
                <Input 
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="text-lg font-bold border-none bg-white shadow-sm h-14 rounded-2xl px-6 transition-all focus:ring-2 focus:ring-blue-500/10" 
                  placeholder="如：2026 第一学期期末考试"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <Label className="text-[10px] font-black uppercase text-zinc-400 flex items-center gap-2">
                  <Users className="h-3.5 w-3.5" /> 3. 选择考试班级
                </Label>
                {formData.courseId && (
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full animate-in zoom-in-90 border border-blue-100">
                    已选: {formData.classIds.length}
                  </span>
                )}
              </div>

              {!formData.courseId ? (
                <div className="flex flex-col items-center justify-center p-12 bg-zinc-50/50 rounded-[2.5rem] border-2 border-dashed border-zinc-200 text-zinc-400 space-y-3">
                  <AlertCircle className="h-6 w-6 opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-tighter">请先选择课程以加载授课班级</p>
                </div>
              ) : availableClasses.length === 0 ? (
                <div className="p-10 text-center bg-orange-50/50 rounded-[2.5rem] border border-orange-100 space-y-2">
                  <p className="text-xs font-bold text-orange-600 uppercase italic">该课程暂未在当前学期绑定班级</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-bottom-4 duration-500">
                  {availableClasses.map((c: any) => {
                    const isChecked = formData.classIds.includes(c.id);
                    return (
                      <div 
                        key={c.id}
                        onClick={() => handleClassToggle(c.id)}
                        className={`group relative flex items-center justify-between p-5 rounded-[1.75rem] cursor-pointer border-2 transition-all duration-300 ${
                          isChecked 
                            ? "bg-white border-blue-500 shadow-lg shadow-blue-100/30" 
                            : "bg-white border-zinc-100 hover:border-zinc-200"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            isChecked ? "bg-blue-500 border-blue-500 scale-110 shadow-sm" : "bg-white border-zinc-200"
                          }`}>
                            {isChecked && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                          </div>
                          <span className={`text-[13px] font-bold ${isChecked ? "text-blue-700" : "text-zinc-500"}`}>
                            {c.name}
                          </span>
                        </div>
                        {isChecked && <div className="absolute top-2 right-4 h-1 w-4 bg-blue-500 rounded-full opacity-20" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-zinc-400 flex items-center gap-2">
                  <Clock className="h-3 w-3" /> 时长 (分钟)
                </Label>
                <Input type="number" value={formData.duration} onChange={e => setFormData({...formData, duration: parseInt(e.target.value)})} className="rounded-2xl border-none bg-zinc-100/50 h-12 px-6 font-bold text-zinc-700 shadow-inner" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-zinc-400 flex items-center gap-2">
                  <Trophy className="h-3 w-3" /> 满分分值
                </Label>
                <Input type="number" value={formData.totalScore} onChange={e => setFormData({...formData, totalScore: parseInt(e.target.value)})} className="rounded-2xl border-none bg-zinc-100/50 h-12 px-6 font-bold text-zinc-700 shadow-inner" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-zinc-400 ml-1">开考准确时间</Label>
              <Input 
                type="datetime-local" 
                value={formData.startTime} 
                onChange={e => setFormData({...formData, startTime: e.target.value})} 
                className="rounded-2xl border-none bg-zinc-100/50 h-12 px-6 font-medium text-zinc-600 focus:bg-white transition-all shadow-inner cursor-pointer"
              />
            </div>

            <div className="space-y-2 pb-6">
              <Label className="text-[10px] font-black uppercase text-zinc-400 flex items-center gap-2">
                <FileText className="h-3 w-3" /> 考试说明
              </Label>
              <Textarea 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="rounded-[2rem] min-h-[140px] bg-zinc-100/50 border-none p-6 focus:bg-white transition-all resize-none text-sm leading-relaxed shadow-inner" 
                placeholder="请输入考试纪律、备注等信息..."
              />
            </div>
          </div>
        </div>

        <footer className="p-8 bg-white border-t border-zinc-50 flex gap-4">
          <Button variant="ghost" onClick={onCancel} className="h-16 rounded-[1.75rem] flex-1 font-bold text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600 transition-all">
            取消修改
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={upsertMutation.isPending || !formData.courseId} 
            className="h-16 rounded-[1.75rem] flex-[2.5] bg-zinc-900 text-white font-bold text-base shadow-2xl active:scale-95 transition-all gap-2 disabled:opacity-20"
          >
            {upsertMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Save className="h-5 w-5" />
                <span>{initialData ? "确认修改" : `同步分发至 ${formData.classIds.length} 个班级`}</span>
              </>
            )}
          </Button>
        </footer>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
}