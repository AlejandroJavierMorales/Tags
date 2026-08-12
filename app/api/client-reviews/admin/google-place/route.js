export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

function googleInput(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    try {
        const parsed = new URL(raw);
        if (!/(^|\.)google\.[a-z.]+$/i.test(parsed.hostname) && !/(^|\.)g\.page$/i.test(parsed.hostname)) return "";
        return parsed.searchParams.get("q") || parsed.searchParams.get("query") || decodeURIComponent(parsed.pathname.replace(/^\/maps\/place\//, "").replace(/[+/]+/g, " ")) || raw;
    } catch { return raw; }
}

function placeIdFrom(value) {
    try {
        const parsed = new URL(String(value || ""));
        return parsed.searchParams.get("place_id") || parsed.searchParams.get("query_place_id") || "";
    } catch { return ""; }
}

async function resolveGoogleUrl(value) {
    try {
        const parsed = new URL(value);
        if (parsed.hostname === "g.page" || parsed.hostname.endsWith(".g.page") || parsed.hostname === "maps.google.com") {
            const response = await fetch(value, { redirect: "follow", signal: AbortSignal.timeout(7000) });
            return response.url || value;
        }
    } catch {}
    return value;
}

function cleanPlace(place) {
    const id = String(place?.id || "").replace(/^places\//, "");
    return {
        placeId: id,
        name: place?.displayName?.text || "",
        address: place?.formattedAddress || "",
        mapsUrl: place?.googleMapsUri || "",
        photoName: place?.photos?.[0]?.name || null,
        photoAttribution: place?.photos?.[0]?.authorAttributions?.[0]?.displayName || null
    };
}

async function googleRequest(url, options, key) {
    const response = await fetch(url, { ...options, headers: { ...(options.headers || {}), "X-Goog-Api-Key": key } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error?.message || "Google no pudo identificar el negocio");
    return payload;
}

export async function POST(req) {
    try {
        const body = await req.json().catch(() => null);
        const businessId = Number(body?.businessId || 0);
        const formId = Number(body?.formId || 0);
        const input = String(body?.url || "").trim();
        if (!businessId || !formId || !input) return Response.json({ error: "Pegá una URL de Google Maps" }, { status: 400 });
        const key = process.env.MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
        if (!key) return Response.json({ error: "Falta configurar MAPS_API_KEY en el servidor" }, { status: 503 });

        const [forms] = await db.query("SELECT id,settings_json FROM tags_client_review_forms WHERE id=? AND business_id=? LIMIT 1", [formId, businessId]);
        if (!forms[0]) return Response.json({ error: "Formulario de Reviews no encontrado" }, { status: 404 });

        let place;
        const resolvedInput = await resolveGoogleUrl(input);
        const directPlaceId = placeIdFrom(resolvedInput);
        if (directPlaceId) {
            place = await googleRequest(`https://places.googleapis.com/v1/places/${encodeURIComponent(directPlaceId)}`, { headers: { "X-Goog-FieldMask": "id,displayName,formattedAddress,googleMapsUri,photos" } }, key);
        } else {
            const textQuery = googleInput(resolvedInput);
            if (!textQuery) return Response.json({ error: "La URL no parece pertenecer a Google Maps" }, { status: 400 });
            const result = await googleRequest("https://places.googleapis.com/v1/places:searchText", { method: "POST", headers: { "Content-Type": "application/json", "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.googleMapsUri,places.photos" }, body: JSON.stringify({ textQuery, languageCode: "es", regionCode: "AR" }) }, key);
            place = result.places?.[0];
        }
        const normalized = cleanPlace(place);
        if (!normalized.placeId || !normalized.name) return Response.json({ error: "No encontramos un negocio válido en esa URL" }, { status: 404 });
        const googleReviewUrl = `https://search.google.com/local/writereview?placeid=${encodeURIComponent(normalized.placeId)}`;
        let settings = {};
        try { settings = forms[0].settings_json ? (typeof forms[0].settings_json === "object" ? forms[0].settings_json : JSON.parse(forms[0].settings_json)) : {}; } catch { settings = {}; }
        settings.googlePlace = normalized;
        await db.query("UPDATE tags_client_review_forms SET google_review_url=?, settings_json=?, updated_at=NOW() WHERE id=? AND business_id=?", [googleReviewUrl, JSON.stringify(settings), formId, businessId]);
        return Response.json({ ok: true, googleReviewUrl, place: normalized });
    } catch (error) {
        console.error("CLIENT REVIEWS GOOGLE PLACE ERROR", error);
        return Response.json({ error: error.message || "No se pudo conectar con Google" }, { status: 502 });
    }
}
