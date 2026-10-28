import { config as loadDotenv } from "dotenv";
import { AppConfig } from "./types.js";

loadDotenv();

function getRequiredEnvVar(name: string, defaultValue?: string): string
{
    const value = process.env[name] ?? defaultValue;
    if(value === undefined)
    {
        throw new Error(`Variable de entorno requerida no encontrada: ${name}`);
    }
    return value;
}

function validateProvider(provider: string): "anthropic" | "openai"
{
    if(provider === "anthropic" || provider === "openai")
    {
        return provider;
    }
    throw new Error(`MODEL_PROVIDER inválido: ${provider}. Debe ser "anthropic" o "openai"`);
    
}

const rawProvider = process.env["MODEL_PROVIDER"] ?? "anthropic";

//Define los tipos de la configuración de la aplicación y valida las variables de entorno necesarias.
export const config: AppConfig = {
  provider: validateProvider(rawProvider),
  anthropicApiKey: getRequiredEnvVar("ANTHROPIC_API_KEY", ""),
  openaiApiKey: getRequiredEnvVar("OPENAI_API_KEY", ""),
  anthropicModel: getRequiredEnvVar("ANTHROPIC_MODEL", "claude-sonnet-4-6"),
  openaiModel: getRequiredEnvVar("OPENAI_MODEL", "gpt-4o-mini"),
  voyageaiApiKey: getRequiredEnvVar("VOYAGEAI_API_KEY", ""),
  voyageaiEmbeddingModel: getRequiredEnvVar("VOYAGEAI_EMBEDDING_MODEL", "voyage-4"),
  embeddingDimensions: 1024,
  docsPath: getRequiredEnvVar("DOCS_PATH", "./docs/sample-project"),
  academicBasePath: getRequiredEnvVar("ACADEMIC_BASE_PATH", "./docs/academic"),
  dbPath: getRequiredEnvVar("DB_PATH", "./data/vectors.db"),
  ragTopK: parseInt(getRequiredEnvVar("RAG_TOP_K", "5"), 10),
};

export function validateConfig(): void
{
    if(config.provider ==="anthropic" && !config.anthropicApiKey)
    {
        throw new Error("ANTHROPIC_MODEL está vacía. Agregála en tu archivo .env");
        
    }
     if(config.provider ==="openai" && !config.openaiApiKey)
    {
        throw new Error("OPENAI_API_KEY está vacía. Agregála en tu archivo .env");
        
    }
}
export default config;
