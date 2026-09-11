import { questionsForBusinessType } from "./googleBusinessConstants";

export function parseJson(value, fallback) {
    if (value == null || value === "") return fallback;
    if (typeof value === "object") return value;
    try { return JSON.parse(value); } catch { return fallback; }
}

export function normalizeProfile(row) {
    return {
        business_type: row?.business_type || "",
        business_subtype: row?.business_subtype || "",
        primary_category_id: row?.primary_category_id || "",
        primary_category_name: row?.primary_category_name || "",
        secondary_categories: parseJson(row?.secondary_categories_json, []),
        has_physical_location: Number(row?.has_physical_location ?? 1),
        is_service_area_business: Number(row?.is_service_area_business ?? 0),
        service_areas: parseJson(row?.service_areas_json, []),
        regular_hours: parseJson(row?.regular_hours_json, {}),
        special_hours: parseJson(row?.special_hours_json, []),
        services: parseJson(row?.services_json, []),
        attributes: parseJson(row?.attributes_json, []),
        profile_status: row?.profile_status || "not_started",
        completion_score: Number(row?.completion_score || 0)
    };
}

export function calculatePresenceScore(business, profile, answers = {}) {
    const checks = [
        ["Identidad comercial", business?.display_name || business?.name, 12],
        ["Descripcion", business?.description, 10],
        ["Contacto", business?.phone || business?.whatsapp, 10],
        ["Email", business?.email, 5],
        ["Ubicacion", profile.has_physical_location ? (business?.address && business?.latitude && business?.longitude) : true, 12],
        ["Tipo de negocio", profile.business_type, 8],
        ["Categoria principal", profile.primary_category_id || profile.primary_category_name, 12],
        ["Horarios", Object.keys(profile.regular_hours || {}).length, 8],
        ["Servicios", (profile.services || []).length, 8],
        ["Sitio web", business?.website_url, 5],
        ["Imagenes", business?.logo_url && business?.cover_url, 5],
        ["Informacion especifica", Object.values(answers).some(value => value !== "" && value != null), 5]
    ];
    const score = checks.reduce((total, [, completed, weight]) => total + (completed ? weight : 0), 0);
    const recommendations = checks.filter(([, completed]) => !completed).map(([title, , weight]) => ({
        priority: weight >= 10 ? "high" : weight >= 8 ? "medium" : "low",
        title: `Completa: ${title}`,
        description: `Esta informacion mejora la calidad y completitud de la presencia digital del negocio.`
    }));
    return { score: Math.min(100, score), recommendations };
}

export function questionPayload(type, answers) {
    return questionsForBusinessType(type).map(question => ({ ...question, value: answers?.[question.code] ?? "" }));
}
