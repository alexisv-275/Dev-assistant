import * as fs from "fs/promises";
import * as path from "path";
import { ToolDefinition } from "../types.js";

// === Definiciones de las 2 tools nuevas ===

const SEARCH_DOCS_TOOL: ToolDefinition = {
  name: "search_docs",
  description:
    "Busca información en la documentación ingestada usando búsqueda semántica. " +
    "Úsala cuando el usuario pregunta sobre cómo usar una API, conceptos del sistema, " +
    "o cualquier información que podría estar en los docs técnicos del proyecto. " +
    "Requiere que los documentos estén cargados con el comando /ingest. " +
    "Retorna los fragmentos más relevantes con su fuente y sección.",
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "La pregunta o tema a buscar en la documentación.",
      },
      top_k: {
        type: "number",
        description:
          "Número de fragmentos a recuperar (default: 5, máximo: 10).",
      },
    },
    required: ["query"],
  },
};
const CREATE_ISSUE_TOOL: ToolDefinition = {
  name: "create_issue",
  description:
    "Crea un issue o tarea en el directorio ./issues/ del proyecto. " +
    "Úsala cuando el usuario quiera reportar un bug, registrar una mejora, " +
    "o crear una tarea de seguimiento. " +
    "Los issues se guardan como archivos Markdown con numeración automática.",
  input_schema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Título conciso del issue.",
      },
      description: {
        type: "string",
        description: "Descripción detallada del problema o tarea.",
      },
      labels: {
        type: "array",
        items: { type: "string" },
        description:
          "Etiquetas opcionales (ej: ['bug', 'enhancement', 'documentation']).",
      },
      priority: {
        type: "string",
        enum: ["low", "medium", "high"],
        description: "Prioridad del issue (default: medium).",
      },
    },
    required: ["title", "description"],
  },
};