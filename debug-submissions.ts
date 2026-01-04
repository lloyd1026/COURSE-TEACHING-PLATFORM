
import 'dotenv/config';
import { getDb, getSubmissionsByExperiment } from "./server/db";

async function main() {
    console.log("--- Testing getSubmissionsByExperiment(6) ---");
    try {
        const results = await getSubmissionsByExperiment(6);
        console.log("Result count:", results.length);
        console.log(JSON.stringify(results, null, 2));
    } catch (e) {
        console.error("Query failed:", e);
    }

    process.exit(0);
}

main().catch(console.error);
