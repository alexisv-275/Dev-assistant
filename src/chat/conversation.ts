import config from "../config.js";
import { client } from "../llm/anthropic-client.js";
import { Message } from "../types.js";

const CHARS_PER_TOKEN= 4;

//Clase para mantener historial de mensajes y estadísticas de tokens en una conversación con Claude
export class Conversation
{
    private messages: Message[] = [];
    private systemPrompt:string;
    private academicContext: string;
    private totalInputsTokens: number = 0;
    private totalOutputsTokens: number = 0;
    private userTurnCount = 0;

    constructor(systemPrompt: string = "", academicContext: string = "")
    {
        this.systemPrompt = systemPrompt;
        this.academicContext = academicContext;
    }
    addUserMessage(text: string):void{
        this.messages.push({role: "user", content: text});
        this.userTurnCount += 1;
    }
    addAssistantMessage(text: string):void{
        this.messages.push({role: "assistant", content: text});
    }
    async send(): Promise<string>
    {
        const response = await client.messages.create({
                model: config.anthropicModel,
                max_tokens: 1024,
                ...(this.getSystemPrompt() && { system: this.getSystemPrompt()}),
                messages: this.messages,
            });
            this.addUsage(response.usage.input_tokens, response.usage.output_tokens);
            const textBlock = response.content.find((block) => block.type === "text");
            if(!textBlock || textBlock.type !== "text")
            {
                throw new Error("Claude no retornó un bloque de texto en la respuesta");
            }

            const responseText = textBlock.text;
            this.addAssistantMessage(responseText);
            return responseText;
        }

    async start(startPrompt: string, onText: (chunk: string) => void): Promise<string> {
        if (this.messages.length > 0) {
            throw new Error("La conversación ya fue iniciada.");
        }

        this.messages.push({ role: "user", content: startPrompt });
        return this.streamResponse(onText);
    }

    async streamResponse(onText: (chunk: string) => void): Promise<string> {
        let fullMessage = "";
        const stream = client.messages.stream({
            model: config.anthropicModel,
            max_tokens: 1024,
            ...(this.getSystemPrompt() && { system: this.getSystemPrompt()}),
            messages: this.messages,
        });

        stream.on("text", (chunk) => {
            fullMessage += chunk;
            onText(chunk);
        });

        const finalMessage = await stream.finalMessage();
        this.addUsage(finalMessage.usage.input_tokens, finalMessage.usage.output_tokens);
        this.addAssistantMessage(fullMessage);
        return fullMessage;
    }

    addUsage(input_tokens: number, output_tokens:number): void
    {
        this.totalInputsTokens += input_tokens;
        this.totalOutputsTokens += output_tokens;
    }

    clear():void
    {
        this.messages = [];
        this.totalInputsTokens = 0;
        this.totalOutputsTokens = 0;
        this.userTurnCount = 0;
        console.log(" Conversación reiniciada");
    }

    getTurnCount(): number
    {
        return this.userTurnCount;
    }

    estimateCurrentTokens(): number
    {
        const totalChars = this.messages.reduce((sum, msg) => sum + msg.content.length, 0);
        return Math.floor(totalChars / CHARS_PER_TOKEN);
    }

    getStats(): { inputTokens: number; outputTokens: number; turns:number}
    {
        return {
            inputTokens: this.totalInputsTokens,
            outputTokens: this.totalOutputsTokens,
            turns: this.getTurnCount()
        };
    }

    getHistory(): Message[]
    {
        return [...this.messages];
    }

    private getSystemPrompt(): string {
        if (!this.academicContext) {
            return this.systemPrompt;
        }

        return `${this.systemPrompt}\n\nBASE ACADÉMICA DISPONIBLE:\n${this.academicContext}`;
    }
}