import config from "../config.js";
import type { RetrievedChunk } from "../types.js";
import { generateEmbedding } from "./embeddings.js";
import { VectorStore } from "./vector-store.js";

// Mantiene una única instancia del almacén vectorial para reutilizarla entre consultas.
let vectorStoreInstance: VectorStore | null = null;

// Crea el almacén de forma diferida, únicamente cuando se realiza la primera búsqueda.
function getStore(): VectorStore {
  if (!vectorStoreInstance) {
    vectorStoreInstance = new VectorStore(config.dbPath);
  }
  return vectorStoreInstance;
}
export async function retrieveContext(
  query: string,
  topK: number = config.ragTopK,
): Promise<RetrievedChunk[]> {
  // Obtiene el almacén y detiene el flujo si aún no hay documentación indexada.
  const store = getStore();
  if (store.size === 0) {
    console.log(
      "Vector store vacío - usa /ingest para cargar la documentación",
    );
    return [];
  }
  // Convierte la consulta en un embedding y busca los fragmentos más similares.
  const queryVector = await generateEmbedding(query);
  const topSearchResults = store.search(queryVector, topK);

  // Adapta los resultados del almacén al formato utilizado por la aplicación.
  const chunks: RetrievedChunk[] = topSearchResults.map((result) => ({
    ...result.chunk,
    score: result.score,
  }));
  // Registra un resumen de la consulta y la cantidad de fragmentos recuperados.
  const preview = query.length > 50 ? query.slice(0, 50) + "..." : query;
  console.log(`Buscando: "${preview}" -> ${chunks.length} chunks recuperados`);
  return chunks;
}
export function resetStore(): void {
  // Cierra el almacén y restablece la instancia para permitir una nueva conexión.
  if (vectorStoreInstance) {
    vectorStoreInstance.close();
    vectorStoreInstance = null;
  }
}