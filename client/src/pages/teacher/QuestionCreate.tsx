import { useState } from "react";
import { useLocation, Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";

export default function QuestionCreate() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    content: "",
    type: "single_choice",
    difficulty: "medium",
    score: 5,
    answer: "",
    explanation: "",
    courseId: "",
    questionTypeId: "",
  });
  const [options, setOptions] = useState([
    { label: "A", content: "" },
    { label: "B", content: "" },
    { label: "C", content: "" },
    { label: "D", content: "" },
  ]);

  const { data: courses } = trpc.courses.list.useQuery();
  // const { data: questionTypes } = trpc.questions.types.useQuery();
  const questionTypes: any[] = []; // TODO: Add question types API

  const createQuestionMutation = trpc.questions.create.useMutation({
    onSuccess: () => {
      toast.success("题目创建成功!");
      setLocation("/teacher/questions");
    },
    onError: (error) => {
      toast.error(error.message || "创建失败");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.content || !formData.courseId) {
      toast.error("请填写必填字段");
      return;
    }
    setLoading(true);
    try {
      const optionsJson = formData.type.includes("choice") 
        ? JSON.stringify(options.filter(o => o.content)) 
        : undefined;
      
      await createQuestionMutation.mutateAsync({
        title: formData.content.substring(0, 100),
        content: formData.content,
        difficulty: formData.difficulty as "easy" | "medium" | "hard",
        answer: formData.answer || undefined,
        analysis: formData.explanation || undefined,
        options: optionsJson,
        courseId: parseInt(formData.courseId),
        questionTypeId: formData.questionTypeId ? parseInt(formData.questionTypeId) : 1,
        createdBy: 1,
      });
    } finally {
      setLoading(false);
    }
  };

  const addOption = () => {
    const nextLabel = String.fromCharCode(65 + options.length);
    setOptions([...options, { label: nextLabel, content: "" }]);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, content: string) => {
    const newOptions = [...options];
    newOptions[index].content = content;
    setOptions(newOptions);
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/teacher/questions">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">添加题目</h1>
            <p className="text-muted-foreground">创建新的题库题目</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>题目信息</CardTitle>
            <CardDescription>填写题目的基本信息</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>所属课程 *</Label>
                  <Select value={formData.courseId} onValueChange={(v) => setFormData({...formData, courseId: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择课程" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses?.map((course: any) => (
                        <SelectItem key={course.id} value={course.id.toString()}>{course.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>题目分类</Label>
                  <Select value={formData.questionTypeId} onValueChange={(v) => setFormData({...formData, questionTypeId: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择分类" />
                    </SelectTrigger>
                    <SelectContent>
                      {questionTypes?.map((type: any) => (
                        <SelectItem key={type.id} value={type.id.toString()}>{type.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>题型 *</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single_choice">单选题</SelectItem>
                      <SelectItem value="multiple_choice">多选题</SelectItem>
                      <SelectItem value="fill_blank">填空题</SelectItem>
                      <SelectItem value="short_answer">简答题</SelectItem>
                      <SelectItem value="programming">编程题</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>难度</Label>
                  <Select value={formData.difficulty} onValueChange={(v) => setFormData({...formData, difficulty: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">简单</SelectItem>
                      <SelectItem value="medium">中等</SelectItem>
                      <SelectItem value="hard">困难</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="score">分值</Label>
                  <Input
                    id="score"
                    type="number"
                    min={1}
                    max={100}
                    value={formData.score}
                    onChange={(e) => setFormData({...formData, score: parseInt(e.target.value) || 5})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">题干 *</Label>
                <Textarea
                  id="content"
                  placeholder="请输入题目内容..."
                  rows={4}
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  required
                />
              </div>

              {formData.type.includes("choice") && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>选项</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addOption}>
                      <Plus className="h-4 w-4 mr-1" />
                      添加选项
                    </Button>
                  </div>
                  {options.map((option, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <span className="font-medium w-6">{option.label}.</span>
                      <Input
                        placeholder={`选项${option.label}内容`}
                        value={option.content}
                        onChange={(e) => updateOption(index, e.target.value)}
                        className="flex-1"
                      />
                      {options.length > 2 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="answer">答案</Label>
                <Input
                  id="answer"
                  placeholder={formData.type.includes("choice") ? "如: A 或 A,B,C" : "请输入正确答案"}
                  value={formData.answer}
                  onChange={(e) => setFormData({...formData, answer: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="explanation">解析</Label>
                <Textarea
                  id="explanation"
                  placeholder="题目解析说明..."
                  rows={3}
                  value={formData.explanation}
                  onChange={(e) => setFormData({...formData, explanation: e.target.value})}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      创建中...
                    </>
                  ) : (
                    "创建题目"
                  )}
                </Button>
                <Link href="/teacher/questions">
                  <Button type="button" variant="outline">取消</Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
