import * as fs from "fs/promises";
import * as path from "path";

const PROJECT_ROOT = process.cwd();

const MAX_FILE_SIZE = 50_000;

const MAX_SEARCH_RESULTS = 20;

const CONTEXT_LINES = 2;

/**
 * Convierte una ruta relativa en una ruta absoluta y evita que apunte fuera
 * de la raíz del proyecto. No accede al sistema de archivos ni lee contenido.
 */
function resolveSecurePath(tagetPath: string): string | null {
  const absolutePath = path.resolve(PROJECT_ROOT, tagetPath);
  const projectwithSep = PROJECT_ROOT + path.sep;
  if (
    !absolutePath.startsWith(projectwithSep) &&
    absolutePath !== PROJECT_ROOT
  ) {
    return null;
  }
  return absolutePath;
}

/**
 * Recorre recursivamente un directorio y devuelve las rutas de sus archivos.
 * A diferencia de `resolveSecurePath`, sí inspecciona el sistema de archivos;
 * además, omite directorios ocultos y `node_modules`, y puede filtrar por
 * extensión.
 */
async function collectFiles(
  dirPath: string,
  extension?: string,
): Promise<string[]> {
  const results: string[] = [];
  let entries;
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) {
      continue;
    }
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await collectFiles(fullPath, extension);
      results.push(...subFiles);
    } else if (entry.isFile()) {
      if (!extension || entry.name.endsWith(extension)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

/**
 * Valida un directorio, recopila sus archivos y devuelve sus rutas relativas.
 * A diferencia de `executeReadFile`, no devuelve el contenido de un archivo;
 * su propósito es listar archivos, opcionalmente filtrados por extensión.
 */
async function executeListFiles(params: {
  path: string;
  extension?: string;
}): Promise<string> {
  const securePath = resolveSecurePath(params.path);
  if (!securePath) {
    return `Error de seguridad: la ruta "${params.path}" intenta acceder fuera del proyecto.`;
  }
  try {
    const stat = await fs.stat(securePath);
    if (!stat.isDirectory()) {
      return `Error: ${params.path} no es un directorio.`;
    }
  } catch {
    return `Error: el directorio ${params.path} no existe.`;
  }

  const files = await collectFiles(securePath, params.extension);
  if (files.length === 0) {
    const filterFile = params.extension
      ? ` con extensión ${params.extension}`
      : "";
    return `No se encontraron archivos${filterFile} en "${params.path}"`;
  }
  const relativePaths = files.map((file) => path.relative(PROJECT_ROOT, file));
  return relativePaths.join("\\n");
}

// Herramienta usada por la IA para consultar el contenido de un archivo.
async function executeReadFile(params: { file_path: string }): Promise<string> {
  // La ruta se valida antes de acceder al sistema de archivos para impedir
  // que el modelo lea información situada fuera de la raíz del proyecto.
  const securePath = resolveSecurePath(params.file_path);
  if (!securePath) {
    // Restricción de seguridad contra rutas absolutas o traversal (..).
    return `Error de seguridad: la ruta "${params.file_path}" intenta acceder fuera del proyecto.`;
  }
  try {
    const stat = await fs.stat(securePath);
    if (stat.isDirectory()) {
      // Solo se permite leer archivos; los directorios deben consultarse con
      // la herramienta de listado correspondiente.
      return `Error: ${params.file_path} es un directorio, no un archivo.`;
    }

    if (stat.size > MAX_FILE_SIZE) {
      // Límite de tamaño para evitar consumir demasiado contexto o memoria al
      // enviar el resultado a la IA. En este caso no se lee el archivo.
      return (
        ` Archivo demasiado grande (${stat.size} bytes) ` +
        `Considera leer una sección en especifico.`
      );
    }
    const content = await fs.readFile(securePath, "utf-8");
    if (content.length > MAX_FILE_SIZE) {
      // Protección adicional basada en caracteres, ya que el tamaño en bytes
      // y la longitud del texto pueden diferir según la codificación UTF-8.
      return content.slice(0, MAX_FILE_SIZE) + "\\n\\n... [archivo truncado]";
    }
    return content;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      // No se expone información del sistema: se devuelve un error controlado
      // para que la IA pueda informar que el archivo no existe.
      return `Error: el archivo ${params.file_path} no existe.`;
    }
    // Cualquier otro fallo de lectura también se convierte en una respuesta
    // controlada, evitando propagar excepciones al flujo de la IA.
    return `Error al leer el archivo ${params.file_path}.`;
  }
}

// Busca una cadena literal en los archivos de la ruta indicada y devuelve
// cada coincidencia acompañada de líneas de contexto.
async function executeSearchCode(params: {
  pattern: string;
  path?: string;
  file_extension?: string;
}): Promise<string> {
  const searchPath = params.path ?? ".";

  // Valida que la ruta permanezca dentro de la raíz del proyecto antes de
  // consultar el sistema de archivos, evitando ataques de traversal.
  const securePath = resolveSecurePath(searchPath);
  if (!securePath) {
    return `Error de seguridad: la ruta "${searchPath}" intenta acceder fuera del proyecto.`;
  }

  // La recopilación recursiva omite directorios ocultos y node_modules, y
  // filtra los archivos por extensión cuando se proporciona ese parámetro.
  const files = await collectFiles(securePath, params.file_extension);

  const results: string[] = [];
  let totalMatches = 0;

  for (const file of files) {
    // Limita la cantidad de coincidencias para controlar el tamaño de la
    // respuesta y el consumo de contexto.
    if (totalMatches >= MAX_SEARCH_RESULTS) break;

    let content: string;

    try {
      content = await fs.readFile(file, "utf-8");
    } catch {
      // Los archivos que no puedan leerse se omiten sin detener la búsqueda.
      continue;
    }

    const lines = content.split("\n");
    const relativePath = path.relative(PROJECT_ROOT, file);

    for (let i = 0; i < lines.length; i++) {
      if (totalMatches >= MAX_SEARCH_RESULTS) break;

      const line = lines[i] ?? "";
      // La búsqueda es literal y distingue entre mayúsculas y minúsculas.
      if (!line.includes(params.pattern)) continue;

      totalMatches++;

      // Añade hasta CONTEXT_LINES líneas antes y después, respetando los
      // límites del archivo.
      const contextBlock: string[] = [];
      const startLine = Math.max(0, i - CONTEXT_LINES);
      const endLine = Math.min(lines.length - 1, i + CONTEXT_LINES);
      for (let j = startLine; j <= endLine; j++) {
        const contextLine = lines[j] ?? "";
        const lineNumber = j + 1;
        const prefix = j === i ? ">" : " ";
        contextBlock.push(
          `${prefix} ${relativePath}: ${lineNumber}: ${contextLine}`,
        );
      }
      results.push(contextBlock.join("\n"));
    }
  }
  if (results.length === 0) {
    // También cubre los casos en que la ruta no contiene archivos elegibles
    // o ninguno contiene el patrón solicitado.
    return `Sin coincidencias para:${params.pattern}`;
  }

  // Indica si la respuesta alcanzó el límite máximo de coincidencias.
  const header =
    totalMatches >= MAX_SEARCH_RESULTS
      ? `Coincidencias: ${MAX_SEARCH_RESULTS}`
      : `Coincidencias: ${totalMatches}`;

  return header + results.join("\n\n");
}
export async function executeTool(
  name: string,
  params: Record<string, unknown>,
): Promise<string> {
  switch (name) {
    case "list_files": {
      const p = params as { path?: unknown; extension?: unknown };
      if (typeof p.path !== "string") {
        return "Error: el parámetro 'path' es requerido y debe ser string.";
      }
      return executeListFiles({
        path: p.path,
        extension: typeof p.extension === "string" ? p.extension : undefined,
      });
    }

    case "read_file": {
      const p = params as { file_path?: unknown };
      if (typeof p.file_path !== "string") {
        return "Error: el parámetro 'file_path' es requerido y debe ser string.";
      }
      return executeReadFile({ file_path: p.file_path });
    }

    case "search_code": {
      const p = params as {
        pattern: unknown;
        path?: unknown;
        file_extension?: unknown;
      };
      if (typeof p.pattern !== "string") {
        return "Error: el parámetro 'pattern' es requerido y debe ser string.";
      }
      return executeSearchCode({
        pattern: p.pattern,
        path: typeof p.path === "string" ? p.path : undefined,
        file_extension:
          typeof p.file_extension === "string" ? p.file_extension : undefined,
      });
    }
    default:
      return `Error: tool desconocida "${name}. Tools disponibles: list_files,read_file, search_code."`;
  }
}