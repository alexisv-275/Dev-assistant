/*
import { error } from "console";
import config from "./config.js";
import { askClaude } from "./llm/anthropic-client.js";
import {CODE_REVIEWER_PROMPT, DOCUMENTATION_ASSISTANT_PROMPT} from "./llm/prompts.js";
import { streamClaude } from "./llm/streaming.js";

async function main(): Promise<void> {
  console.log("╔════════════════════════════════════════╗");
  console.log("║        DevAssistant - Curso IA         ║");
  console.log("╚════════════════════════════════════════╝");
  // console.log("");
  // console.log("✅ DevAssistant configurado correctamente");
  console.log("");
  // console.log("📋 Configuración activa:");
  // console.log(`   • Provider:       ${config.provider}`);
  // console.log(`   • Modelo Anthropic: ${config.anthropicModel}`);
  // console.log(`   • Modelo OpenAI:  ${config.openaiModel}`);
  // console.log(`   • Docs path:      ${config.docsPath}`);
  // console.log(`   • RAG top-K:      ${config.ragTopK}`);
  // console.log("Enviando una pregunta de prueba a Claude...");
  // console.log("");
  // const question = "En qué consiste el método socrático en 3 puntos concisos?"
  // console.log(`Pregunta: ${question}`);
  // console.log("");
  // const answer = await askClaude(question);
  // console.log("-".repeat(50));
  // console.log(answer);
  // console.log("-".repeat(50));

  const QUESTION = 'Cómo llevar a cabo el método socrático en 3 puntos concisos?';

  console.log("Demo 2: Respuesta de Claude con streaming");
  console.log("");
  const reviewerPromptAnswer = await streamClaude(QUESTION, DOCUMENTATION_ASSISTANT_PROMPT);
  console.log(`Pregunta: ${QUESTION}`);
  console.log("");
  console.log("-".repeat(50));
  console.log(reviewerPromptAnswer);
  console.log("-".repeat(50));
  
  console.log("");
}

main().catch((error: Error) => console.error("Error:", error.message));
*/
import { startCLI } from "./chat/cli.js";

startCLI().catch((error: Error) => 
  {
    console.error(" Error: ", error.message);
    process.exit(1);
  });
  