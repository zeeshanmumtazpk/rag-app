import { trimContextToBudget } from "./costGuard";
import { generate } from "./generator";
import { rerankByKeywords } from "./reranker";
import { retrieve } from "./retriever";

// src/telemetry.ts
export interface RAGTrace {
  requestId:        string;    // trace every request end-to-end
  question:         string;
  chunksRetrieved:  number;    // 0 = retrieval failed
  topSimilarity:    number;    // < 0.75 = low confidence
  contextTokens:    number;    // tracks cost over time
  latencyMs:        number;    // total pipeline time
  hadFallback:      boolean;   // true = LLM said "I don't know"
}

export async function tracedRAG(
  question: string,
  tenantId: string
): Promise<{ answer: string; trace: RAGTrace }> {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  const chunks  = await retrieve(question, tenantId);
  const reranked = rerankByKeywords(question, chunks);
  const trimmed  = trimContextToBudget(reranked, 2000);
  const answer   = await generate(question, trimmed);

  const trace: RAGTrace = {
    requestId,
    question,
    chunksRetrieved:  trimmed.length,
    topSimilarity:    trimmed[0]?.similarity ?? 0,
    contextTokens:    trimmed.reduce((s, c) => s + c.content.length / 4, 0),
    latencyMs:        Date.now() - startTime,
    hadFallback:      answer.includes("I don't have enough information"),
  };

  // Structured log — plug into Datadog, CloudWatch, or just stdout
  console.log(JSON.stringify({ event: "rag_request", ...trace }));

  return { answer, trace };
}