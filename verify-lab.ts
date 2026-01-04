
import { getDb, submitExperiment, getExperimentProgress, getStudentSubmission } from './server/db';
import { eq } from 'drizzle-orm';
import { students, experiments, users } from './drizzle/schema';
import 'dotenv/config';

async function main() {
    const db = await getDb();
    if (!db) {
        console.error("DB connection failed");
        return;
    }

    // 1. Setup: Get a student and an experiment
    const experimentId = 6;

    // Use SQL builder instead of db.query
    const result = await db.select({
        student: students,
        user: users
    })
        .from(students)
        .innerJoin(users, eq(students.userId, users.id))
        .limit(1);

    const studentRecord = result[0];

    if (!studentRecord) {
        console.error("No student found");
        return;
    }

    const { student, user } = studentRecord;

    console.log(`Testing with Student: ${user.name} (${student.studentId})`);

    // 2. Simulate Save Draft
    console.log("\n--- Action: Save Draft ---");
    await submitExperiment({
        experimentId,
        studentId: student.id,
        code: "// Draft Code",
        status: 'draft'
    });

    // 3. Check Teacher View (Progress)
    let progress = await getExperimentProgress(experimentId);
    let studentProgress = progress.find(p => p.studentId === student.studentId);
    console.log("Teacher View (Draft):", {
        status: studentProgress?.status,
        hasSubmissionId: !!studentProgress?.submissionId,
        lastAction: studentProgress?.lastActionAt
    });

    if (studentProgress?.status !== 'draft') {
        console.error("FAILED: Expected status 'draft'");
    }

    // 4. Simulate Submit
    console.log("\n--- Action: Submit ---");
    await submitExperiment({
        experimentId,
        studentId: student.id,
        code: "// Final Code",
        status: 'submitted'
        // AI Stats would be added here in real flow
    });

    // 5. Check Teacher View (Submitted)
    progress = await getExperimentProgress(experimentId);
    studentProgress = progress.find(p => p.studentId === student.studentId);
    console.log("Teacher View (Submitted):", {
        status: studentProgress?.status,
        submittedAt: studentProgress?.submittedAt
    });

    if (studentProgress?.status !== 'submitted') {
        console.error("FAILED: Expected status 'submitted'");
    }

    // 6. Check Student View (Get Submission)
    const submission = await getStudentSubmission(experimentId, student.id);
    console.log("\n--- Student View ---");
    console.log("My Submission:", {
        status: submission?.status,
        code: submission?.code
    });

    if (submission?.code !== "// Final Code") {
        console.error("FAILED: Code content mismatch");
    }

    console.log("\nVerification Complete.");
    process.exit(0);
}

main().catch(console.error);
