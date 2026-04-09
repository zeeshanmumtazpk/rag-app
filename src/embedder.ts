// No API key needed — hits your local Ollama server
export async function embed(text: string): Promise<number[]> {
    const apiUrl = process.env.API_URL || "http://localhost:11434";
  const response = await fetch(`${apiUrl}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "nomic-embed-text",
      prompt: text,
    }),
  });

  const data = await response.json();
  return data.embedding; // number[]
}