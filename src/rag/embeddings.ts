import openai from "openai";
import config from "../config.js";

const openaiClient = new openai.OpenAI({
  apiKey: config.openaiApiKey,
});

// Generates an embedding for the given text using OpenAI's embeddings API. One embedding at a time. 
export async function generateEmbedding(text: string): Promise<number[]> {
    const response = await openaiClient.embeddings.create({
        model: config.openaiEmbeddingModel,
        input: text,
    });
    const embedding = response.data[0]?.embedding ?? [];
    return embedding;
}

// Generates embeddings for multiple texts using OpenAI's embeddings API. Multiple embeddings at a time.
export async function generateEmbeddings(texts: string): Promise<number[][]> {
    const response = await openaiClient.embeddings.create({
        model: config.openaiEmbeddingModel,
        input: texts,
    });
    return response.data.map((item) => item.embedding);
}