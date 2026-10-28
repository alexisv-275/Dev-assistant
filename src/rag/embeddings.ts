import { VoyageAIClient } from "voyageai";
import config from "../config.js";

const voyageClient = new VoyageAIClient({ apiKey: config.voyageaiApiKey });

async function embedTexts(texts: string[], inputType: "query" | "document"): Promise<number[][]> {
  if (texts.length === 0) return [];
  if (!config.voyageaiApiKey.trim()) {
    throw new Error("VOYAGEAI_API_KEY está vacía. Agrégala en tu archivo .env");
  }
  const embeddings: number[][] = [];
  // Sequential batches; the SDK retries transient errors and rate limits.
  for (let offset = 0; offset < texts.length; offset += 32) {
    const batch = texts.slice(offset, offset + 32);
    const response = await voyageClient.embed({
      model: config.voyageaiEmbeddingModel,
      input: batch,
      inputType,
      outputDimension: config.embeddingDimensions,
      outputDtype: "float",
      truncation: false,
    });
    const data = response.data;
    if (!data || data.length !== batch.length) {
      throw new Error("VoyageAI devolvió una cantidad inesperada de embeddings.");
    }
    const ordered = [...data].sort((a, b) => (a.index ?? -1) - (b.index ?? -1));
    for (const [index, item] of ordered.entries()) {
      const embedding = item.embedding;
      if (item.index !== index || !embedding ||
          embedding.length !== config.embeddingDimensions || !embedding.every(Number.isFinite)) {
        throw new Error("VoyageAI devolvió un embedding inválido.");
      }
      embeddings.push(embedding);
    }
  }
  return embeddings;
}

// Queries and documents share the same model and dimensions.
export async function generateEmbedding(text: string): Promise<number[]> {
  const [embedding] = await embedTexts([text], "query");
  return embedding!;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  return embedTexts(texts, "document");
}
