import * as XLSX from "xlsx";
import { QUESTION_TYPE_CONFIG, DIFFICULTY_CONFIG } from "./configs";

/**
 * 导出题目到 Excel
 */
export const exportQuestionsToExcel = (selectedQuestions: any[]) => {
  const data = selectedQuestions.map(q => ({
    "题目内容": q.content,
    "题型": QUESTION_TYPE_CONFIG[q.type as keyof typeof QUESTION_TYPE_CONFIG]?.label || q.type,
    "难度": DIFFICULTY_CONFIG[q.difficulty as keyof typeof DIFFICULTY_CONFIG]?.label || q.difficulty,
    "选项": q.options ? (typeof q.options === 'string' ? q.options : JSON.stringify(q.options)) : "无",
    "答案": q.answer,
    "解析": q.analysis || ""
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "题库导出");
  
  // 设置导出列宽
  worksheet["!cols"] = [
    { wch: 50 }, // 内容
    { wch: 12 }, // 题型
    { wch: 10 }, // 难度
    { wch: 60 }, // 选项
    { wch: 10 }, // 答案
    { wch: 30 }  // 解析
  ];

  XLSX.writeFile(workbook, `题库导出_${new Date().getTime()}.xlsx`);
};

/**
 * 下载导入模板
 * 包含：判断题(T/F模式)、单选题、多选题、简答题示例
 */
export const downloadImportTemplate = () => {
  const templateData = [
    {
      "题目内容": "示例(判断题)：在分页存储管理中，页表的作用是实现逻辑地址到物理地址的映射。",
      "题型": "true_false",
      "难度": "easy",
      "选项": '[{"label":"T","text":"正确"},{"label":"F","text":"错误"}]',
      "答案": "T",
      "解析": "页表记录了逻辑页号与物理块号的对应关系。"
    },
    {
      "题目内容": "示例(单选题)：1+1等于几？",
      "题型": "single_choice",
      "难度": "easy",
      "选项": '[{"label":"A","text":"1"},{"label":"B","text":"2"},{"label":"C","text":"3"},{"label":"D","text":"4"}]',
      "答案": "B",
      "解析": "基础算术运算。"
    },
    {
      "题目内容": "示例(多选题)：哪些属于操作系统？",
      "题型": "multiple_choice",
      "难度": "medium",
      "选项": '[{"label":"A","text":"Windows"},{"label":"B","text":"Linux"},{"label":"C","text":"Photoshop"},{"label":"D","text":"macOS"}]',
      "答案": "ABD",
      "解析": "Photoshop属于应用软件。"
    },
    {
      "题目内容": "示例(简答题)：请简述什么是进程？",
      "题型": "essay",
      "难度": "hard",
      "选项": "无",
      "答案": "进程是程序的一次执行过程，是系统进行资源分配和调度的基本单位。",
      "解析": "考察操作系统基本概念。"
    }
  ];

  // 1. 创建工作表
  const worksheet = XLSX.utils.json_to_sheet(templateData);

  // 2. 设置列宽，方便老师在 Excel 中直接看到完整的 JSON 选项结构
  worksheet["!cols"] = [
    { wch: 60 }, // 题目内容
    { wch: 15 }, // 题型
    { wch: 10 }, // 难度
    { wch: 65 }, // 选项 (JSON结构较长，给予足够宽度)
    { wch: 10 }, // 答案
    { wch: 30 }  // 解析
  ];

  // 3. 创建工作簿
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "导入模板");

  // 4. 导出文件
  XLSX.writeFile(workbook, "题库导入模板_标准版.xlsx");
};