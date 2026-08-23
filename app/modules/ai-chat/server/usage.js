import { db } from "@/app/lib/tags-db";

const PRICING = {
    input: Number(process.env.AI_CHAT_INPUT_COST_USD_PER_MILLION || 0.25),
    output: Number(process.env.AI_CHAT_OUTPUT_COST_USD_PER_MILLION || 2)
};

export function estimateCostUsd(usage = {}) {
    const inputTokens = Math.max(0, Number(usage.prompt_tokens || usage.input_tokens || 0));
    const outputTokens = Math.max(0, Number(usage.completion_tokens || usage.output_tokens || 0));
    return (inputTokens / 1_000_000) * PRICING.input + (outputTokens / 1_000_000) * PRICING.output;
}

export function usageTokens(usage = {}) {
    const inputTokens = Math.max(0, Number(usage.prompt_tokens || usage.input_tokens || 0));
    const outputTokens = Math.max(0, Number(usage.completion_tokens || usage.output_tokens || 0));
    return { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens };
}

function firstDayOfMonth() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
}

function planLimitFromText(plan = {}) {
    const value = `${plan.code || ""} ${plan.name || ""}`.toLowerCase();
    const match = value.match(/(?:chat|ia|ai)[^0-9]{0,8}(300|1000|5000)\b/);
    return match ? Number(match[1]) : 0;
}

export async function getBusinessChatPlan(businessId) {
    if (!businessId) return null;
    const [[row]] = await db.query(
        `SELECT b.id business_id,p.id plan_id,p.code,p.name,p.is_active,
                COALESCE(l.monthly_response_limit,0) configured_limit
         FROM tags_businesses b
         LEFT JOIN tags_subscriptions s ON s.id=(
           SELECT s2.id FROM tags_subscriptions s2
           WHERE s2.business_id=b.id ORDER BY s2.id DESC LIMIT 1
         )
         LEFT JOIN tags_plans p ON p.id=COALESCE(s.plan_id,b.plan_id)
         LEFT JOIN tags_ai_chatbot_plan_limits l ON l.plan_id=p.id
         WHERE b.id=? LIMIT 1`,
        [businessId]
    );
    if (!row) return null;
    const configured = Number(row.configured_limit || 0);
    return { ...row, monthlyResponseLimit: configured || planLimitFromText(row) };
}

export async function getMonthlyChatUsage(businessId, start = firstDayOfMonth()) {
    const [[summary]] = await db.query(
        `SELECT COUNT(*) responses,
                COALESCE(SUM(input_tokens),0) input_tokens,
                COALESCE(SUM(output_tokens),0) output_tokens,
                COALESCE(SUM(total_tokens),0) total_tokens,
                COALESCE(SUM(estimated_cost_usd),0) estimated_cost_usd
         FROM tags_ai_chatbot_usage
         WHERE business_id=? AND status='completed' AND created_at>=?`,
        [businessId, start]
    );
    return {
        responses: Number(summary?.responses || 0),
        inputTokens: Number(summary?.input_tokens || 0),
        outputTokens: Number(summary?.output_tokens || 0),
        totalTokens: Number(summary?.total_tokens || 0),
        estimatedCostUsd: Number(summary?.estimated_cost_usd || 0)
    };
}

export async function recordChatUsage({ businessId, requestId, model, source = "public", usage, status = "completed", errorCode = null }) {
    const tokens = usageTokens(usage);
    await db.query(
        `INSERT INTO tags_ai_chatbot_usage
          (business_id,request_id,model,source,status,input_tokens,output_tokens,total_tokens,estimated_cost_usd,error_code)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [businessId || null, requestId, model || null, source, status, tokens.inputTokens, tokens.outputTokens, tokens.totalTokens, estimateCostUsd(usage), errorCode]
    );
    return tokens;
}

export { firstDayOfMonth };
