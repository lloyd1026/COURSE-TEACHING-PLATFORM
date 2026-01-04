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
    "选项": q.options ? JSON.stringify(q.options) : "无",
    "答案": q.answer,
    "解析": q.analysis || ""
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "题库导出");
  XLSX.writeFile(workbook, `题库导出_${new Date().getTime()}.xlsx`);
};

/**
 * 下载导入模板
 */
export const downloadImportTemplate = () => {
  const templateData = [
    {
      "题目内容": "示例：1+1等于几？",
      "题型": "single_choice",
      "难度": "easy",
      "选项": '[{"label":"A","text":"1"},{"label":"B","text":"2"}]',
      "答案": "B",
      "解析": "基础加法运算"
    }
  ];
  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "导入模板");
  XLSX.writeFile(workbook, "题库导入模板.xlsx");
};