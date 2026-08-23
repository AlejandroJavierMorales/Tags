import { db } from "@/app/lib/tags-db";
import { getAiChatAdminAccess, aiChatAdminError } from "@/app/modules/ai-chat/server/getAiChatAdminAccess";
import { requireSubscriptionAdmin, subscriptionAdminError } from "@/app/modules/subscriptions/lib/requireSubscriptionAdmin";
import { getBusinessChatPlan, getMonthlyChatUsage } from "@/app/modules/ai-chat/server/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function periodBounds(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})$/);
    const now = new Date();
    const year = match ? Number(match[1]) : now.getFullYear();
    const month = match ? Number(match[2]) - 1 : now.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 1);
    return { start, end, label: `${year}-${String(month + 1).padStart(2, "0")}` };
}

export async function GET(request) {
    const params = new URL(request.url).searchParams;
    const businessId = Number(params.get("businessId") || 0);
    const period = periodBounds(params.get("period"));

    if (businessId) {
        const access = await getAiChatAdminAccess(businessId);
        if (!access.allowed) return aiChatAdminError(access);
    } else {
        const access = await requireSubscriptionAdmin();
        if (!access.ok) return subscriptionAdminError(access);
    }

    try {
        const chatPlan = businessId ? await getBusinessChatPlan(businessId) : null;
        // El resumen global incluye también consultas del asistente general de Tags
        // que no están asociadas a un cliente.
        const where = businessId ? "u.business_id=?" : "1=1";
        const args = businessId ? [businessId, period.start, period.end] : [period.start, period.end];
        const [[summary]] = await db.query(
            `SELECT COUNT(*) responses,
                    COALESCE(SUM(u.input_tokens),0) input_tokens,
                    COALESCE(SUM(u.output_tokens),0) output_tokens,
                    COALESCE(SUM(u.total_tokens),0) total_tokens,
                    COALESCE(SUM(u.estimated_cost_usd),0) estimated_cost_usd
             FROM tags_ai_chatbot_usage u
             WHERE ${where} AND u.status='completed' AND u.created_at>=? AND u.created_at<?`,
            args
        );
        const [daily] = await db.query(
            `SELECT DATE(u.created_at) day,COUNT(*) responses,
                    COALESCE(SUM(u.total_tokens),0) total_tokens,
                    COALESCE(SUM(u.estimated_cost_usd),0) estimated_cost_usd
             FROM tags_ai_chatbot_usage u
             WHERE ${where} AND u.status='completed' AND u.created_at>=? AND u.created_at<?
             GROUP BY DATE(u.created_at) ORDER BY day`,
            args
        );
        let businesses = [];
        if (!businessId) {
            [businesses] = await db.query(
                `SELECT u.business_id,b.name business_name,b.email,
                        COUNT(*) responses,COALESCE(SUM(u.total_tokens),0) total_tokens,
                        COALESCE(SUM(u.estimated_cost_usd),0) estimated_cost_usd
                 FROM tags_ai_chatbot_usage u
                 LEFT JOIN tags_businesses b ON b.id=u.business_id
                 WHERE u.business_id IS NOT NULL AND u.status='completed' AND u.created_at>=? AND u.created_at<?
                 GROUP BY u.business_id,b.name,b.email ORDER BY responses DESC,b.name LIMIT 500`,
                [period.start, period.end]
            );
        }
        const monthlyLimit = Number(chatPlan?.monthlyResponseLimit || 0);
        const monthlyUsage = businessId ? await getMonthlyChatUsage(businessId, period.start) : null;
        return Response.json({
            ok: true,
            period: period.label,
            plan: businessId ? { code: chatPlan?.code || null, name: chatPlan?.name || null, monthlyResponseLimit: monthlyLimit } : null,
            summary: {
                responses: Number(summary?.responses || 0),
                inputTokens: Number(summary?.input_tokens || 0),
                outputTokens: Number(summary?.output_tokens || 0),
                totalTokens: Number(summary?.total_tokens || 0),
                estimatedCostUsd: Number(summary?.estimated_cost_usd || 0)
            },
            remaining: businessId && monthlyLimit > 0 ? Math.max(0, monthlyLimit - Number(monthlyUsage?.responses || 0)) : null,
            daily,
            businesses
        });
    } catch (error) {
        console.error("AI CHAT USAGE ERROR", error);
        return Response.json({ ok: false, error: "No se pudo cargar el consumo del chatbot" }, { status: 500 });
    }
}
