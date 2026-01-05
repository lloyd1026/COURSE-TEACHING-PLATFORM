
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

async function main() {
    const connection = await mysql.createConnection(process.env.DATABASE_URL!);
    // Drop table if exists
    await connection.execute("DROP TABLE IF EXISTS submissionDetails");
    console.log("Dropped table submissionDetails");
    await connection.end();
}

main().catch(console.error);
