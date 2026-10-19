import * as fs from "fs/promises";
import * as path from "path";
import type { Chunk } from "../types.js";

const MAX_CHUNK_SIZE = 2000;

export function chunkMardown(content: string, filePath: string): Chunk[] {
  // Divide el Markdown en secciones y genera chunks con metadatos y solapamiento
  // entre párrafos para conservar el contexto al realizar búsquedas.
  const fileName = path.basename(filePath);
  const chunks: Chunk[] = [];

  // Divide el documento en secciones conservando el encabezado `##` como
  // inicio de cada bloque para mantener la estructura del Markdown.
  const sections = content.split(/(?=^## )/m);

  let globalPosition = 0;
  let lastParagraph = "";

  for (const section of sections) {
    if (!section.trim()) continue;

    const lines = section.split("\n");
    const firstLine = lines[0] ?? "";
    const isHeading = firstLine.startsWith("## ");
    const heading = isHeading ? firstLine.trim() : "(Introducción)";

    if (section.length <= MAX_CHUNK_SIZE) {
      const chunkContent = lastParagraph
        ? `${lastParagraph}\n\n${section.trim()}`
        : section.trim();
      chunks.push({
        id: `${fileName}-${globalPosition}`,
        content: chunkContent,
        metadata: {
          source: fileName,
          heading,
          position: globalPosition,
          charCount: chunkContent.length,
        },
      });
      const paragraphs = section.trim().split(/\n\n+/);
      lastParagraph = paragraphs[paragraphs.length - 1] ?? "";
      globalPosition++;
      continue;
    }
    // Divide las secciones extensas en párrafos y los agrupa hasta alcanzar
    // el tamaño máximo; el último párrafo se reutiliza como solapamiento.
    const paragraphs = section
      .split(/\n\n+/)
      .filter((p) => p.trim().length > 0);
    // Reutiliza el último párrafo del chunk anterior como solapamiento para
    // conservar contexto al comenzar el siguiente chunk.
    let currentChunk = lastParagraph ? `${lastParagraph}\n\n` : "";
    for (let index = 0; index < paragraphs.length; index++) {
      const paragraph = paragraphs[index] ?? "";
      // Si añadir este párrafo supera MAX_CHUNK_SIZE, se cierra el chunk
      // actual y se inicia otro; aquí sucede la división por tamaño.
      if (
        currentChunk.length > 0 &&
        currentChunk.length + paragraph.length > MAX_CHUNK_SIZE
      ) {
        const chunkContent = isHeading
          ? `${heading}\n\n${currentChunk.trim()}`
          : currentChunk.trim();
        chunks.push({
          id: `${fileName}-${globalPosition}`,
          content: chunkContent,
          metadata: {
            source: fileName,
            heading,
            position: globalPosition,
            charCount: chunkContent.length,
          },
        });

        // Se guarda el último párrafo del chunk cerrado para reutilizarlo
        // como solapamiento en el siguiente chunk.
        const chunkParagraphs = currentChunk.trim().split(/\n\n+/);
        lastParagraph = chunkParagraphs[chunkParagraphs.length - 1] ?? "";
        currentChunk = `${lastParagraph}\n\n`;
        globalPosition++;
      }
      currentChunk += paragraph + "\n\n";
    }
    if (currentChunk.trim().length > 0) {
      const chunkContent = isHeading
        ? `${heading}\n\n${currentChunk.trim()}`
        : currentChunk.trim();
      chunks.push({
        id: `${fileName}-${globalPosition}`,
        content: chunkContent,
        metadata: {
          source: fileName,
          heading,
          position: globalPosition,
          charCount: chunkContent.length,
        },
      });

      const finalParagraphs = currentChunk.trim().split(/\n\n+/);
      lastParagraph = finalParagraphs[finalParagraphs.length - 1] ?? "";
      globalPosition++;
    }
  }
  return chunks;
}

export async function processDirectory(dirPath: string): Promise<Chunk[]> {
  // Lee todos los archivos Markdown del directorio, los procesa y combina
  // sus chunks; los archivos que no se puedan leer se omiten con un aviso.
  const allChunks: Chunk[] = [];
  let entries;
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    throw new Error(`No se pudo leer el directorio: ${dirPath}`);
  }
  const makdownFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const file of makdownFiles) {
    const fullPath = path.join(dirPath, file.name);

    let content: string;
    try {
      content = await fs.readFile(fullPath, "utf-8");
    } catch {
      console.warn(`No se pudo leer: ${file.name}`);
      continue;
    }

    // Cada archivo se divide en secciones y párrafos mediante el procesador
    // de chunks; después, sus resultados se agregan al conjunto global.
    const chunks = chunkMardown(content, file.name);
    allChunks.push(...chunks);
    console.log(`Procesando ${file.name}... ${chunks.length} chunks generados`);
  }
  return allChunks;
}
