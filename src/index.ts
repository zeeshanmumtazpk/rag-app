// src/index.ts
import "dotenv/config";

import { pool, setupDB } from "./db";
import { ingestDocument } from "./ingest";
import { retrieve } from "./retriever";
import { generate } from "./generator";
import { rerankByKeywords } from "./reranker";
import { estimateContextCost, trimContextToBudget } from "./costGuard";
import { sanitizeChunk } from "./sanitizer";

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
  const chunks = await retrieve(question,"1", 4, 0.75);
const safeContext = chunks.map(c => ({
  ...c,
  content: sanitizeChunk(c.content)
}));
  // Log retrieval quality on every request
  const topScore = safeContext[0]?.similarity ?? 0;
  console.log(JSON.stringify({
    question,
    chunksRetrieved: safeContext.length,
    topSimilarity: topScore.toFixed(3),
    retrievalStatus: safeContext.length === 0 
      ? "FAILED" 
      : topScore < 0.80 
        ? "LOW_CONFIDENCE" 
        : "OK"
  }));

  // Short-circuit — don't call LLM if retrieval failed
  if (safeContext.length === 0) {
    return "I don't have enough information to answer that.";
  }

  return await generate(question, safeContext);
}
//For medical, legal, or financial systems there's a 5th technique not in most tutorials — confidence gating:
//In a general chatbot, a low-confidence answer is annoying. In a hospital, it's dangerous. The system should know when to say "I'm not sure enough — go check the source."
// async function ragWithConfidenceGate(question: string): Promise<string> {
//   const chunks = await hybridRetrieve(question);
//   const reranked = await rerankWithCohere(question, chunks);

//   const topScore = reranked[0]?.similarity ?? 0;

//   // For high-stakes domains — never guess under threshold
//   if (topScore < 0.82) {
//     return `I cannot answer this with sufficient confidence. 
// Please consult the primary source documentation directly.
// (Retrieval confidence: ${(topScore * 100).toFixed(0)}%)`;
//   }

//   return await generate(question, reranked);
// }

// src/index.ts — cost-aware pipeline
async function rag1(question: string): Promise<string> {
  const chunks   = await retrieve(question,"1", 10);  // retrieve 10
  const safeContext = chunks.map(c => ({
  ...c,
  content: sanitizeChunk(c.content)
}));
  const reranked = rerankByKeywords(question, safeContext);
  const trimmed  = trimContextToBudget(reranked, 2000); // send top 4 that fit budget

  const cost = estimateContextCost(trimmed, "gpt-4o-mini");
  console.log(`Estimated cost: $${cost.toFixed(6)}`);

  return generate(question, trimmed);
}
main().catch(console.error);