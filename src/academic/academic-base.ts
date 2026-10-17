import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export interface AcademicSource {
    source: string;
    content: string;
}


//2.Cargar contexto academico
export async function loadAcademicBase(directory: string): Promise<AcademicSource[]> {
    let entries;
    try {
        entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(`No se pudo leer la base académica en "${directory}": ${reason}`);
    }

    const markdownFiles = entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
        .sort((left, right) => left.name.localeCompare(right.name));

    if (markdownFiles.length === 0) {
        throw new Error(`La base académica en "${directory}" no contiene archivos Markdown.`);
    }

    const sources = await Promise.all(markdownFiles.map(async (entry) => {
        const source = entry.name;
        const filePath = path.join(directory, source);
        const content = (await readFile(filePath, "utf8")).trim();

        if (!content) {
            throw new Error(`La fuente académica "${source}" está vacía.`);
        }

        return { source, content };
    }));

    return sources;
}

//Convertir contenido para enviarlo a Claude
export function formatAcademicContext(sources: AcademicSource[]): string {
    return sources
        .map(({ source, content }) => `### Fuente: ${source}\n${content}`)
        .join("\n\n");
}
