import { buildUserPrompt, BUSINESS_SYSTEM_PROMPT, DESTINATION_SYSTEM_PROMPT, SYSTEM_PROMPT } from "@/app/modules/ai-chat/server/prompts";
import { retrieveKnowledge } from "@/app/modules/ai-chat/server/knowledge";
import { buildDestinationContext, searchDirectoryCandidates } from "@/app/modules/destination-ai/server/searchDirectoryCandidates";
import { buildKnowledgeIndexContext, compareCandidateSets, getBusinessKnowledgeContext, getKnowledgeCandidatesByKeys, searchKnowledgeIndex } from "@/app/modules/destination-ai/server/searchKnowledgeIndex";
import { DESTINATION_ANSWER_SCHEMA, DESTINATION_INTENT_SCHEMA, destinationIntentPrompt, fallbackDestinationIntent, normalizeDestinationIntent } from "@/app/modules/destination-ai/server/destinationIntent";
import { DESTINATION_ANSWER_V2_SCHEMA, DESTINATION_INTENT_V2_SCHEMA, destinationIntentV2Prompt, fallbackDestinationIntentV2, normalizeDestinationIntentV2 } from "@/app/modules/destination-ai/server/destinationIntentV2";
import { prepareDestinationDayPlan } from "@/app/modules/destination-ai/server/destinationDayPlanner";
import { getDestinationTaxonomyCatalog } from "@/app/modules/destination-ai/server/destinationTaxonomy";
import { buildDestinationV2Context, getDestinationCandidatesByKeysV2, isDestinationEngineV2Available, searchDestinationTaskV2 } from "@/app/modules/destination-ai/server/searchDestinationEngineV2";
import { selectRecommendedCandidates } from "@/app/modules/destination-ai/server/selectRecommendedCandidates";
import { getDestinationUsageState, notifyDestinationUsageThreshold } from "@/app/modules/destination-ai/server/getDestinationUsageState";
import { recordDestinationQueryAnalytics } from "@/app/modules/destination-ai/server/destinationQueryAnalytics";
import { generateAnswer, generateStructuredJson } from "@/app/modules/ai-chat/server/openai";
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

function extractRecentRecommendations(history) {
    if (!Array.isArray(history)) return [];
    for (const message of [...history].reverse()) {
        if (message?.role !== "assistant" || !Array.isArray(message.candidates)) continue;
        const results = [];
        const seen = new Set();
        for (const item of message.candidates) {
            const entityKey = String(item?.entityKey || "").trim().slice(0, 255);
            if (!entityKey || seen.has(entityKey)) continue;
            seen.add(entityKey);
            results.push({
                id: Number(item?.id || 0) || null,
                businessId: Number(item?.businessId || 0) || null,
                entityKey,
                entityType: String(item?.entityType || "").slice(0, 40),
                name: String(item?.name || "").slice(0, 255),
                matchedTitle: String(item?.matchedTitle || "").slice(0, 255),
                description: String(item?.description || "").slice(0, 2000),
                locality: String(item?.locality || "").slice(0, 190),
                imageUrl: item?.imageUrl || null,
                href: item?.href || null,
                phone: item?.phone || null,
                whatsapp: item?.whatsapp || null,
                websiteUrl: item?.websiteUrl || null,
                latitude: Number.isFinite(Number(item?.latitude)) ? Number(item.latitude) : null,
                longitude: Number.isFinite(Number(item?.longitude)) ? Number(item.longitude) : null,
                distanceKm: Number.isFinite(Number(item?.distanceKm)) ? Number(item.distanceKm) : null,
                matchType: item?.matchType === "nearby_alternative" ? "nearby_alternative" : "exact",
                evidenceLevel: String(item?.evidenceLevel || "previous_result").slice(0, 60),
                evidenceExcerpt: String(item?.evidenceExcerpt || item?.description || "").slice(0, 700),
                commercial: item?.commercial && typeof item.commercial === "object" ? item.commercial : {}
            });
            if (results.length >= 8) break;
        }
        return results;
    }
    return [];
}

function getDestinationTemporalContext() {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("es-AR", {
        timeZone: "America/Argentina/Cordoba",
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(now);
    const hour = Number(parts.find(item => item.type === "hour")?.value || 12);
    const moment = hour < 6 ? "madrugada" : hour < 12 ? "mañana" : hour < 19 ? "tarde" : "noche";
    return `FECHA Y HORA LOCAL EN CALAMUCHITA: ${new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Cordoba", dateStyle: "full", timeStyle: "short" }).format(now)}. MOMENTO DEL DÍA: ${moment}. Considerá también toda condición climática, de movilidad, compañía, edad, presupuesto o preferencia que la persona indique expresamente. No inventes el clima actual.`;
}

function normalizeForMatch(value) {
    return String(value || "").toLocaleLowerCase("es-AR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function sanitizeDestinationAnswer(answer,candidates=[]){
    const byKey=new Map(candidates.map(item=>[String(item.entityKey||"").toLowerCase(),String(item.name||"").trim()]).filter(([,name])=>name));
    return String(answer||"")
        .replace(/\b(?:business_location|directory_listing|tourism_content|qr_product|store_product|turnos_service):\d+\b/gi,key=>byKey.get(key.toLowerCase())||"la opción encontrada")
        .replace(/\bbusiness\s+locati\w*\s+(\d+)\b/gi,(_,id)=>byKey.get(`business_location:${id}`)||"la opción encontrada")
        .replace(/\b(?:disponible\s+)?en\s+el\s+contexto\b/gi,"entre las opciones encontradas");
}

function parseUserLocation(value) {
    const latitude = Number(value?.latitude);
    const longitude = Number(value?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
    if (latitude < -33.15 || latitude > -31.35 || longitude < -65.35 || longitude > -63.7) return null;
    return { latitude, longitude };
}

function destinationQuery(message, history) {
    const normalizedMessage = normalizeForMatch(message);
    const conversation = sanitizeHistory(history);
    if (conversation.at(-1)?.role === "user" && normalizeForMatch(conversation.at(-1)?.content) === normalizedMessage) conversation.pop();
    const previousUserMessage = [...conversation].reverse().find(item => item.role === "user")?.content || "";
    const lastConversationItem = conversation.at(-1);
    const clarificationAnswer = lastConversationItem?.role === "assistant"
        && String(lastConversationItem.content || "").includes("?")
        && normalizedMessage.split(" ").filter(Boolean).length <= 10;
    if (clarificationAnswer && previousUserMessage) return `${previousUserMessage} ${message}`;
    const messages = conversation.filter(item => item.role === "user").map(item => item.content);
    const startsIndependentRequest = /\b(?:tambien|ademas|ahora|aparte)\b.*\b(?:comprar|buscar|conseguir|necesit|quiero|tengo que)\b/.test(normalizedMessage)
        || /\b(?:comprar|buscar|conseguir|necesit|quiero)\b.*\b(?:tambien|ademas|aparte)\b/.test(normalizedMessage);
    if (startsIndependentRequest) return message;
    const referentialFollowUp = /\b(?:otra|otras|otro|otros)\s+(?:localidad|localidades|zona|zonas|opcion|opciones|alternativa|alternativas)\b/.test(normalizedMessage)
        || /\b(?:el|la)\s+(?:primero|primera|segundo|segunda|tercero|tercera)\b/.test(normalizedMessage)
        || /\b(?:cerca|lejos|distancia|como llegar|contactar|llamar|whatsapp)\b/.test(normalizedMessage);
    if (!referentialFollowUp) return message;
    return [...messages, message].slice(-3).join(" ");
}

function mergeOpenAiUsage(...items) {
    return items.reduce((total, usage) => ({
        prompt_tokens: total.prompt_tokens + Number(usage?.prompt_tokens || usage?.input_tokens || 0),
        completion_tokens: total.completion_tokens + Number(usage?.completion_tokens || usage?.output_tokens || 0),
        total_tokens: total.total_tokens + Number(usage?.total_tokens || 0)
    }), { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 });
}

export async function POST(request) {
    let analyticsFailureContext = null;
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
        const siteCode = String(body?.siteCode || "").trim().slice(0, 60);
        const destinationMode = ["tourist", "resident"].includes(body?.mode) ? body.mode : "unselected";
        const userLocation = parseUserLocation(body?.userLocation);
        const requestId = crypto.randomUUID();
        const source = String(body?.source || body?.surfaceType || "public").slice(0, 40);
        const conversationId = String(body?.conversationId || "").trim().slice(0, 100);
        analyticsFailureContext = siteCode ? { siteCode,requestId,conversationId,source,mode:destinationMode,question:message,userLocation,useEngineV2:false,searchRequests:[],candidates:[],recommendedCandidates:[] } : null;
        const destinationUsage = siteCode ? await getDestinationUsageState(siteCode) : null;
        if (destinationUsage?.nearLimit) notifyDestinationUsageThreshold(destinationUsage).catch(error => console.error("DESTINATION LIMIT NOTIFICATION ERROR", error?.message));
        if (destinationUsage?.blocked) {
            if (analyticsFailureContext) await recordDestinationQueryAnalytics({ ...analyticsFailureContext,answerStatus:"blocked" });
            analyticsFailureContext = null;
            return Response.json({ success: false, code: "DESTINATION_AI_LIMIT", error: "El asistente alcanzó el límite mensual configurado." }, { status: 429 });
        }
        let chatPlan = null;
        let currentUsage = null;
        if (businessId) {
            chatPlan = await getBusinessChatPlan(businessId);
            if (chatPlan?.monthlyResponseLimit > 0) {
                currentUsage = await getMonthlyChatUsage(businessId);
                if (currentUsage.responses >= chatPlan.monthlyResponseLimit) {
                    await recordChatUsage({ businessId, requestId, model: process.env.OPENAI_MODEL, source, status: "blocked", usage: {}, errorCode: "AI_CHAT_MONTHLY_LIMIT" });
                    if (analyticsFailureContext) await recordDestinationQueryAnalytics({ ...analyticsFailureContext,answerStatus:"blocked" });
                    analyticsFailureContext = null;
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
        const history = sanitizeHistory(body?.history);
        if (history.at(-1)?.role === "user" && normalizeForMatch(history.at(-1)?.content) === normalizeForMatch(message)) history.pop();
        const previousSearchQuery = String(body?.conversationState?.searchQuery || "").trim().slice(0, 500);
        const clientRecommendations = extractRecentRecommendations([
            ...(Array.isArray(body?.history) ? body.history : []),
            { role: "assistant", candidates: Array.isArray(body?.conversationState?.recommendations) ? body.conversationState.recommendations : [] }
        ]);
        const indexMode = String(process.env.DESTINATION_AI_INDEX_MODE || "shadow").toLowerCase();
        const engineV2Requested = String(process.env.DESTINATION_AI_ENGINE_VERSION || "v2").toLowerCase() === "v2";
        const useEngineV2 = Boolean(siteCode && indexMode === "active" && engineV2Requested && await isDestinationEngineV2Available(siteCode));
        if (analyticsFailureContext) analyticsFailureContext.useEngineV2 = useEngineV2;
        const taxonomyCatalog = useEngineV2 ? await getDestinationTaxonomyCatalog(siteCode) : [];
        const clientJourneyKeys = Array.isArray(body?.conversationState?.journeyKeys)
            ? body.conversationState.journeyKeys.map(item => String(item || "").trim().slice(0, 255)).filter(Boolean).slice(-18)
            : [];
        const [recentRecommendations, journeyRecommendations] = siteCode && indexMode === "active"
            ? await Promise.all([
                useEngineV2
                    ? getDestinationCandidatesByKeysV2({ siteCode, entityKeys: clientRecommendations.map(item => item.entityKey), userLocation })
                    : getKnowledgeCandidatesByKeys({ siteCode, entityKeys: clientRecommendations.map(item => item.entityKey), userLocation }),
                useEngineV2
                    ? getDestinationCandidatesByKeysV2({ siteCode, entityKeys: clientJourneyKeys, userLocation })
                    : getKnowledgeCandidatesByKeys({ siteCode, entityKeys: clientJourneyKeys, userLocation })
            ])
            : [clientRecommendations, []];
        const previousTasks = Array.isArray(body?.conversationState?.tasks) ? body.conversationState.tasks : [];
        const fallbackIntent = useEngineV2
            ? fallbackDestinationIntentV2({ message, taxonomyCatalog, previousTasks })
            : fallbackDestinationIntent({ message, history, recentRecommendations, previousSearchQuery, hasUserLocation: Boolean(userLocation) });
        let destinationIntent = fallbackIntent;
        let intentUsage = {};
        let intentModel = null;
        if (siteCode && indexMode === "active") {
            try {
                const interpreted = await generateStructuredJson({
                    systemPrompt: "Sos el intérprete de intención de Muchi. No respondas la consulta: devolvé únicamente el JSON estructurado solicitado.",
                    userPrompt: useEngineV2
                        ? destinationIntentV2Prompt({ message, history, mode: destinationMode, taxonomyCatalog, previousTasks, recentRecommendations, hasUserLocation: Boolean(userLocation) })
                        : destinationIntentPrompt({ message, history, recentRecommendations, savedRecommendations: journeyRecommendations, previousSearchQuery, hasUserLocation: Boolean(userLocation), mode: destinationMode }),
                    schema: useEngineV2 ? DESTINATION_INTENT_V2_SCHEMA : DESTINATION_INTENT_SCHEMA,
                    schemaName: useEngineV2 ? "muchi_destination_intent_v2" : "muchi_destination_intent",
                    maxCompletionTokens: useEngineV2 ? 650 : 350,
                    model: process.env.DESTINATION_AI_INTENT_MODEL || process.env.OPENAI_MODEL
                });
                destinationIntent = useEngineV2
                    ? normalizeDestinationIntentV2(interpreted.data, fallbackIntent, taxonomyCatalog, previousTasks)
                    : normalizeDestinationIntent(interpreted.data, fallbackIntent);
                if (!useEngineV2 && destinationIntent.shouldSearch && previousSearchQuery && destinationIntent.locationPreference !== "other") {
                    const previousTopic = normalizeForMatch(previousSearchQuery);
                    const currentTopics = destinationIntent.searchQueries.map(item => normalizeForMatch(item.query)).filter(Boolean);
                    const continuesSameTopic = currentTopics.some(topic => topic.includes(previousTopic) || previousTopic.includes(topic));
                    if (!continuesSameTopic) {
                        destinationIntent.isNewTopic = true;
                        destinationIntent.continuesPrevious = false;
                    }
                }
                intentUsage = interpreted.usage;
                intentModel = interpreted.model;
            } catch (error) {
                console.warn("DESTINATION INTENT FALLBACK", { requestId, code: error?.code || error?.message });
            }
        }
        if (analyticsFailureContext) analyticsFailureContext.destinationIntent = destinationIntent;
        const preparedDayPlan = useEngineV2
            ? prepareDestinationDayPlan(destinationIntent, taxonomyCatalog, { hasUserLocation: Boolean(userLocation) })
            : { intent: destinationIntent, clarification: null, isDayPlan: false };
        destinationIntent = preparedDayPlan.intent;
        const planClarification = preparedDayPlan.clarification;
        const searchRequests = useEngineV2
            ? planClarification ? [] : destinationIntent.tasks
            : indexMode === "active" && destinationIntent.shouldSearch
            ? (destinationIntent.searchQueries?.length
                ? destinationIntent.searchQueries
                : [{ intent: destinationIntent.intent, query: destinationIntent.searchQuery, alternativeQuery: destinationIntent.alternativeQuery, label: destinationIntent.subject || destinationIntent.searchQuery }])
            : [];
        if (analyticsFailureContext) analyticsFailureContext.searchRequests = searchRequests;
        const primarySearchRequest = searchRequests[0] || null;
        const destinationSearchQuery = indexMode === "active" ? primarySearchRequest?.query || "" : destinationQuery(message, body?.history);
        const v2Results = useEngineV2
            ? await Promise.all(searchRequests.map((task, taskIndex) => searchDestinationTaskV2({ siteCode, task, userLocation, limit: 4 }).then(result => ({ ...result, taskIndex }))))
            : null;
        const [legacyCandidates, indexResult] = useEngineV2
            ? [[], { available: true, candidates: v2Results.flatMap(result => result.candidates.map(item => ({ ...item, taskIndex: result.taskIndex }))) }]
            : siteCode
            ? await Promise.all([
                indexMode === "active" ? Promise.resolve([]) : searchDirectoryCandidates({ siteCode, query: destinationSearchQuery, userLocation }),
                indexMode === "off" || (indexMode === "active" && !destinationIntent.shouldSearch)
                    ? Promise.resolve({ available: indexMode === "active", candidates: [] })
                    : searchKnowledgeIndex({
                        siteCode,
                        query: destinationSearchQuery,
                        searchIntent: primarySearchRequest?.intent || destinationIntent.intent,
                        mode: destinationMode,
                        userLocation,
                        preferredLocality: destinationIntent.locationPreference === "specified" ? destinationIntent.locationText : "",
                        excludedLocalities: destinationIntent.locationPreference === "other" ? destinationIntent.excludedLocalities : [],
                        limit: 3
                    })
            ])
            : [[], { available: false, candidates: [] }];
        if (siteCode && indexMode === "shadow" && indexResult.available) {
            console.info("DESTINATION AI INDEX SHADOW", { requestId, siteCode, queryHash: crypto.createHash("sha256").update(destinationSearchQuery).digest("hex").slice(0, 16), ...compareCandidateSets(legacyCandidates, indexResult.candidates) });
        }
        const useKnowledgeIndex = siteCode && indexMode === "active" && indexResult.available;
        let candidates = useKnowledgeIndex
            ? useEngineV2
                ? indexResult.candidates
                : indexResult.candidates.map(item => ({ ...item, requestLabel: primarySearchRequest?.label || primarySearchRequest?.query || "", requestQuery: primarySearchRequest?.query || "" }))
            : legacyCandidates;
        if (useKnowledgeIndex && !useEngineV2 && searchRequests.length > 1) {
            const additionalResults = await Promise.all(searchRequests.slice(1).map(requestItem => searchKnowledgeIndex({
                siteCode,
                query: requestItem.query,
                searchIntent: requestItem.intent,
                mode: destinationMode,
                userLocation,
                preferredLocality: destinationIntent.locationPreference === "specified" ? destinationIntent.locationText : "",
                excludedLocalities: destinationIntent.locationPreference === "other" ? destinationIntent.excludedLocalities : [],
                limit: 3
            }).then(result => ({ requestItem, result }))));
            for (const { requestItem, result } of additionalResults) {
                candidates.push(...(result.candidates || []).map(item => ({ ...item, requestLabel: requestItem.label || requestItem.query, requestQuery: requestItem.query })));
            }
        }
        if (useKnowledgeIndex && !useEngineV2) {
            const exactByRequest = new Map();
            for (const item of candidates) exactByRequest.set(item.requestQuery, (exactByRequest.get(item.requestQuery) || 0) + 1);
            const alternativeRequests = searchRequests.filter(item => item.alternativeQuery && (exactByRequest.get(item.query) || 0) === 0);
            const alternativeResults = await Promise.all(alternativeRequests.map(requestItem => searchKnowledgeIndex({
                siteCode,
                query: requestItem.alternativeQuery,
                searchIntent: "find_business",
                mode: destinationMode,
                userLocation,
                preferredLocality: destinationIntent.locationPreference === "specified" ? destinationIntent.locationText : "",
                excludedLocalities: destinationIntent.locationPreference === "other" ? destinationIntent.excludedLocalities : [],
                limit: 4
            }).then(result => ({ requestItem, result }))));
            const existing = new Set(candidates.map(item => `${item.requestQuery}:${item.id}`));
            const totalsByRequest = new Map(exactByRequest);
            for (const { requestItem, result } of alternativeResults) {
                for (const alternative of result.candidates || []) {
                    if ((totalsByRequest.get(requestItem.query) || 0) >= 3) break;
                    const key = `${requestItem.query}:${alternative.id}`;
                    if (existing.has(key)) continue;
                    existing.add(key);
                    candidates.push({ ...alternative, requestLabel: requestItem.label || requestItem.query, requestQuery: requestItem.query, matchType: "nearby_alternative", evidenceLevel: "category_inference" });
                    totalsByRequest.set(requestItem.query, (totalsByRequest.get(requestItem.query) || 0) + 1);
                }
            }
        }
        if (useKnowledgeIndex && !useEngineV2 && destinationIntent.intent === "inspect_business") {
            const expectedName = normalizeForMatch(destinationIntent.businessName || destinationIntent.searchQuery);
            candidates = candidates.filter(item => normalizeForMatch(item.name).includes(expectedName) || expectedName.includes(normalizeForMatch(item.name))).slice(0, 1);
        }
        if (useKnowledgeIndex && !useEngineV2 && destinationIntent.intent === "plan_itinerary" && journeyRecommendations.length) {
            candidates = [
                ...journeyRecommendations.map(item => ({ ...item, requestLabel: "opción guardada durante la conversación", requestQuery: "itinerario" })),
                ...candidates
            ];
        }
        if (useKnowledgeIndex && !useEngineV2 && destinationIntent.intent === "challenge_recommendation") {
            const challenged = recentRecommendations.find(item => item.entityKey === destinationIntent.resultReferenceKey);
            candidates = challenged ? [challenged] : recentRecommendations;
        } else if (useKnowledgeIndex && !useEngineV2 && destinationIntent.intent === "follow_up_result") {
            const referenced = recentRecommendations.find(item => item.entityKey === destinationIntent.resultReferenceKey);
            candidates = referenced ? [referenced] : recentRecommendations;
        } else if (useKnowledgeIndex && !useEngineV2) {
            const merged = new Map();
            for (const item of candidates) {
                const key = Number(item.id) || item.entityKey;
                const existing = merged.get(key);
                if (!existing) {
                    merged.set(key, { ...item, requestLabels: item.requestLabel ? [item.requestLabel] : [] });
                    continue;
                }
                existing.requestLabels = [...new Set([...existing.requestLabels, item.requestLabel].filter(Boolean))];
                if (existing.matchType === "nearby_alternative" && item.matchType !== "nearby_alternative") Object.assign(existing, item, { requestLabels: existing.requestLabels });
            }
            candidates = [...merged.values()].slice(0, 9);
        }
        if (useEngineV2) {
            const referencedKeys = new Set(searchRequests.flatMap(task => task.resultReferenceKeys || []));
            if (referencedKeys.size) {
                const referenced = recentRecommendations.filter(item => referencedKeys.has(item.entityKey));
                candidates = [...referenced, ...candidates];
            }
            const unique = new Map();
            for (const item of candidates) {
                const existing = unique.get(item.entityKey);
                if (!existing) unique.set(item.entityKey, { ...item, taskIndexes: Number.isInteger(item.taskIndex) ? [item.taskIndex] : [] });
                else existing.taskIndexes = [...new Set([...(existing.taskIndexes || []), item.taskIndex].filter(Number.isInteger))];
            }
            candidates = [...unique.values()].slice(0, 12);
        }
        if (analyticsFailureContext) analyticsFailureContext.candidates = candidates;
        let businessKnowledgeContext = "";
        const inspectsBusiness = useEngineV2
            ? destinationIntent.tasks.some(task => task.type === "inspect_business")
            : destinationIntent.intent === "inspect_business";
        if (useKnowledgeIndex && inspectsBusiness && candidates[0]?.businessId) {
            businessKnowledgeContext = await getBusinessKnowledgeContext({ siteCode, businessId: candidates[0].businessId });
        }
        const context = siteCode
            ? (useKnowledgeIndex
                ? useEngineV2
                    ? [`TAREAS INTERPRETADAS: ${JSON.stringify(destinationIntent.tasks)}`, destinationIntent.answerDirective && `DIRECTIVA: ${destinationIntent.answerDirective}`, buildDestinationV2Context(destinationIntent.tasks, candidates), businessKnowledgeContext && `CONOCIMIENTO COMPLETO DEL PRESTADOR:\n${businessKnowledgeContext}`].filter(Boolean).join("\n\n")
                    : [`INTENCIÓN INTERPRETADA: ${JSON.stringify(destinationIntent)}`, destinationIntent.answerDirective && `DIRECTIVA: ${destinationIntent.answerDirective}`, buildKnowledgeIndexContext(candidates), businessKnowledgeContext && `CONOCIMIENTO COMPLETO DEL PRESTADOR:\n${businessKnowledgeContext}`].filter(Boolean).join("\n\n")
                : buildDestinationContext(candidates))
            : await retrieveKnowledge(message, { businessId, maxChars: Number(process.env.AI_CHAT_MAX_CONTEXT_CHARS || 8000) });
        const userPrompt = buildUserPrompt({
            question: message,
            context: [siteCode ? `MODO DE LA PERSONA: ${destinationMode}` : "", userLocation ? "La persona autorizó usar su ubicación actual. Las distancias disponibles ya fueron calculadas y son aproximadas." : "La persona no compartió su ubicación geográfica.", siteCode ? getDestinationTemporalContext() : "", context, contactContext].filter(Boolean).join("\n\n")
        });
        const answerHistory = useEngineV2 ? (destinationIntent.continuesPrevious ? history : []) : destinationIntent.isNewTopic ? [] : history;
        const generated = planClarification
            ? { answer:planClarification,recommendationKeys:[],needsClarification:true,suggestedPrompts:["Estamos en Villa General Belgrano y tenemos auto","Salimos desde Los Reartes sin auto"],model:intentModel,usage:{} }
            : useKnowledgeIndex
            ? await generateStructuredJson({
                systemPrompt: `${DESTINATION_SYSTEM_PROMPT}\nDevolvé JSON según el schema. recommendationKeys debe contener únicamente IDs autorizados incluidos en el contexto y todos los lugares que realmente mencionás en reply. Si pedís una aclaración sin recomendar a nadie, usá una lista vacía. Nunca inventes un ID. Si hay varias tareas, resolvé cada necesidad por separado sin mezclar sus opciones. No hables de evidencia, registros, índices, directorios ni limitaciones técnicas: explicá de forma natural qué encontraste y por qué puede servir.`,
                userPrompt,
                history: answerHistory,
                schema: useEngineV2 ? DESTINATION_ANSWER_V2_SCHEMA : DESTINATION_ANSWER_SCHEMA,
                schemaName: useEngineV2 ? "muchi_destination_answer_v2" : "muchi_destination_answer",
                maxCompletionTokens: Number(process.env.DESTINATION_AI_MAX_OUTPUT_TOKENS || 350),
                model: process.env.OPENAI_MODEL
            }).then(result => ({ answer: result.data.reply, recommendationKeys: result.data.recommendationKeys, needsClarification: result.data.needsClarification, suggestedPrompts: result.data.suggestedPrompts || [], model: result.model, usage: result.usage }))
            : await generateAnswer({
                systemPrompt: siteCode ? DESTINATION_SYSTEM_PROMPT : businessId ? BUSINESS_SYSTEM_PROMPT : SYSTEM_PROMPT,
                userPrompt,
                history,
                maxCompletionTokens: siteCode ? Number(process.env.DESTINATION_AI_MAX_OUTPUT_TOKENS || 350) : null
            });

        const combinedUsage = mergeOpenAiUsage(intentUsage, generated.usage);
        if(planClarification){
            generated.answer=planClarification;
            generated.recommendationKeys=[];
            generated.needsClarification=true;
            generated.suggestedPrompts=["Estamos en Villa General Belgrano y tenemos auto","Salimos desde Los Reartes sin auto"];
        } else if(useEngineV2&&searchRequests.length&&candidates.length===0&&!destinationIntent.tasks.some(task=>task.needsClarification)){
            const subjects=destinationIntent.tasks.map(task=>task.subject||task.query).filter(Boolean).slice(0,2).join(" y ");
            const locality=destinationIntent.tasks.find(task=>task.localityPreference==="specified"&&task.locality)?.locality;
            generated.answer=`No encontré por ahora una opción que publique exactamente ${subjects||"eso"}${locality?` en ${locality}`:" en el Valle de Calamuchita"}.`;
            generated.recommendationKeys=[];
            generated.needsClarification=false;
        }
        if(siteCode)generated.answer=sanitizeDestinationAnswer(generated.answer,candidates);
        const tokens = await recordChatUsage({
            businessId,
            requestId,
            model: generated.model || intentModel,
            source,
            usage: combinedUsage
        });
        const usage = businessId && chatPlan?.monthlyResponseLimit > 0
            ? {
                responses: Number(currentUsage?.responses || 0) + 1,
                limit: chatPlan.monthlyResponseLimit,
                remaining: Math.max(0, chatPlan.monthlyResponseLimit - Number(currentUsage?.responses || 0) - 1)
            }
            : null;
        const answerText = normalizeForMatch(generated.answer);
        const explicitlyRecommended = selectRecommendedCandidates({ candidates, answer: generated.answer, recommendationKeys: generated.recommendationKeys, limit: 9 });
        const recommendedCandidates = siteCode
            ? useKnowledgeIndex
                ? useEngineV2
                    ? explicitlyRecommended.slice(0, 12)
                    : destinationIntent.intent === "challenge_recommendation"
                    ? []
                    : (destinationIntent.intent === "follow_up_result" ? candidates : explicitlyRecommended).slice(0, 9)
                : candidates.filter(item => answerText.includes(normalizeForMatch(item.name))).slice(0, 3)
            : undefined;
        const conversationState = siteCode ? {
            searchQuery: useEngineV2 ? destinationIntent.tasks[0]?.query || previousSearchQuery : destinationIntent.shouldSearch ? destinationIntent.searchQuery : previousSearchQuery,
            tasks: useEngineV2 ? destinationIntent.tasks : previousTasks,
            recommendations: recommendedCandidates?.length
                ? recommendedCandidates
                : useEngineV2
                    ? destinationIntent.continuesPrevious && destinationIntent.tasks.some(task=>task.resultReferenceKeys?.length) ? recentRecommendations : []
                    : destinationIntent.shouldSearch || destinationIntent.isNewTopic
                    ? []
                    : destinationIntent.intent === "challenge_recommendation" ? [] : recentRecommendations,
            journeyKeys: [...new Set([
                ...clientJourneyKeys.filter(key => useEngineV2 || destinationIntent.intent !== "challenge_recommendation" || (destinationIntent.resultReferenceKey ? key !== destinationIntent.resultReferenceKey : !recentRecommendations.some(item => item.entityKey === key))),
                ...(recommendedCandidates || []).map(item => item.entityKey)
            ])].slice(-18)
        } : undefined;
        if (siteCode) {
            await recordDestinationQueryAnalytics({
                siteCode,
                requestId,
                conversationId,
                source,
                mode: destinationMode,
                question: message,
                destinationIntent,
                useEngineV2,
                userLocation,
                searchRequests,
                candidates,
                recommendedCandidates,
                needsClarification: generated.needsClarification,
            });
            analyticsFailureContext = null;
        }
        return Response.json({ success: true, answer: generated.answer, candidates: recommendedCandidates, suggestedPrompts: generated.suggestedPrompts || [], conversationState, usage, tokens, engineVersion: useEngineV2 ? "v2" : "v1" });
    } catch (error) {
        if (analyticsFailureContext) await recordDestinationQueryAnalytics({ ...analyticsFailureContext,answerStatus:"error" });
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
