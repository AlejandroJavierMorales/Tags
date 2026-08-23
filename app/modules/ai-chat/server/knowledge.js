import documents from "../knowledge/tags.json";
import { db } from "@/app/lib/tags-db";

const STOP_WORDS = new Set([
    "a", "al", "con", "de", "del", "el", "en", "es", "la", "las", "los",
    "me", "mi", "para", "por", "que", "qué", "se", "si", "su", "un", "una",
    "y", "yo"
]);

function normalize(value = "") {
    return value
        .toLocaleLowerCase("es-AR")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function terms(value) {
    return normalize(value)
        .split(" ")
        .filter(term => term.length > 2 && !STOP_WORDS.has(term));
}

export async function retrieveKnowledge(query, { businessId = 0, limit = 6, maxChars = 8000 } = {}) {
    let customDocuments = [];
    if (businessId) {
        try {
            const [rows] = await db.query("SELECT title,topics,content FROM tags_ai_chatbot_knowledge WHERE business_id=? AND is_active=1 ORDER BY sort_order,id", [businessId]);
            customDocuments = rows.map(row => ({ title: row.title, topics: String(row.topics || "").split(",").map(item => item.trim()).filter(Boolean), content: row.content }));
        } catch (error) {
            console.error("AI CHAT KNOWLEDGE ERROR", error.message);
        }
    }
    const availableDocuments = businessId
        ? customDocuments.map(document => ({ ...document, isCustom: true }))
        : documents.map(document => ({ ...document, isCustom: false }));
    const queryTerms = new Set(terms(query));

    const ranked = availableDocuments.map(document => {
        const titleTerms = new Set(terms(document.title));
        const topicTerms = new Set(terms(document.topics.join(" ")));
        const contentTerms = new Set(terms(document.content));
        let score = 0;

        if (document.isCustom) score += 8;

        for (const term of queryTerms) {
            if (titleTerms.has(term)) score += 6;
            if (topicTerms.has(term)) score += 4;
            if (contentTerms.has(term)) score += 1;
            if (document.isCustom && contentTerms.has(term)) score += 2;
        }

        return { document, score };
    })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

    let usedChars = 0;
    const selected = [];

    for (const { document } of ranked) {
        const block = `## ${document.title}\n${document.content}`;
        if (usedChars + block.length > maxChars && selected.length > 0) break;
        selected.push(block);
        usedChars += block.length;
    }

    return selected.join("\n\n");
}

export function getKnowledgeDocumentCount() {
    return documents.length;
}
