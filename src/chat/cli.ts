import * as readline from 'readline';
import { Conversation } from './conversation.js';
import { SOCRATIC_START_PROMPT, SOCRATIC_TUTOR_PROMPT } from '../llm/prompts.js';
import { loadAcademicBase, formatAcademicContext } from '../academic/academic-base.js';
import config from '../config.js';

//1.Iniciar interfaz en la terminal
export async function startCLI(): Promise<void>
{
    const academicSources = await loadAcademicBase(config.academicBasePath);
    const academicContext = formatAcademicContext(academicSources);
    const rl = readline.createInterface(
        {
            input: process.stdin,
            output: process.stdout
        }
    )
    //3.Entregar el system prompt y el contexto académico a la conversación
    const conversation = new Conversation(SOCRATIC_TUTOR_PROMPT, academicContext);
    console.log("╔════════════════════════════════════════╗");
    console.log("║          DevAssistant v0.1             ║");
    console.log("║       Tutor Socrático Académico        ║");
    console.log("╚════════════════════════════════════════╝");
    console.log("");
    console.log(`📚 Base académica cargada: ${academicSources.map((source) => source.source).join(", ")}`);
    console.log("   Comandos: /clear, /stats, /exit");
    console.log("");

    const startClaudeConversation = async (): Promise<void> => {
        process.stdout.write("\nClaude: ");
        //Iniciar la conversación
        await conversation.start(SOCRATIC_START_PROMPT, (chunk) => {
            process.stdout.write(chunk);
        });
        process.stdout.write("\n\n");
    };

    const promptUser = (): void =>
    {
        rl.question("Tú: ", async (input) => {
            const userInput = input.trim();
            if(!userInput)
            {
                promptUser();
                return;
            }
            if (userInput === "/stats") {
                const stats = conversation.getStats();
                console.log(`\n📊 Estadísticas de la conversación:`);
                console.log(`   • Turnos: ${stats.turns}`);
                console.log(`   • Tokens de entrada acumulados: ${stats.inputTokens}`);
                console.log(`   • Tokens de salida acumulados: ${stats.outputTokens}`);
                console.log(`   • Tokens estimados en contexto actual: ${conversation.estimateCurrentTokens()}\n`);
                promptUser();
                return;
            }
            if (userInput === "/exit" || userInput === "/salida") {
                const stats = conversation.getStats();
                console.log(` Resumen: ${stats.turns} turnos `+
                    `${stats.inputTokens} tokens de entrada ` +
                    `${stats.outputTokens} tokens de salida ` 
                );
                rl.close();
                return;
            }
            if(userInput === "/clear" || userInput === "/limpiar")
            {
                conversation.clear();
                try {
                    await startClaudeConversation();
                } catch (error) {
                    const err = error as Error;
                    console.error(` Error al reiniciar la conversación: ${err.message}`);
                }
                promptUser();
                return;
            }
            try {
                conversation.addUserMessage(userInput);
                process.stdout.write("\nClaude: ");
                await conversation.streamResponse((chunk) => {
                    process.stdout.write(chunk);
                });
                process.stdout.write("\n\n");

            } catch (error) {
                const err = error as Error;
                console.error(` Error: ${err.message}`);
            }
            promptUser();
        });
    };

    try {
        await startClaudeConversation();
        promptUser();
    } catch (error) {
        const err = error as Error;
        console.error(` Error al iniciar la conversación: ${err.message}`);
        rl.close();
    }
}