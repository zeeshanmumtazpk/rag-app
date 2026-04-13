// src/ingest.ts
import { pool } from "./db";
import { embed } from "./embedder";
import { chunkText } from "./chunker";

export async function ingestDocument(
  text: string,
  source: string
): Promise<void> {
  const chunks = chunkText(text, source);
  for (const chunk of chunks) {
    const vector = await embed(chunk.content);
    const vectorJson = JSON.stringify(vector);

    await pool.query(
      `INSERT INTO documents (content, metadata, embedding,tenant_id)
       VALUES ($1, $2, $3::vector, $4)`,
      [
        chunk.content,
        JSON.stringify(chunk.metadata),
        vectorJson,
        chunk.tenant_id ||1,
      ]
    );
  }

  console.log(`Done ✓ — ${chunks.length} chunks stored`);
}
//This runs once per document (or when docs change). This is your indexing pipeline.