const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

async function requestCompletion(payload) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        const error = new Error("AI_CHAT_NOT_CONFIGURED");
        error.code = "AI_CHAT_NOT_CONFIGURED";
        throw error;
    }
    const response = await fetch(OPENAI_URL, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, body: JSON.stringify(payload) });
    if (!response.ok) {
        let providerPayload = null;
        try { providerPayload = await response.json(); } catch { providerPayload = null; }
        const providerError = providerPayload?.error;
        const error = new Error("AI_CHAT_PROVIDER_ERROR");
        error.code = "AI_CHAT_PROVIDER_ERROR";
        error.status = response.status;
        error.providerCode = providerError?.code || null;
        error.providerType = providerError?.type || null;
        error.providerMessage = providerError?.message || null;
        throw error;
    }
    return response.json();
}

export async function generateStructuredJson({ systemPrompt, userPrompt, history = [], schema, schemaName, maxCompletionTokens = 400, model: requestedModel = null }) {
    const model = requestedModel || process.env.OPENAI_MODEL;
    if (!model) {
        const error = new Error("AI_CHAT_NOT_CONFIGURED");
        error.code = "AI_CHAT_NOT_CONFIGURED";
        throw error;
    }
    const payload = await requestCompletion({
        model,
        messages: [{ role: "system", content: systemPrompt }, ...history, { role: "user", content: userPrompt }],
        max_completion_tokens: Number(maxCompletionTokens),
        response_format: { type: "json_schema", json_schema: { name: schemaName, strict: true, schema } }
    });
    const message = payload?.choices?.[0]?.message;
    if (message?.refusal) throw new Error("AI_CHAT_STRUCTURED_REFUSAL");
    if (!message?.content) throw new Error("AI_CHAT_EMPTY_RESPONSE");
    let data;
    try { data = JSON.parse(message.content); } catch { throw new Error("AI_CHAT_INVALID_STRUCTURED_RESPONSE"); }
    return { data, model, usage: payload?.usage || {} };
}

export async function generateAnswer({ systemPrompt, userPrompt, history = [], maxCompletionTokens = null }) {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL;

    if (!apiKey || !model) {
        const error = new Error("AI_CHAT_NOT_CONFIGURED");
        error.code = "AI_CHAT_NOT_CONFIGURED";
        throw error;
    }

    const messages = [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: userPrompt }
    ];

    const payload = await requestCompletion({
            model,
            messages,
            max_completion_tokens: Number(maxCompletionTokens || process.env.AI_CHAT_MAX_OUTPUT_TOKENS || 500)
    });
    const answer = payload?.choices?.[0]?.message?.content?.trim();

    if (!answer) {
        throw new Error("AI_CHAT_EMPTY_RESPONSE");
    }

    return {
        answer,
        model,
        usage: payload?.usage || {}
    };
}
