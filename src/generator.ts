// Ollama is OpenAI-compatible — just change baseURL, remove apiKey
import OpenAI from "openai";
import { RetrievedChunk } from "./retriever";
const API_URL = process.env.API_URL;
const API_KEY = process.env.API_KEY;
const MODEL = process.env.MODEL ;
const ollama = new OpenAI({
  baseURL: `${API_URL}/v1`,
  apiKey: `${API_KEY}`,  // required by SDK but ignored by Ollama
});

export async function generate(
  question: string,
  context: RetrievedChunk[]
): Promise<string> {
  const contextText = context
    .map((c, i) => `[Source ${i + 1}]\n${c.content}`)
    .join("\n\n---\n\n");
console.log("Context for generation:\n", contextText);
console.log('chat',{
    model: `${MODEL}`,  // ← only change here
    messages: [
      {
        role: "system",
        content: `Answer using ONLY the context below. If the answer isn't 
in the context, say "I don't have enough information to answer that."

Context:
${contextText}`,
      },
      { role: "user", content: question },
    ],
  })
  const response = await ollama.chat.completions.create({
    model: `${MODEL}`,  // ← only change here
    messages: [
      {
        role: "system",
        content: `Answer using ONLY the context below. If the answer isn't 
in the context, say "I don't have enough information to answer that."

Context:
${contextText}`,
      },
      { role: "user", content: question },
    ],
  });

  console.log("Generated response:\n", JSON.stringify(response));
  return response.choices[0].message.content ?? "";
}