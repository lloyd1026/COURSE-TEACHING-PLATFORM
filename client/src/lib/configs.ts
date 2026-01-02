/**
 * 通用学期生成器
 * @param rangeYears 向过去/未来延伸的年份跨度
 * @param mode 'history' (返回从 startYear 到现在的) | 'create' (返回现在及其未来几年的)
 */
export function getSemestersConfig(mode: 'history' | 'create' = 'history', startYear = 2001) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const semesters: { label: string; value: string }[] = [];

  let endYear = currentYear;
  let beginYear = startYear;

  if (mode === 'create') {
    // 创建模式：从今年开始，往后推3年，方便预排课
    beginYear = currentYear;
    endYear = currentYear + 3;
  } else {
    // 历史模式：从平台成立到现在，用于管理员查看全量数据
    beginYear = startYear;
    endYear = currentYear;
  }

  // 统一生成逻辑：从大年份往小年份排（符合用户视觉习惯，最新的在上面）
  for (let y = endYear; y >= beginYear; y--) {
    // 秋季学期 (y-y+1)
    semesters.push({
      label: `${y}-${y + 1} 第一学期 (秋季)`,
      value: `${y}-${y + 1}-1`,
    });
    // 春季学期 (y-1-y)
    semesters.push({
      label: `${y - 1}-${y} 第二学期 (春季)`,
      value: `${y - 1}-${y}-2`,
    });
  }

  return semesters;
}

/**
 * 生成年级列表 (Grade List)
 * 逻辑：从今年开始，往前推 4 年
 */
export function generateGrades() {
  const currentYear = new Date().getFullYear();
  const grades: { label: string; value: number }[] = [];

  for (let i = 0; i <= 4; i++) {
    const year = currentYear - i;
    grades.push({
      label: `${year} 级`,
      value: year
    });
  }

  return grades;
}


/**
 * 计算机类标准专业目录
 */
export const COMPUTER_MAJORS = [
  "计算机科学与技术",
  "软件工程",
  "网络工程",
  "信息安全",
  "物联网工程",
  "数字媒体技术",
  "智能科学与技术",
  "数据科学与大数据技术",
  "网络空间安全",
  "人工智能",
  "区块链工程",
  "密码科学与技术"
] as const;

export type ComputerMajor = typeof COMPUTER_MAJORS[number];

// 前端 config 定义
export const QUESTION_TYPE_CONFIG = {
  single_choice: { label: "单选题", color: "blue", icon: "Radio" },
  multiple_choice: { label: "多选题", color: "purple", icon: "CheckSquare" },
  fill_blank: { label: "填空题", color: "orange", icon: "Type" },
  true_false: { label: "判断题", color: "green", icon: "CheckCircle" },
  essay: { label: "问答题", color: "yellow", icon: "FileText" },
  programming: { label: "编程题", color: "slate", icon: "Code" },
} as const;

export const DIFFICULTY_CONFIG = {
  easy: { label: "简单", variant: "success" },
  medium: { label: "中等", variant: "warning" },
  hard: { label: "困难", variant: "destructive" },
} as const;