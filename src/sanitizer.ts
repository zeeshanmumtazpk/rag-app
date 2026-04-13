// src/sanitizer.ts
export function sanitizeChunk(content: string): string {
  // Strip known injection patterns
  const injectionPatterns = [
    /ignore\s+(all\s+)?(previous|prior)\s+instructions?/gi,
    /you\s+are\s+now\s+\w+/gi,
    /system\s*:\s*/gi,
    /assistant\s*:\s*/gi,
    /<\s*system\s*>/gi,
  ];

  let sanitized = content;
  for (const pattern of injectionPatterns) {
    sanitized = sanitized.replace(pattern, "[REDACTED]");
  }
  return sanitized;
}

// // Wrap chunks before sending to LLM
// const safeContext = chunks.map(c => ({
//   ...c,
//   content: sanitizeChunk(c.content)
// }));