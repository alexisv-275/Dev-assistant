import config from "../config.js";
import { client } from "./anthropic-client.js";

//Permite mostrar la respuesta en tiempo real (chunk por chunk) mientras se genera, en lugar de esperar a que se complete toda la respuesta.
export async function streamClaude(prompt:string, systemPrompt?:string): Promise<string> {
    let fullResponse="";
    const responseStream = client.messages.stream({
        model: config.anthropicModel,
        max_tokens: 1024,
        ...(systemPrompt && { system: systemPrompt}),
        messages:
        [
            {
                role:"user",
                content: prompt
            }
        ]
    });
    responseStream.on("text", (chunk) =>
       {
        process.stdout.write(chunk);
        fullResponse += chunk;
    });
    await responseStream.finalMessage();
    process.stdout.write("\n");
    return fullResponse;
}