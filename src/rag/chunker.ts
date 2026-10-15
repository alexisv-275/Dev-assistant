import type { Chunk } from '../types.js';

//Maximo de chunks en caracteres
const MAX_CHUNK_SIZE = 2000;

export function chunkMarkdown(content: string, filePath: string): Chunk[] {
    const fileName = filePath.split(/[\\/]/).pop() ?? filePath;
    const chunks: Chunk[] = [];

    const sections = content.split(/(?=^##)/m);
    let globalPosition = 0;

    const addChunk = (content: string, heading: string): void => {
        const value = content.trim();
        if (!value) return;

        chunks.push({
            id: `${fileName}-${globalPosition}`,
            content: value,
            metadata: {
                source: fileName,
                heading,
                position: globalPosition,
                charCount: value.length,
            },
        });
        globalPosition += 1;
    };

    for (const section of sections) {
        const trimmedSection = section.trim();
        if (!trimmedSection) continue;

        const lines = section.split('\n');
        const firstLine = lines[0] ?? '';
        const isHeading = firstLine.startsWith('##');
        const heading = isHeading ? firstLine.trim() : 'Introducción';
        const paragraphs = trimmedSection.split(/\n\s*\n/).filter(Boolean);
        let current = '';

        for (const paragraph of paragraphs) {
            if (paragraph.length > MAX_CHUNK_SIZE) {
                addChunk(current, heading);
                current = '';
                for (let start = 0; start < paragraph.length; start += MAX_CHUNK_SIZE) {
                    addChunk(paragraph.slice(start, start + MAX_CHUNK_SIZE), heading);
                }
                continue;
            }

            const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
            if (candidate.length > MAX_CHUNK_SIZE) {
                addChunk(current, heading);
                current = paragraph;
            } else {
                current = candidate;
            }
        }
        addChunk(current, heading);
    }

    return chunks;
}
