// src/retriever.ts
import { pool } from "./db";
import { embed } from "./embedder";

export interface RetrievedChunk {
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

export async function retrieve(
  question: string,
  topK: number = 4,
  similarityThreshold: number = 0.75  // ← add this
): Promise<RetrievedChunk[]> {
  const queryVector = await embed(question);
  const queryJson = JSON.stringify(queryVector);

  // With small datasets, IVF can miss neighbors unless probes is high.
  await pool.query(`SET ivfflat.probes = 100`);

  const result = await pool.query(
    `SELECT content, metadata,
       1 - (embedding <=> $1::vector) AS similarity
     FROM documents
     WHERE 1 - (embedding <=> $1::vector) >= $3  -- filter by similarity threshold
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    [queryJson, topK, similarityThreshold]
  );
  return result.rows
}
//The <=> operator is pgvector's cosine distance. 1 - distance = similarity. Higher similarity = closer meaning. This single query is the entire retrieval step.