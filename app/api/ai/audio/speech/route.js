import { checkRateLimit } from "@/app/modules/ai-chat/server/rateLimit";
import { recordChatUsage } from "@/app/modules/ai-chat/server/usage";
import crypto from "node:crypto";
import { getDestinationUsageState } from "@/app/modules/destination-ai/server/getDestinationUsageState";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENAI_SPEECH_URL = "https://api.openai.com/v1/audio/speech";

function clientKey(request) {
  return `speech:${request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous"}`;
}

export async function POST(request) {
  try {
    if (!checkRateLimit(clientKey(request))) return Response.json({ error: "Demasiadas respuestas de voz." }, { status: 429 });
    if (!process.env.OPENAI_API_KEY) return Response.json({ error: "La función de voz todavía no está configurada." }, { status: 503 });
    const body = await request.json().catch(() => null);
    const input = String(body?.text || "").replace(/[*#]/g, "").trim().slice(0, 3500);
    const siteCode = String(body?.siteCode || "").replace(/[^a-z0-9_-]/gi, "").slice(0, 60);
    const sourceSiteCode = siteCode.slice(0, 20);
    if (siteCode) {
      const policy = await getDestinationUsageState(siteCode);
      if (policy.forceText) return Response.json({ error: "La respuesta hablada está pausada por el límite mensual." }, { status: 429 });
    }
    if (!input) return Response.json({ error: "No hay texto para reproducir." }, { status: 400 });

    const response = await fetch(OPENAI_SPEECH_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
        voice: process.env.OPENAI_TTS_VOICE || "coral",
        input,
        instructions: "Hablá en español argentino con una voz simpática, cálida, clara y breve. Sos Muchi, un zorrito asistente del Valle de Calamuchita.",
        response_format: "mp3",
      }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      console.error("AI AUDIO SPEECH ERROR", { status: response.status, code: payload?.error?.code });
      return Response.json({ error: "No pudimos generar la respuesta hablada." }, { status: 502 });
    }
    await recordChatUsage({
      businessId: 0,
      requestId: crypto.randomUUID(),
      model: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
      source: `destination-tts:${sourceSiteCode || "unknown"}`,
      usage: {},
      estimatedCostUsd: (Math.max(1, input.trim().split(/\s+/).length) / 150) * Math.max(0, Number(process.env.AI_TTS_COST_USD_PER_MINUTE || 0.015)),
    });
    return new Response(response.body, {
      status: 200,
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("AI AUDIO SPEECH ERROR", error?.message);
    return Response.json({ error: "No pudimos generar la respuesta hablada." }, { status: 500 });
  }
}
