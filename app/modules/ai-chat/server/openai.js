const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export async function generateAnswer({ systemPrompt, userPrompt, history = [] }) {
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

    const response = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            messages,
            max_completion_tokens: Number(process.env.AI_CHAT_MAX_OUTPUT_TOKENS || 500)
        })
    });

    if (!response.ok) {
        let providerPayload = null;

        try {
            providerPayload = await response.json();
        } catch {
            providerPayload = null;
        }

        const providerError = providerPayload?.error;
        const error = new Error("AI_CHAT_PROVIDER_ERROR");
        error.code = "AI_CHAT_PROVIDER_ERROR";
        error.status = response.status;
        error.providerCode = providerError?.code || null;
        error.providerType = providerError?.type || null;
        error.providerMessage = providerError?.message || null;
        throw error;
    }

    const payload = await response.json();
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
