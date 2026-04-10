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
  const answer = await rag(question);;
  console.log(`\nAnswer: ${answer}`);

  await pool.end();
}
async function rag(question: string): Promise<string> {
  const chunks = await retrieve(question, 4, 0.75);

  // Log retrieval quality on every request
  const topScore = chunks[0]?.similarity ?? 0;
  console.log(JSON.stringify({
    question,
    chunksRetrieved: chunks.length,
    topSimilarity: topScore.toFixed(3),
    retrievalStatus: chunks.length === 0 
      ? "FAILED" 
      : topScore < 0.80 
        ? "LOW_CONFIDENCE" 
        : "OK"
  }));

  // Short-circuit — don't call LLM if retrieval failed
  if (chunks.length === 0) {
    return "I don't have enough information to answer that.";
  }

  return await generate(question, chunks);
}
main().catch(console.error);