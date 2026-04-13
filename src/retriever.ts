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
  tenantId: string,
  topK: number = 4,
  similarityThreshold: number = 0.75  // ← add this
): Promise<RetrievedChunk[]> {
  const queryVector = await embed(question);
  const queryJson = JSON.stringify(queryVector);

  // With small datasets, IVF can miss neighbors unless probes is high.
  await pool.query(`SET ivfflat.probes = 100`);

  const result = await pool.query(
    `SELECT
       content,
       metadata,
       -- Semantic score (vector similarity)
       (1 - (embedding <=> $1))        AS semantic_score,
       -- Keyword score (full text search)
       ts_rank(
         to_tsvector('english', content),
         plainto_tsquery('english', $2)
       )                               AS keyword_score,
       -- Combined: 70% semantic + 30% keyword
       (1 - (embedding <=> $1)) * 0.7
       + ts_rank(
           to_tsvector('english', content),
           plainto_tsquery('english', $2)
         ) * 0.3                       AS combined_score
     FROM documents
     WHERE (1 - (embedding <=> $1)) > $3
        OR to_tsvector('english', content) @@ plainto_tsquery('english', $2)
        AND tenant_id = $5
     ORDER BY combined_score DESC
     LIMIT $4`,
    [queryJson, question, similarityThreshold, topK, tenantId]
  );
  return result.rows.map(r => ({
    content: r.content,
    metadata: r.metadata,
    similarity: parseFloat(r.combined_score)
  }));
}
//The <=> operator is pgvector's cosine distance. 1 - distance = similarity. Higher similarity = closer meaning. This single query is the entire retrieval step.
//The 70/30 split is a good default. For technical docs with lots of specific terms, shift to 50/50. For conversational queries, shift to 90/10.