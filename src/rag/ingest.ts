import * as fs from "fs/promises";
import * as path from "path";
import config from "../config.js";
import { processDirectory } from "./chunker.js";
import { generateEmbeddings } from "./embeddings.js";
import { VectorStore } from "./vector-store.js";

const PREVIEW_JSON = path.join(
  path.dirname(config.dbPath),
  "chunks-preview.json",
);

/**
 * Ejecuta el flujo completo de ingestión: procesa documentos Markdown,
 * genera sus embeddings y los guarda en el vector store para búsquedas
 * semánticas posteriores.
 */
export async function runIngest(
  docsPath: string = config.docsPath,
): Promise<void> {
  console.log("Iniciando la ingestión de documentos..");
  console.log(`Directorio: ${docsPath}`);
  console.log("");

  // Convierte los documentos en fragmentos con contenido y metadatos.
  const chunks = await processDirectory(docsPath);
  if (chunks.length === 0) {
    console.log("No se encuentran archivos .md en el directorio");
  }
  console.log(`Total de chunks generados ${chunks.length}`);
  console.log(`Generando embeddings para ${chunks.length} chunks...`);
  // Los embeddings representan cada fragmento como un vector numérico.
  const texts = chunks.map((chunk) => chunk.content);
  const embeddings = await generateEmbeddings(texts);
  const dimensions = embeddings[0]?.length ?? 0;
  console.log(`Embeddings generados ${dimensions} dimensiones c/u`);
  // Crea un archivo de inspección con una muestra del contenido y del vector.
  const preview = chunks.map((chunk, i) => ({
    id: chunk.id,
    content:
      chunk.content.slice(0, 200) + (chunk.content.length > 200 ? "..." : ""),
    metadata: chunk.metadata,
    embeddingsPreview: (embeddings[i] ?? []).slice(0, 5),
    embeddingDims: embeddings[i] ?? 0,
  }));
  await fs.mkdir(path.dirname(PREVIEW_JSON), { recursive: true });
  await fs.writeFile(PREVIEW_JSON, JSON.stringify(preview, null, 2), "utf-8");
  // Reemplaza el índice anterior y persiste cada fragmento junto a su vector.
  console.log(`\nGuardando en vector store SQLite: ${config.dbPath}`);
  const store = new VectorStore(config.dbPath);
  store.clear();
  for (let index = 0; index < chunks.length; index++) {
    const chunk = chunks[index];
    const embedding = embeddings[index];
    if (chunk && embedding) {
      store.insert(chunk, embedding);
    }
  }
  console.log(`Vector store guardado ${store.size} chunks en ${config.dbPath}`);
  console.log(`\nTotal: ${chunks.length} chunks procesados`);
  console.log(`\nPreview en: ${PREVIEW_JSON}`);
  console.log(`\nIngestión completa, listo para la búsqueda semántica`);
}
runIngest().catch((error: Error) => {
  console.error(`Error durante la ingestión ${error.message}`);
});
