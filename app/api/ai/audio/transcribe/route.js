import { checkRateLimit } from "@/app/modules/ai-chat/server/rateLimit";
import { recordChatUsage } from "@/app/modules/ai-chat/server/usage";
import crypto from "node:crypto";
import { getDestinationUsageState } from "@/app/modules/destination-ai/server/getDestinationUsageState";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENAI_TRANSCRIPTIONS_URL = "https://api.openai.com/v1/audio/transcriptions";
const MAX_AUDIO_BYTES = Number(process.env.AI_AUDIO_MAX_BYTES || 8 * 1024 * 1024);

function clientKey(request) {
  return `audio:${request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous"}`;
}

export async function POST(request) {
  try {
    if (!checkRateLimit(clientKey(request))) {
      return Response.json({ success: false, error: "Demasiadas consultas de voz. Esperá un momento." }, { status: 429 });
    }
    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ success: false, error: "La función de voz todavía no está configurada." }, { status: 503 });
    }
    const incoming = await request.formData().catch(() => null);
    const audio = incoming?.get("audio");
    const siteCode = String(incoming?.get("siteCode") || "").replace(/[^a-z0-9_-]/gi, "").slice(0, 60);
    const sourceSiteCode = siteCode.slice(0, 20);
    const durationSeconds = Math.max(0, Math.min(60, Number(incoming?.get("durationSeconds") || 0)));
    if (siteCode) {
      const policy = await getDestinationUsageState(siteCode);
      if (policy.forceText) return Response.json({ success: false, error: "El audio se pausó temporalmente por el límite mensual. Podés escribir tu consulta." }, { status: 429 });
    }
    if (!audio || typeof audio.arrayBuffer !== "function" || !Number(audio.size)) {
      return Response.json({ success: false, error: "No se recibió una grabación válida." }, { status: 400 });
    }
    if (audio.size > MAX_AUDIO_BYTES) {
      return Response.json({ success: false, error: "La grabación es demasiado larga." }, { status: 413 });
    }

    const form = new FormData();
    form.set("file", audio, audio.name || "consulta.webm");
    form.set("model", process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-transcribe");
    form.set("prompt", "Consulta en español argentino sobre turismo, localidades, comercios y servicios del Valle de Calamuchita.");
    form.append("languages[]", "es");
    const response = await fetch(OPENAI_TRANSCRIPTIONS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("AI AUDIO TRANSCRIPTION ERROR", { status: response.status, code: payload?.error?.code });
      return Response.json({ success: false, error: "No pudimos entender la grabación. Intentá nuevamente." }, { status: 502 });
    }
    const text = String(payload?.text || "").trim().slice(0, 1200);
    if (!text) return Response.json({ success: false, error: "No pudimos detectar palabras en la grabación." }, { status: 422 });
    await recordChatUsage({ businessId: 0, requestId: crypto.randomUUID(), model: process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-transcribe", source: `destination-audio:${sourceSiteCode || "unknown"}`, usage: payload?.usage || {}, estimatedCostUsd: (durationSeconds / 60) * Math.max(0, Number(process.env.AI_TRANSCRIBE_COST_USD_PER_MINUTE || 0.0045)) });
    return Response.json({ success: true, text });
  } catch (error) {
    console.error("AI AUDIO TRANSCRIPTION ERROR", error?.message);
    return Response.json({ success: false, error: "No pudimos procesar el audio." }, { status: 500 });
  }
}
