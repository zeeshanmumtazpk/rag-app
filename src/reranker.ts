//Even after hybrid search, the top 4 chunks might not be the most relevant 4. The retrieval step is optimised for speed — it makes a rough cut. Re-ranking is a second, more expensive pass that reorders chunks by true relevance.
//Think of it like this:
//Retrieval  →  fast bouncer letting in top 20 candidates
//Re-ranking →  careful judge picking the best 4 from those 20
import { RetrievedChunk } from "./retriever";

// src/reranker.ts
export function rerankByKeywords(
  question: string,
  chunks: RetrievedChunk[]
): RetrievedChunk[] {
  const keywords = question.toLowerCase().split(/\s+/);

  return chunks
    .map(chunk => {
      const text = chunk.content.toLowerCase();

      // Score: how many question keywords appear in this chunk?
      const keywordHits = keywords.filter(k => text.includes(k)).length;
      const keywordScore = keywordHits / keywords.length;

      // Boost chunks that contain exact question phrase
      const phraseBoost = text.includes(question.toLowerCase()) ? 0.2 : 0;

      return {
        ...chunk,
        similarity: chunk.similarity * 0.6 + keywordScore * 0.3 + phraseBoost
      };
    })
    .sort((a, b) => b.similarity - a.similarity);
}

// for prod
//In production you'd use a dedicated re-ranking model like Cohere Rerank or BGE-reranker (free, runs via Ollama). They're trained specifically to judge relevance between a query and a passage — far more accurate than keyword counting.
// Production reranker with Cohere (free tier available)
// import { CohereClient } from "cohere-ai";
// const cohere = new CohereClient({ token: process.env.COHERE_API_KEY });

// export async function rerankWithCohere(
//   question: string,
//   chunks: RetrievedChunk[]
// ): Promise<RetrievedChunk[]> {
//   const response = await cohere.rerank({
//     model: "rerank-english-v3.0",
//     query: question,
//     documents: chunks.map(c => c.content),
//     topN: 4,
//   });

//   return response.results.map(r => ({
//     ...chunks[r.index],
//     similarity: r.relevanceScore
//   }));
// }