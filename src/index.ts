// src/index.ts
import "dotenv/config";

import { pool, setupDB } from "./db";
import { ingestDocument } from "./ingest";
import { retrieve } from "./retriever";
import { generate } from "./generator";

async function main() {
  await setupDB();
  // --- INDEXING (run once) ---
  const sampleDoc = `
    Subscription Cancellation Policy

    Users may cancel their subscription at any time from the Account Settings page.
    Cancellations take effect at the end of the current billing period.
    No refunds are issued for partial months.

    Refund Policy

    Refunds are only available within 7 days of the initial purchase.
    To request a refund, contact support@example.com with your order ID.
    Refunds are processed within 5–10 business days.

    Penalty Clauses

    Late payments incur a penalty of 1.5% per month on outstanding balances.
    Any balance unpaid after 90 days will incur an additional flat fee of $500.
  `;

  await ingestDocument(sampleDoc, "company-policy.txt");

  // --- QUERYING (runs on every user request) ---
  const question = "How do I cancel my subscription?";

  console.log(`\nQuestion: ${question}`);

  const chunks = await retrieve(question, 4);
  console.log(`\nRetrieved ${chunks.length} chunks:`);
  chunks.forEach((c, i) =>
    console.log(`  [${i + 1}] similarity: ${c.similarity.toFixed(3)} — "${c.content.slice(0, 60)}..."`)
  );

  const answer = await generate(question, chunks);
  console.log(`\nAnswer: ${answer}`);

  await pool.end();
}

main().catch(console.error);