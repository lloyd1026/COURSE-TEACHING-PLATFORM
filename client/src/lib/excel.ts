import * as XLSX from "xlsx";
import { QUESTION_TYPE_CONFIG } from "./configs";

/**
 * 统一导出到 Excel (含判断题纠偏)
 */
export const exportQuestionsToExcel = (selectedQuestions: any[]) => {
  const data = selectedQuestions.map(q => {
    let finalAnswer = q.answer;
    
    // ⚡️ 导出纠偏：确保判断题在 Excel 中是 T/F
    if (q.type === "true_false") {
      const upper = String(q.answer).toUpperCase().trim();
      finalAnswer = (upper === "T" || upper === "正确" || upper === "对") ? "T" : "F";
    }

    return {
      "题目内容": q.content,
      "题型": QUESTION_TYPE_CONFIG[q.type as keyof typeof QUESTION_TYPE_CONFIG]?.label || q.type,
      "难度": q.difficulty === "hard" ? "困难" : q.difficulty === "easy" ? "简单" : "中等",
      "选项(JSON格式)": q.options ? JSON.stringify(q.options) : "无",
      "答案": finalAnswer,
      "解析": q.analysis || ""
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "题库导出");
  
  // 设置列宽
  worksheet["!cols"] = [{ wch: 50 }, { wch: 12 }, { wch: 10 }, { wch: 60 }, { wch: 10 }, { wch: 30 }];
  
  XLSX.writeFile(workbook, `题库导出_${new Date().getTime()}.xlsx`);
};

/**
 * 统一导入模板下载 - 包含全题型示例
 */
export const downloadImportTemplate = () => {
  const templateData = [
    {
      "题目内容": "示例1：单选题 - 操作系统中分配资源的基本单位是？",
      "题型": "单选题",
      "难度": "简单",
      "选项(JSON格式)": '[{"label":"A","text":"程序"},{"label":"B","text":"进程"},{"label":"C","text":"作业"},{"label":"D","text":"线程"}]',
      "答案": "B",
      "解析": "进程是资源分配的基本单位，线程是处理机调度的基本单位。"
    },
    {
      "题目内容": "示例2：多选题 - 常见的磁盘调度算法包括哪些？",
      "题型": "多选题",
      "难度": "中等",
      "选项(JSON格式)": '[{"label":"A","text":"FCFS"},{"label":"B","text":"SSTF"},{"label":"C","text":"SCAN"},{"label":"D","text":"LRU"}]',
      "答案": "ABC",
      "解析": "LRU 是页面置换算法，不是磁盘调度算法。"
    },
    {
      "题目内容": "示例3：判断题 - 虚存容量仅受物理内存大小的限制。",
      "题型": "判断题",
      "难度": "中等",
      "选项(JSON格式)": '[{"label":"T","text":"正确"},{"label":"F","text":"错误"}]',
      "答案": "F",
      "解析": "还受计算机地址字长的限制。"
    },
    {
      "题目内容": "示例4：填空题 - 计算机系统中，CPU 对外部设备的控制方式主要有程序查询、中断和 ___ 方式。",
      "题型": "填空题",
      "难度": "简单",
      "选项(JSON格式)": "无",
      "答案": "DMA",
      "解析": "DMA（直接存储器存取）是三种主要 I/O 控制方式之一。"
    },
    {
      "题目内容": "示例5：问答题 - 简述死锁产生的四个必要条件。",
      "题型": "问答题",
      "难度": "困难",
      "选项(JSON格式)": "无",
      "答案": "1.互斥条件；2.占有且等待；3.不可剥夺；4.循环等待。",
      "解析": "这四个条件必须同时满足才会发生死锁。"
    },
    {
      "题目内容": "示例6：编程题 - 请用 Python 实现快速排序算法。",
      "题型": "编程题",
      "难度": "困难",
      "选项(JSON格式)": "无",
      "答案": "def quick_sort(arr):\n    if len(arr) <= 1: return arr\n    pivot = arr[len(arr) // 2]\n    ...",
      "解析": "重点考察分治思想与递归实现。"
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "导入模板");

  // ⚡️ 体验优化：设置列宽，方便老师直接查看内容
  worksheet["!cols"] = [
    { wch: 60 }, // 题目内容
    { wch: 10 }, // 题型
    { wch: 10 }, // 难度
    { wch: 40 }, // 选项(JSON格式)
    { wch: 15 }, // 答案
    { wch: 30 }, // 解析
  ];

  XLSX.writeFile(workbook, "题库导入模板_全题型标准版.xlsx");
};