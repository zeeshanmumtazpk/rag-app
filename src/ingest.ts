// src/ingest.ts
import { pool } from "./db";
import { embed } from "./embedder";
import { chunkText } from "./chunker";

export async function ingestDocument(
  text: string,
  source: string
): Promise<void> {
  const chunks = chunkText(text, source);
  console.log(`Ingesting ${chunks.length} chunks from "${source}"...`);

  for (const chunk of chunks) {
    const vector = await embed(chunk.content);
    const vectorJson = JSON.stringify(vector);

    await pool.query(
      `INSERT INTO documents (content, metadata, embedding)
       VALUES ($1, $2, $3::vector)`,
      [
        chunk.content,
        JSON.stringify(chunk.metadata),
        vectorJson,
      ]
    );
  }

  console.log(`Done ✓ — ${chunks.length} chunks stored`);
}
//This runs once per document (or when docs change). This is your indexing pipeline.