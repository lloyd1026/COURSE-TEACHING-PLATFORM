import { useState } from "react";
import { useLocation, Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowLeft, Upload, UserPlus, Download, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface StudentRow {
  username: string;
  password: string;
  name: string;
  studentId?: string;
  email?: string;
}

interface ImportResult {
  success: boolean;
  username: string;
  error?: string;
}

export default function StudentImport() {
  const [, setLocation] = useLocation();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [importing, setImporting] = useState(false);
  const [textInput, setTextInput] = useState("");

  const { data: classes } = trpc.classes.list.useQuery();

  const createStudentsMutation = trpc.users.createStudentsBatch.useMutation({
    onSuccess: (results) => {
      setImportResults(results);
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      if (failCount === 0) {
        toast.success(`成功导入 ${successCount} 名学生`);
      } else {
        toast.warning(`导入完成: ${successCount} 成功, ${failCount} 失败`);
      }
    },
    onError: (error) => {
      toast.error(error.message || "导入失败");
    },
  });

  // 解析文本输入
  const parseTextInput = () => {
    const lines = textInput.trim().split('\n').filter(line => line.trim());
    const parsed: StudentRow[] = [];

    for (const line of lines) {
      const parts = line.split(/[,\t]/).map(p => p.trim());
      if (parts.length >= 2) {
        parsed.push({
          username: parts[0],
          name: parts[1],
          password: parts[2] || '123456', // 默认密码
          studentId: parts[3] || '',
          email: parts[4] || '',
        });
      }
    }

    setStudents(parsed);
    if (parsed.length > 0) {
      toast.success(`解析成功: ${parsed.length} 条记录`);
    } else {
      toast.error("未能解析任何有效记录");
    }
  };

  // 添加单个学生
  const addStudent = () => {
    setStudents([...students, { username: '', name: '', password: '123456' }]);
  };

  // 更新学生信息
  const updateStudent = (index: number, field: keyof StudentRow, value: string) => {
    const updated = [...students];
    updated[index] = { ...updated[index], [field]: value };
    setStudents(updated);
  };

  // 删除学生
  const removeStudent = (index: number) => {
    setStudents(students.filter((_, i) => i !== index));
  };

  // 执行导入
  const handleImport = async () => {
    if (students.length === 0) {
      toast.error("请先添加学生信息");
      return;
    }

    // 验证必填字段
    const invalid = students.filter(s => !s.username || !s.name);
    if (invalid.length > 0) {
      toast.error("请填写所有学生的用户名和姓名");
      return;
    }

    setImporting(true);
    try {
      await createStudentsMutation.mutateAsync({
        students,
        classId: selectedClassId ? parseInt(selectedClassId) : undefined,
      });
    } finally {
      setImporting(false);
    }
  };

  // 下载模板
  const downloadTemplate = () => {
    const template = "用户名,姓名,密码,学号,邮箱\nzhangsan,张三,123456,2024001,zhangsan@example.com\nlisi,李四,123456,2024002,lisi@example.com";
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '学生导入模板.csv';
    link.click();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center gap-4">
          <Link href="/teacher/classes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">批量导入学生</h1>
            <p className="text-muted-foreground">为班级批量创建学生账户</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* 左侧: 输入区域 */}
          <div className="space-y-6">
            {/* 选择班级 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">选择班级</CardTitle>
                <CardDescription>选择要导入学生的班级(可选)</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择班级" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes?.map(cls => (
                      <SelectItem key={cls.id} value={cls.id.toString()}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* 文本导入 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">批量输入</CardTitle>
                <CardDescription>
                  每行一个学生,格式: 用户名,姓名,密码,学号,邮箱 (密码默认123456)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="zhangsan,张三,123456,2024001,zhangsan@example.com
lisi,李四,123456,2024002"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  rows={6}
                />
                <div className="flex gap-2">
                  <Button onClick={parseTextInput} variant="outline" className="gap-2">
                    <Upload className="h-4 w-4" />
                    解析文本
                  </Button>
                  <Button onClick={downloadTemplate} variant="ghost" className="gap-2">
                    <Download className="h-4 w-4" />
                    下载模板
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 手动添加 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">手动添加</CardTitle>
                  <CardDescription>逐个添加学生信息</CardDescription>
                </div>
                <Button onClick={addStudent} size="sm" className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  添加
                </Button>
              </CardHeader>
            </Card>
          </div>

          {/* 右侧: 预览和结果 */}
          <div className="space-y-6">
            {/* 学生列表预览 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  待导入学生 ({students.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {students.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    暂无学生信息,请通过左侧方式添加
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {students.map((student, index) => (
                      <div key={index} className="flex gap-2 items-start p-3 border rounded-lg">
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <Input
                            placeholder="用户名 *"
                            value={student.username}
                            onChange={(e) => updateStudent(index, 'username', e.target.value)}
                          />
                          <Input
                            placeholder="姓名 *"
                            value={student.name}
                            onChange={(e) => updateStudent(index, 'name', e.target.value)}
                          />
                          <Input
                            placeholder="密码"
                            value={student.password}
                            onChange={(e) => updateStudent(index, 'password', e.target.value)}
                          />
                          <Input
                            placeholder="学号"
                            value={student.studentId || ''}
                            onChange={(e) => updateStudent(index, 'studentId', e.target.value)}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeStudent(index)}
                          className="text-destructive"
                        >
                          删除
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {students.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <Button
                      onClick={handleImport}
                      disabled={importing}
                      className="w-full gap-2"
                    >
                      {importing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          导入中...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          开始导入 ({students.length} 名学生)
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 导入结果 */}
            {importResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">导入结果</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>用户名</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>说明</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importResults.map((result, index) => (
                        <TableRow key={index}>
                          <TableCell>{result.username}</TableCell>
                          <TableCell>
                            {result.success ? (
                              <Badge className="gap-1 bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3" />
                                成功
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="gap-1">
                                <XCircle className="h-3 w-3" />
                                失败
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {result.error || '创建成功'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
