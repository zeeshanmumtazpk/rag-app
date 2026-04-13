// src/cache.ts
//Cache Embeddings of Common Questions
import { pool } from "./db";
import { embed } from "./embedder";

export async function getCachedEmbedding(
  text: string
): Promise<number[] | null> {
  const result = await pool.query(
    `SELECT embedding FROM embedding_cache
     WHERE query_hash = md5($1)
     AND created_at > NOW() - INTERVAL '24 hours'`,
    [text]
  );
  return result.rows[0]?.embedding ?? null;
}

export async function cacheEmbedding(
  text: string,
  embedding: number[]
): Promise<void> {
  await pool.query(
    `INSERT INTO embedding_cache (query_hash, query_text, embedding)
     VALUES (md5($1), $1, $2)
     ON CONFLICT (query_hash) DO UPDATE SET
       embedding = $2,
       created_at = NOW()`,
    [text, JSON.stringify(embedding)]
  );
}

// Wrap your embedder
export async function embedWithCache(text: string): Promise<number[]> {
  const cached = await getCachedEmbedding(text);
  if (cached) return cached;           // ~1ms instead of ~100ms

  const fresh = await embed(text);
  await cacheEmbedding(text, fresh);   // store for next time
  return fresh;
}