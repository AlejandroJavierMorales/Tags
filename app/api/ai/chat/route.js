import { buildUserPrompt, BUSINESS_SYSTEM_PROMPT, SYSTEM_PROMPT } from "@/app/modules/ai-chat/server/prompts";
import { retrieveKnowledge } from "@/app/modules/ai-chat/server/knowledge";
import { generateAnswer } from "@/app/modules/ai-chat/server/openai";
import { checkRateLimit } from "@/app/modules/ai-chat/server/rateLimit";
import { getBusinessChatPlan, getMonthlyChatUsage, recordChatUsage } from "@/app/modules/ai-chat/server/usage";
import { db } from "@/app/lib/tags-db";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MESSAGE_CHARS = Number(process.env.AI_CHAT_MAX_MESSAGE_CHARS || 1200);
const MAX_HISTORY_ITEMS = 6;

function getClientKey(request) {
    return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
        || request.headers.get("cf-connecting-ip")
        || "anonymous";
}

function sanitizeHistory(history) {
    if (!Array.isArray(history)) return [];

    return history
        .slice(-MAX_HISTORY_ITEMS)
        .filter(item => item && (item.role === "user" || item.role === "assistant"))
        .map(item => ({
            role: item.role,
            content: typeof item.content === "string"
                ? item.content.slice(0, 800)
                : ""
        }))
        .filter(item => item.content.trim());
}

export async function POST(request) {
    try {
        if (!checkRateLimit(getClientKey(request))) {
            return Response.json(
                { success: false, error: "Demasiadas consultas. Esperá un momento e intentá nuevamente." },
                { status: 429 }
            );
        }

        let body;
        try {
            body = await request.json();
        } catch {
            return Response.json(
                { success: false, error: "La consulta no tiene un formato válido." },
                { status: 400 }
            );
        }

        const message = typeof body?.message === "string" ? body.message.trim() : "";

        if (!message) {
            return Response.json(
                { success: false, error: "Escribí una pregunta para comenzar." },
                { status: 400 }
            );
        }

        if (message.length > MAX_MESSAGE_CHARS) {
            return Response.json(
                { success: false, error: `La pregunta no puede superar los ${MAX_MESSAGE_CHARS} caracteres.` },
                { status: 400 }
            );
        }

        const businessId = Number(body?.businessId || 0);
        const requestId = crypto.randomUUID();
        const source = String(body?.source || body?.surfaceType || "public").slice(0, 40);
        let chatPlan = null;
        let currentUsage = null;
        if (businessId) {
            chatPlan = await getBusinessChatPlan(businessId);
            if (chatPlan?.monthlyResponseLimit > 0) {
                currentUsage = await getMonthlyChatUsage(businessId);
                if (currentUsage.responses >= chatPlan.monthlyResponseLimit) {
                    await recordChatUsage({ businessId, requestId, model: process.env.OPENAI_MODEL, source, status: "blocked", usage: {}, errorCode: "AI_CHAT_MONTHLY_LIMIT" });
                    return Response.json({
                        success: false,
                        code: "AI_CHAT_MONTHLY_LIMIT",
                        error: "El asistente alcanzó el límite de respuestas de este mes.",
                        usage: { ...currentUsage, limit: chatPlan.monthlyResponseLimit, remaining: 0 }
                    }, { status: 429 });
                }
            }
        }
        let contactContext = "";
        if (businessId) {
            const [businessRows] = await db.query("SELECT email,phone,whatsapp FROM tags_businesses WHERE id=? LIMIT 1", [businessId]);
            const contact = businessRows[0] || {};
            const contactLines = [
                contact.phone ? `Teléfono: ${contact.phone}` : "",
                contact.whatsapp ? `WhatsApp: ${contact.whatsapp}` : "",
                contact.email ? `Email: ${contact.email}` : ""
            ].filter(Boolean);
            if (contactLines.length) contactContext = `DATOS DE CONTACTO DEL NEGOCIO:\n${contactLines.join("\n")}`;
        }
        const context = await retrieveKnowledge(message, {
            businessId,
            maxChars: Number(process.env.AI_CHAT_MAX_CONTEXT_CHARS || 8000)
        });

        const generated = await generateAnswer({
            systemPrompt: businessId ? BUSINESS_SYSTEM_PROMPT : SYSTEM_PROMPT,
            userPrompt: buildUserPrompt({ question: message, context: [context, contactContext].filter(Boolean).join("\n\n") }),
            history: sanitizeHistory(body?.history)
        });

        const tokens = await recordChatUsage({
            businessId,
            requestId,
            model: generated.model,
            source,
            usage: generated.usage
        });
        const usage = businessId && chatPlan?.monthlyResponseLimit > 0
            ? {
                responses: Number(currentUsage?.responses || 0) + 1,
                limit: chatPlan.monthlyResponseLimit,
                remaining: Math.max(0, chatPlan.monthlyResponseLimit - Number(currentUsage?.responses || 0) - 1)
            }
            : null;
        return Response.json({ success: true, answer: generated.answer, usage, tokens });
    } catch (error) {
        console.error("AI CHAT ERROR", {
            code: error?.code || error?.message,
            status: error?.status,
            providerCode: error?.providerCode,
            providerType: error?.providerType,
            providerMessage: error?.providerMessage
        });

        if (error?.code === "AI_CHAT_NOT_CONFIGURED") {
            return Response.json(
                { success: false, error: "El asistente todavía no está configurado." },
                { status: 503 }
            );
        }

        return Response.json(
            { success: false, error: "No pudimos responder en este momento. Intentá nuevamente." },
            { status: 500 }
        );
    }
}
