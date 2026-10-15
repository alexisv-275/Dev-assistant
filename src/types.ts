export type Role = "user" |  "assistant";
export interface Message {
    role: Role;
    content: string;
}
// Define la información y el esquema de entrada de una herramienta disponible.
export interface ToolDefinition
{
    name:string;
    description:string;
    input_schema:{
        type:"object",
        properties:Record<string,unknown>,
        required:string[]
    }
}

// Representa el resultado de la ejecución de una herramienta.
export interface ToolResult{
    toolName:string;
    toolUseId:string;
    result:string;
    isError:boolean;
}

export interface Chunk
{
    id: string;
    content:string;
    metadata:
    {
        source:string;
        heading:string;
        position:number;
        charCount: number;
    }
}
export interface RetrievedChunk extends Chunk
{
    score:number;
}
export interface SearchResult
{
    chunk: Chunk;
    score: number;
}

export type ModelProvider = "anthropic" | "openai";

export interface AppConfig
{
    provider: ModelProvider;
    anthropicApiKey: string;
    openaiApiKey: string;
    anthropicModel: string;
    openaiModel: string;
    openaiEmbeddingModel: string;
    docsPath: string;
    dbPath: string;
    ragTopK: number;
}

export interface AgentResponse
{
    text:string;
    toolsUsed : string[];
    inputTokens: number;
    outputTokens: number;
}