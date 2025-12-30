import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function seed() {
  let connection;
  try {
    connection = await mysql.createConnection(process.env.DATABASE_URL);
    console.log('🌱 开始初始化数据库...');

    // 清空现有数据(按依赖顺序)
    console.log('清空现有数据...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    const tables = [
      'experimentSubmissions', 'experiments',
      'examAnswerDetails', 'examAnswers', 'examQuestions', 'exams',
      'knowledgePointRelations', 'knowledgePoints', 'chapters',
      'questions', 'questionTypes', 'assignmentSubmissions', 'assignments',
      'courseClasses', 'classes', 'courses',
      'students', 'teachers', 'users'
    ];
    
    for (const table of tables) {
      await connection.query(`TRUNCATE TABLE ${table}`);
    }
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✓ 数据清空完成');

    // 1. 创建用户
    console.log('创建用户...');
    await connection.query(
      `INSERT INTO users (openId, name, email, loginMethod, role) VALUES
       ('admin-001', '张管理员', 'admin@example.com', 'manus', 'admin'),
       ('teacher-001', '李老师', 'teacher1@example.com', 'manus', 'teacher'),
       ('teacher-002', '王老师', 'teacher2@example.com', 'manus', 'teacher'),
       ('student-001', '张三', 'student1@example.com', 'manus', 'student'),
       ('student-002', '李四', 'student2@example.com', 'manus', 'student'),
       ('student-003', '王五', 'student3@example.com', 'manus', 'student'),
       ('student-004', '赵六', 'student4@example.com', 'manus', 'student'),
       ('student-005', '钱七', 'student5@example.com', 'manus', 'student')`
    );
    console.log('✓ 用户创建完成');

    // 2. 创建课程
    console.log('创建课程...');
    await connection.query(
      `INSERT INTO courses (name, code, description, teacherId, credits, status) VALUES
       ('数据结构与算法', 'CS101', '学习基本的数据结构和算法设计', 2, 4, 'active'),
       ('操作系统原理', 'CS102', '深入理解操作系统的核心概念', 2, 4, 'active'),
       ('数据库系统', 'CS201', '关系型数据库设计与SQL编程', 3, 3, 'active'),
       ('计算机网络', 'CS202', '网络协议与网络编程基础', 3, 3, 'active'),
       ('软件工程', 'CS301', '软件开发生命周期与项目管理', 2, 3, 'draft')`
    );
    console.log('✓ 课程创建完成');

    // 3. 创建班级
    console.log('创建班级...');
    await connection.query(
      `INSERT INTO classes (name, grade, major, headTeacherId, studentCount) VALUES
       ('计算机科学2021级1班', 2021, '计算机科学与技术', 2, 30),
       ('计算机科学2021级2班', 2021, '计算机科学与技术', 3, 28),
       ('软件工程2022级1班', 2022, '软件工程', 2, 32),
       ('数据科学2022级1班', 2022, '数据科学与大数据技术', 3, 25)`
    );
    console.log('✓ 班级创建完成');

    // 4. 创建作业
    console.log('创建作业...');
    await connection.query(
      `INSERT INTO assignments (courseId, classId, title, description, dueDate, createdBy, status) VALUES
       (1, 1, '链表实现练习', '实现单链表的基本操作:插入、删除、查找', DATE_ADD(NOW(), INTERVAL 7 DAY), 2, 'published'),
       (1, 1, '二叉树遍历', '实现二叉树的前序、中序、后序遍历', DATE_ADD(NOW(), INTERVAL 14 DAY), 2, 'published'),
       (2, 1, '进程调度模拟', '模拟实现FCFS和RR调度算法', DATE_ADD(NOW(), INTERVAL 10 DAY), 2, 'published'),
       (3, 2, 'SQL查询练习', '完成复杂的多表连接查询', DATE_ADD(NOW(), INTERVAL 5 DAY), 3, 'published'),
       (4, 2, 'TCP协议分析', '使用Wireshark分析TCP三次握手', DATE_ADD(NOW(), INTERVAL 12 DAY), 3, 'draft')`
    );
    console.log('✓ 作业创建完成');

    // 5. 创建题型
    console.log('创建题型...');
    await connection.query(
      `INSERT INTO questionTypes (courseId, name, description) VALUES
       (1, '单选题', '单项选择题,只有一个正确答案'),
       (1, '多选题', '多项选择题,有多个正确答案'),
       (2, '判断题', '判断对错'),
       (2, '填空题', '填写答案'),
       (3, '简答题', '简要回答问题'),
       (1, '编程题', '编写代码解决问题')`
    );
    console.log('✓ 题型创建完成');

    // 6. 创建题目
    console.log('创建题目...');
    await connection.query(
      `INSERT INTO questions (questionTypeId, courseId, title, content, answer, difficulty, createdBy) VALUES
       (1, 1, '数组的时间复杂度', '在数组中查找元素的平均时间复杂度是?', 'O(n)', 'easy', 2),
       (1, 1, '二叉树的性质', '完全二叉树的叶子节点只可能在哪两层?', '最后两层', 'medium', 2),
       (2, 2, '操作系统功能', '操作系统的主要功能包括?(多选)', '进程管理,内存管理,文件管理,设备管理', 'easy', 2),
       (5, 3, 'SQL语句', '请简述SELECT语句的执行顺序', 'FROM->WHERE->GROUP BY->HAVING->SELECT->ORDER BY', 'medium', 3),
       (6, 1, '链表反转', '编写函数反转单链表', 'ListNode* reverse(ListNode* head) {...}', 'hard', 2)`
    );
    console.log('✓ 题目创建完成');

    // 7. 创建考试
    console.log('创建考试...');
    await connection.query(
      `INSERT INTO exams (courseId, classId, title, description, duration, startTime, endTime, totalScore, createdBy, status) VALUES
       (1, 1, '数据结构期中考试', '涵盖线性表、栈、队列、树的内容', 120, DATE_ADD(NOW(), INTERVAL 3 DAY), DATE_ADD(NOW(), INTERVAL 4 DAY), 100, 2, 'not_started'),
       (2, 1, '操作系统期末考试', '全面考查操作系统核心知识', 150, DATE_ADD(NOW(), INTERVAL 30 DAY), DATE_ADD(NOW(), INTERVAL 31 DAY), 100, 2, 'not_started'),
       (3, 2, '数据库系统测验', 'SQL语句和数据库设计', 90, DATE_ADD(NOW(), INTERVAL 7 DAY), DATE_ADD(NOW(), INTERVAL 8 DAY), 100, 3, 'not_started')`
    );
    console.log('✓ 考试创建完成');

    // 8. 创建知识图谱章节
    console.log('创建知识图谱...');
    await connection.query(
      `INSERT INTO chapters (courseId, title, description) VALUES
       (1, '第一章 绪论', '数据结构的基本概念'),
       (1, '第二章 线性表', '顺序表和链表'),
       (1, '第三章 栈和队列', '栈和队列的应用'),
       (1, '第四章 树和二叉树', '树的遍历和应用'),
       (2, '第一章 操作系统概述', '操作系统的功能和特征'),
       (2, '第二章 进程管理', '进程的概念和调度')`
    );
    console.log('✓ 章节创建完成');

    // 9. 创建知识点
    await connection.query(
      `INSERT INTO knowledgePoints (courseId, chapterId, name, description) VALUES
       (1, 1, '算法复杂度', '时间复杂度和空间复杂度的概念'),
       (1, 2, '顺序表', '数组实现的线性表'),
       (1, 2, '单链表', '链式存储的线性表'),
       (1, 3, '栈的应用', '表达式求值、括号匹配'),
       (1, 4, '二叉树遍历', '前序、中序、后序遍历'),
       (2, 5, '操作系统功能', '进程管理、内存管理、文件管理'),
       (2, 6, '进程调度算法', 'FCFS、SJF、RR等调度算法')` 
    );
    console.log('✓ 知识点创建完成');

    // 10. 创建实验
    console.log('创建实验...');
    await connection.query(
      `INSERT INTO experiments (courseId, classId, title, description, requirements, dueDate, createdBy, status) VALUES
       (1, 1, '实验1:链表操作', '实现链表的基本操作', '完成链表的插入、删除、查找功能', DATE_ADD(NOW(), INTERVAL 14 DAY), 2, 'published'),
       (2, 1, '实验2:进程调度', '模拟进程调度算法', '实现FCFS和RR算法', DATE_ADD(NOW(), INTERVAL 21 DAY), 2, 'published'),
       (3, 2, '实验3:数据库设计', '设计学生管理系统数据库', '完成ER图和表结构设计', DATE_ADD(NOW(), INTERVAL 10 DAY), 3, 'draft')`
    );
    console.log('✓ 实验创建完成');

    console.log('\n✅ 数据库初始化成功!');
    console.log('📊 创建了以下数据:');
    console.log('  - 8个用户 (1管理员 + 2教师 + 5学生)');
    console.log('  - 5门课程');
    console.log('  - 4个班级');
    console.log('  - 5个作业');
    console.log('  - 6种题型');
    console.log('  - 5道题目');
    console.log('  - 3场考试');
    console.log('  - 6个章节 + 7个知识点');
    console.log('  - 3个实验');

  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

seed();
