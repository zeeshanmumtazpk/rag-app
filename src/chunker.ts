// src/chunker.ts
export interface Chunk {
  content: string;
  metadata: {
    source: string;
    chunkIndex: number;
  };
}

export function chunkText(text: string, source: string): Chunk[] {
  // Split on double newlines (paragraphs) — good default for most docs
  const paragraphs = text
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 40); // drop tiny fragments

  return paragraphs.map((content, i) => ({
    content,
    metadata: { source, chunkIndex: i },
  }));
}
//This is paragraph-level chunking — exactly what you identified as the right strategy in Phase 2.