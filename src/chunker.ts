// src/chunker.ts
export interface Chunk {
  content: string;
  metadata: {
    source: string;
    chunkIndex: number;
  };
  tenant_id: string; // ← add tenant_id to metadata
}

export function chunkText(
  text: string,
  source: string,
  chunkSize: number = 500,   // characters per chunk
  overlap: number = 100,
  tenant_id: string = "1"      // overlap between chunks
): Chunk[] {
  const chunks: Chunk[] = [];
  let start = 0;
  let index = 0;

  while (start < text.length) {
    const end = start + chunkSize;
    const content = text.slice(start, end).trim();

    if (content.length > 40) {
      chunks.push({ content, metadata: { source, chunkIndex: index++ }, tenant_id });
    }

    start += chunkSize - overlap; // slide forward, keeping overlap
  }

  return chunks;
}
//This is paragraph-level chunking — exactly what you identified as the right strategy in Phase 2.