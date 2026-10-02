import "dotenv/config";
import { DESTINATION_INTENT_SCHEMA, destinationIntentPrompt } from "../../app/modules/destination-ai/server/destinationIntent.js";

const URL = "https://api.openai.com/v1/chat/completions";
const model = process.env.DESTINATION_AI_INTENT_MODEL || process.env.OPENAI_MODEL;
const apiKey = process.env.OPENAI_API_KEY;

const cases = [
  { name: "location-meta", message: "¿Estás teniendo en cuenta mi ubicación?", location: true, expected: { intent: "conversation_meta", shouldSearch: false } },
  { name: "cables", message: "¿Dónde puedo comprar cables?", location: true, expected: { intent: "find_product", shouldSearch: true, searchIncludes: "cables" } },
  { name: "named-business", message: "¿Y qué vende Ingematec?", location: true, expected: { intent: "inspect_business", shouldSearch: true, businessIncludes: "ingematec" } },
  { name: "new-topic", message: "Ahora necesito comprar una termomagnética", history: [{ role: "user", content: "¿Dónde compro un control remoto para TV?" }, { role: "assistant", content: "GM Electrónica y Cell Shop publican controles remotos." }], expected: { intent: "find_product", shouldSearch: true, searchIncludes: "termomagn" } },
  { name: "clarification", message: "Es lo mismo", history: [{ role: "user", content: "Ahora necesito comprar una termomagnética" }, { role: "assistant", content: "¿Es para una casa o para uso industrial?" }], expected: { intent: "find_product", shouldSearch: true, searchIncludes: "termomagn" } },
  { name: "other-locality", message: "No, decime en otra localidad", history: [{ role: "user", content: "¿Dónde compro un control remoto para TV?" }, { role: "assistant", content: "Encontré opciones en tu zona." }], expected: { shouldSearch: true, searchIncludes: "control remoto" } },
  { name: "result-reference", message: "¿El segundo tiene WhatsApp?", history: [{ role: "user", content: "¿Dónde compro cables?" }, { role: "assistant", content: "Encontré tres opciones." }], expected: { intent: "follow_up_result" } },
];

function normalized(value) {
  return String(value || "").toLocaleLowerCase("es-AR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function assertExpected(data, expected) {
  if (expected.intent && data.intent !== expected.intent) return `intent=${data.intent}`;
  if (typeof expected.shouldSearch === "boolean" && data.shouldSearch !== expected.shouldSearch) return `shouldSearch=${data.shouldSearch}`;
  if (expected.searchIncludes && !normalized(data.searchQuery).includes(normalized(expected.searchIncludes))) return `searchQuery=${data.searchQuery}`;
  if (expected.businessIncludes && !normalized(data.businessName).includes(normalized(expected.businessIncludes))) return `businessName=${data.businessName}`;
  return "";
}

async function interpret(item) {
  const response = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "Sos el intérprete de intención de Muchi. No respondas la consulta: devolvé únicamente el JSON estructurado solicitado." },
        { role: "user", content: destinationIntentPrompt({ message: item.message, history: item.history || [], hasUserLocation: Boolean(item.location), mode: "resident" }) }
      ],
      max_completion_tokens: 350,
      response_format: { type: "json_schema", json_schema: { name: "muchi_destination_intent", strict: true, schema: DESTINATION_INTENT_SCHEMA } }
    })
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);
  return { data: JSON.parse(payload.choices[0].message.content), usage: payload.usage || {} };
}

async function main() {
  if (!apiKey || !model) throw new Error("Faltan OPENAI_API_KEY u OPENAI_MODEL");
  const results = [];
  let inputTokens = 0;
  let outputTokens = 0;
  for (const item of cases) {
    const result = await interpret(item);
    inputTokens += Number(result.usage.prompt_tokens || 0);
    outputTokens += Number(result.usage.completion_tokens || 0);
    const failure = assertExpected(result.data, item.expected);
    results.push({ name: item.name, passed: !failure, failure: failure || null, intent: result.data });
  }
  const failed = results.filter(item => !item.passed);
  process.stdout.write(`${JSON.stringify({ model, passed: results.length - failed.length, failed: failed.length, usage: { inputTokens, outputTokens }, results }, null, 2)}\n`);
  if (failed.length) process.exitCode = 1;
}

main().catch(error => {
  process.stderr.write(`LIVE_INTENT_EVAL_ERROR: ${error.message}\n`);
  process.exitCode = 1;
});
