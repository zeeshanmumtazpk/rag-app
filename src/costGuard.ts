import { RetrievedChunk } from "./retriever";

// src/costGuard.ts
const COST_PER_1K_TOKENS = {
  "gpt-4o":       0.005,
  "gpt-4o-mini":  0.00015,
  "llama3.2":     0,          // local Ollama — free
};

export function estimateContextCost(
  chunks: RetrievedChunk[],
  model: string
): number {
  const totalChars = chunks.reduce((sum, c) => sum + c.content.length, 0);
  const estimatedTokens = totalChars / 4;   // ~4 chars per token (rule of thumb)
  const costPer1k = COST_PER_1K_TOKENS[model as keyof typeof COST_PER_1K_TOKENS] ?? 0;
  return (estimatedTokens / 1000) * costPer1k;
}

export function trimContextToBudget(
  chunks: RetrievedChunk[],
  maxTokens: number = 2000     // default budget for context tokens
): RetrievedChunk[] {
  let tokenCount = 0;
  return chunks.filter(chunk => {
    const chunkTokens = chunk.content.length / 4;
    if (tokenCount + chunkTokens > maxTokens) return false;
    tokenCount += chunkTokens;
    return true;
  });
}