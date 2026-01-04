
import 'dotenv/config';
import { getDb } from './server/db.ts';
import {
    users, teachers, courses, classes, students,
    chapters, knowledgePoints, knowledgePointRelations,
    assignments, assignmentClasses, submissions as assignmentSubmissions,
    experiments, experimentSubmissions,
    questions, exams, examQuestions
} from './drizzle/schema.ts';
import crypto from 'crypto';

function hashPassword(password: string) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

async function seed() {
    const db = (await getDb())!;
    console.log('🌱 Starting database seeding with rich CS data...');

    try {
        // 1. Clean existing data
        console.log('Cleaning data...');
        const tables = [
            examQuestions, exams,
            experimentSubmissions, experiments,
            assignmentSubmissions, assignments,
            knowledgePointRelations, questions,
            knowledgePoints, chapters,
            students, classes, courses,
            teachers, users
        ];

        // Naively delete all. In production, truncate with cascade is better, but delete works here.
        for (const table of tables) {
            await db.delete(table);
        }
        console.log('✓ Cleaned existing data');

        // 2. Create Users
        // Teacher
        const [teacherRes] = await db.insert(users).values({
            username: 'teacher',
            password: hashPassword('123456'),
            role: 'teacher',
            name: 'Alice Turing',
            email: 'alice@cs.edu',
            loginMethod: 'system',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice'
        });
        const teacherId = teacherRes.insertId;

        // IMPORTANT: Create Teacher Profile
        await db.insert(teachers).values({
            userId: teacherId,
            department: 'Computer Science',
            title: 'Professor',
            bio: 'Expert in Algorithms and AI.'
        });

        // Students
        const [s1Res] = await db.insert(users).values({
            username: 'student1',
            password: hashPassword('123456'),
            role: 'student',
            name: 'Bob Student',
            email: 'bob@cs.edu',
            loginMethod: 'system',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob'
        });
        const student1Id = s1Res.insertId;

        const [s2Res] = await db.insert(users).values({
            username: 'student2',
            password: hashPassword('123456'),
            role: 'student',
            name: 'Charlie Student',
            email: 'charlie@cs.edu',
            loginMethod: 'system',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie'
        });
        const student2Id = s2Res.insertId;

        console.log('✓ Created users & profiles');

        // 3. Create Course & Class
        const [courseRes] = await db.insert(courses).values({
            name: '数据结构与算法 (Data Structures & Algorithms)',
            code: 'CS202',
            description: '本课程深入探讨计算机科学中的核心数据组织方式和算法设计策略。涵盖线性表、树、图等结构及排序、搜索算法。',
            teacherId: teacherId,
            credits: 4,
            status: 'active',
            semester: '2026 Spring'
        });
        const courseId = courseRes.insertId;

        const [classRes] = await db.insert(classes).values({
            name: '2026春季 CS202 1班',
            headTeacherId: teacherId,
            grade: 2026,
            major: 'CS'
        });
        const classId = classRes.insertId;

        // Link students to class
        await db.insert(students).values([
            { userId: student1Id, studentId: '2023001', classId: classId, major: 'CS', enrollmentYear: 2023 },
            { userId: student2Id, studentId: '2023002', classId: classId, major: 'CS', enrollmentYear: 2023 }
        ]);

        console.log('✓ Created course and class');

        // 4. Knowledge Graph
        const chaptersData = [
            { title: '第一章：算法导论', desc: '算法的基本概念、复杂度分析与渐进符号。' },
            { title: '第二章：线性表', desc: '数组、链表、栈和队列的原理与实现。' },
            { title: '第三章：树与二叉树', desc: '树的定义、遍历、二叉搜索树及平衡树。' },
            { title: '第四章：图论基础', desc: '图的存储、遍历、最短路径与最小生成树算法。' },
            { title: '第五章：高级数据结构', desc: '堆、哈希表与并查集。' },
            { title: '第六章：排序与查找', desc: '内部排序算法比较与查找技术。' }
        ];

        const chapterIds: number[] = [];
        let order = 1;
        for (const c of chaptersData) {
            const [res] = await db.insert(chapters).values({
                courseId,
                title: c.title,
                description: c.desc,
                chapterOrder: order++
            });
            chapterIds.push(res.insertId);
        }

        const kpData = [
            { name: '时间复杂度 (Time Complexity)', desc: '算法运行时间随输入规模增长的变化趋势，常用 Big O 表示。', chIdx: 0 },
            { name: '空间复杂度 (Space Complexity)', desc: '算法运行所需内存空间与输入规模的关系。', chIdx: 0 },
            { name: '动态数组 (Dynamic Array)', desc: '支持自动扩容的连续内存存储结构。', chIdx: 1 },
            { name: '单链表 (Singly Linked List)', desc: '节点包含数据和后继指针的链式结构。', chIdx: 1 },
            { name: '栈 (Stack)', desc: '后进先出 (LIFO) 的线性数据结构。', chIdx: 1 },
            { name: '队列 (Queue)', desc: '先进先出 (FIFO) 的线性数据结构。', chIdx: 1 },
            { name: '二叉树遍历 (Binary Tree Traversal)', desc: '前序、中序、后序及层序遍历算法。', chIdx: 2 },
            { name: '二叉搜索树 (BST)', desc: '左子树所有节点 < 根 < 右子树所有节点的二叉树。', chIdx: 2 },
            { name: 'AVL树 (AVL Tree)', desc: '自平衡二叉搜索树。', chIdx: 2 },
            { name: '图的遍历 (BFS/DFS)', desc: '广度优先搜索与深度优先搜索算法。', chIdx: 3 },
            { name: 'Dijkstra算法', desc: '解决单源最短路径问题的经典贪心算法。', chIdx: 3 },
            { name: '二叉堆 (Binary Heap)', desc: '完全二叉树实现的优先队列结构。', chIdx: 4 },
            { name: '快速排序 (Quick Sort)', desc: '分治法实现的原地排序算法，平均 O(n log n)。', chIdx: 5 },
            { name: '归并排序 (Merge Sort)', desc: '稳定的分治排序算法。', chIdx: 5 },
        ];

        const kpMap = new Map();
        for (const kp of kpData) {
            const [res] = await db.insert(knowledgePoints).values({
                courseId,
                chapterId: chapterIds[kp.chIdx],
                name: kp.name,
                description: kp.desc,
            });
            kpMap.set(kp.name, res.insertId);
        }
        console.log(`✓ Created ${kpMap.size} Knowledge Points`);

        // 5. Experiments
        const experimentsData = [
            {
                title: '实验一：实现动态数组与链表',
                desc: '分别实现支持自动扩容的 ArrayList 和带头节点的 LinkedList。',
                req: '1. 完成 ArrayList 类 (add, get, remove).\n2. 完成 LinkedList 类.\n3. 编写测试用例.',
                dueDays: 7,
                kps: ['动态数组 (Dynamic Array)', '单链表 (Singly Linked List)']
            },
            {
                title: '实验二：表达式求值',
                desc: '利用栈结构实现中缀表达式求值。',
                req: '1. 中缀转后缀.\n2. 后缀求值.',
                dueDays: 14,
                kps: ['栈 (Stack)']
            },
            {
                title: '实验三：BST 操作',
                desc: '构建二叉搜索树并实现遍历。',
                req: 'Insert, Delete, Search, LevelOrderTraversal.',
                dueDays: 21,
                kps: ['二叉搜索树 (BST)']
            }
        ];

        for (const exp of experimentsData) {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + exp.dueDays);
            const [res] = await db.insert(experiments).values({
                courseId, classId, title: exp.title, description: exp.desc, requirements: exp.req, dueDate, createdBy: teacherId, status: 'published'
            });
            const expId = res.insertId;

            // Link KPs
            for (const k of exp.kps) {
                if (kpMap.has(k)) {
                    await db.insert(knowledgePointRelations).values({ experimentId: expId, knowledgePointId: kpMap.get(k) });
                }
            }

            // Mock Submissions
            await db.insert(experimentSubmissions).values({
                experimentId: expId,
                studentId: student1Id,
                code: '// Student 1 Code submission...',
                status: 'evaluated',
                score: (85 + Math.random() * 10).toFixed(2),
                feedback: 'Good job, but watch edge cases.',
                submittedAt: new Date()
            });
        }

        // 6. Assignments
        const assignmentsData = [
            { title: '作业1：复杂度分析', desc: '完成习题 1.1-1.5', dueDays: 5, kps: ['时间复杂度 (Time Complexity)'] },
            { title: '作业2：排序比较', desc: '比较快排与归并', dueDays: 20, kps: ['快速排序 (Quick Sort)', '归并排序 (Merge Sort)'] }
        ];

        for (const asm of assignmentsData) {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + asm.dueDays);
            const [res] = await db.insert(assignments).values({
                courseId, title: asm.title, description: asm.desc, dueDate, createdBy: teacherId, status: 'published'
            });
            const asmId = res.insertId;
            await db.insert(assignmentClasses).values({ assignmentId: asmId, classId });

            for (const k of asm.kps) {
                if (kpMap.has(k)) {
                    await db.insert(knowledgePointRelations).values({ assignmentId: asmId, knowledgePointId: kpMap.get(k) });
                }
            }

            // Mock Submission
            await db.insert(assignmentSubmissions).values({
                sourceId: asmId,
                sourceType: 'assignment',
                studentId: student1Id,
                status: 'graded',
                totalScore: '90.00',
                globalFeedback: 'Excellent analysis.',
                submittedAt: new Date(),
                gradedBy: teacherId,
                gradedAt: new Date()
            });
        }

        // 7. Question Bank
        const questionsData = [
            { content: '快排最坏时间复杂度？', type: 'single_choice', options: ['O(n)', 'O(n^2)', 'O(log n)', 'O(n log n)'], answer: 'O(n^2)', kp: '快速排序 (Quick Sort)' },
            { content: '先进先出的数据结构？', type: 'single_choice', options: ['栈', '队列', '堆'], answer: '队列', kp: '队列 (Queue)' },
            { content: 'BST 的查找复杂度？', type: 'single_choice', options: ['O(1)', 'O(log n)', 'O(n)'], answer: 'O(log n)', kp: '二叉搜索树 (BST)' },
            { content: '反转链表代码？', type: 'programming', options: null, answer: '...', kp: '单链表 (Singly Linked List)' }
        ];

        const questionIds: number[] = [];
        for (const q of questionsData) {
            const [res] = await db.insert(questions).values({
                courseId, content: q.content, title: q.content.slice(0, 15), type: q.type as any, options: q.options, answer: q.answer, difficulty: 'medium', createdBy: teacherId, status: 'active'
            });
            const qId = res.insertId;
            questionIds.push(qId);
            if (q.kp && kpMap.has(q.kp)) {
                await db.insert(knowledgePointRelations).values({ questionId: qId, knowledgePointId: kpMap.get(q.kp) });
            }
        }

        console.log('✅ Seeding completed! Teacher account should work now.');
        console.log('Teacher: teacher / 123456');
        console.log('Student: student1 / 123456');

    } catch (error: any) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

seed().then(() => {
    process.exit(0);
});
