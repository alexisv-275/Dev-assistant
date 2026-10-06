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
    input_schem:{
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