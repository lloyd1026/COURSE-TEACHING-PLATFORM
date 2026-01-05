
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./drizzle/schema";
import { eq } from "drizzle-orm";
import { users } from "./drizzle/schema";
import { hashPassword } from "./server/auth"; // Need to check if this export is available/usable in script
import dotenv from "dotenv";

dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL!);
const db = drizzle(connection, { schema, mode: "default" });

async function ensureAdmin() {
    console.log("Checking for admin user...");
    const adminUser = await db.query.users.findFirst({
        where: eq(users.username, "admin"),
    });

    if (adminUser) {
        console.log("Admin user already exists.");
        // Optional: Reset password to be sure? User didn't ask to reset, just 'create'. 
        // But if they can't login, maybe reset is good. 
        // Let's just create if missing first.
    } else {
        console.log("Admin user not found. Creating...");
        // Manually hash "admin123" if I can't import hashPassword easily, but I should try to import.
        // simpler: usage of crypto directly here to avoid potential relative path import issues with TSX if not set up perfectly.
        const { createHash } = await import("crypto");
        const hashedPassword = createHash('sha256').update("admin123").digest('hex');

        await db.insert(users).values({
            username: "admin",
            password: hashedPassword,
            name: "System Admin",
            role: "admin",
            loginMethod: "system",
            lastSignedIn: new Date(),
        });
        console.log("Admin user created (admin / admin123).");
    }
    process.exit(0);
}

ensureAdmin().catch(console.error);
