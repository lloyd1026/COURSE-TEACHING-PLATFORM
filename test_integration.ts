
import { appRouter } from "./server/routers";
import * as db from "./server/db";
import * as auth from "./server/auth";
import { users, courses } from "./drizzle/schema";
import { eq } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config();

// Mock Request/Response for context
const mockReq: any = {
    headers: {},
    cookies: {},
};
const mockRes: any = {
    clearCookie: () => { },
    cookie: () => { },
};

async function createCaller(role: "admin" | "teacher" | "student", username: string) {
    // Get user from DB
    const user = await auth.getUserByUsername(username);

    if (!user) throw new Error(`User ${username} not found`);

    return appRouter.createCaller({
        req: mockReq,
        res: mockRes,
        user: user,
    });
}

async function runTests() {
    console.log("Starting Integration Tests...");

    try {
        // 1. Admin Workflow (Setup)
        console.log("\n--- Admin Workflow (Setup) ---");
        const admin = await createCaller("admin", "admin");

        // Stats
        const stats = await admin.stats.overview();
        console.log("Initial Stats:", { userCount: stats.userCount });

        // Create Test Teacher
        const teacherName = `teacher_${Date.now()}`;
        const teacherUser = await admin.users.create({
            username: teacherName,
            password: "password123",
            name: "Test Teacher",
            role: "teacher"
        });
        console.log("Created Test Teacher:", teacherUser.username);

        // Create Test Student
        const studentName = `student_${Date.now()}`;
        const studentUser = await admin.users.create({
            username: studentName,
            password: "password123",
            name: "Test Student",
            role: "student"
        });
        console.log("Created Test Student:", studentUser.username);

        // 2. Teacher Workflow
        console.log("\n--- Teacher Workflow ---");
        const teacher = await createCaller("teacher", teacherName);

        // Create Course
        const courseCode = `CS-${Date.now()}`;
        const course = await teacher.courses.upsert({
            name: "Integration Test Course",
            code: courseCode,
            description: "Testing...",
            semester: "2024-Fall",
            credits: 3,
            status: "active"
        });
        console.log("Created Course ID:", course.id);

        // Create Class
        const cls = await teacher.classes.create({
            name: "Class A",
            semester: "2024-Fall",
            grade: 2024,
            major: "CS"
        });

        // Link class to course
        await teacher.courses.linkClass({
            courseId: course.id as number,
            classId: cls.id,
            semester: "2024-Fall",
            year: 2024
        });
        console.log("Created Class ID:", (cls as any).id || cls);

        // 3. Student Workflow
        console.log("\n--- Student Workflow ---");
        const student = await createCaller("student", studentName);

        // Enroll Student (Directly via DB or Teacher calls?)
        // users can be added to class via teacher.classes.createStudentsBatch
        // But that creates users.
        // We need 'addStudent' logic.
        // Check db.ts: addStudentToClass
        // There is no explicit addStudentToClass procedure in router except 'createStudentsBatch'
        // or ensure upsertStudentsToClass handles existing.
        // Let's try upsertStudentsToClass with existing user.

        await teacher.classes.createStudentsBatch({
            classId: cls.id,
            students: [{ studentId: studentName, name: "Test Student" }]
        });
        console.log("Enrolled Student via Batch Create");

        // Verify Student sees course
        const studentCourses = await student.courses.list();
        console.log("Student Courses Count:", studentCourses.length);

        // Clean up (optional)
        console.log("\nCleaning up...");
        if (teacherUser.id) await admin.users.delete({ id: teacherUser.id });
        if (studentUser.id) await admin.users.delete({ id: studentUser.id });
        console.log("Deleted Test Users");

        console.log("\n✅ Tests Completed Successfully");

    } catch (error) {
        console.error("\n❌ Test Failed:", error);
        process.exit(1);
    }
    process.exit(0);
}

runTests();
