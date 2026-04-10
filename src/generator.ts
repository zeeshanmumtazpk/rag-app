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
  const response = await ollama.chat.completions.create({
    model: `${MODEL}`,  // ← only change here
    messages: [
      {
        role: "system",
        content: `Answer using ONLY the context below.
If the context does not contain enough information to answer 
confidently, respond with exactly: 
"I don't have enough information to answer that based on the 
available documents."
Do NOT use any outside knowledge. Do NOT guess.

Context:
${contextText}`,
      },
      { role: "user", content: question },
    ],
  });

  return response.choices[0].message.content ?? "";
}