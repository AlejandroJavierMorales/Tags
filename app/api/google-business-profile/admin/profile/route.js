import { db } from "@/app/lib/tags-db";
import { BUSINESS_TYPES, questionsForBusinessType } from "@/app/modules/google-business-profile/lib/googleBusinessConstants";
import { getGoogleBusinessAdminAccess, googleBusinessError } from "@/app/modules/google-business-profile/lib/googleBusinessAccess";
import { calculatePresenceScore, normalizeProfile, parseJson, questionPayload } from "@/app/modules/google-business-profile/lib/googleBusinessProfile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const clean = (value, max = 1000) => String(value ?? "").trim().slice(0, max);
const array = value => Array.isArray(value) ? value.filter(item => String(item || "").trim()).slice(0, 100) : [];

async function payload(businessId) {
    const [businessRows, profileRows, answerRows, places, selected] = await Promise.all([
        db.query("SELECT id,name,display_name,email,phone,description,logo_url,cover_url,whatsapp,address,postal_code,latitude,longitude,website_url,instagram_url,facebook_url,tiktok_url,youtube_url,linkedin_url,google_reviews_url,maps_url FROM tags_businesses WHERE id=? LIMIT 1", [businessId]),
        db.query("SELECT * FROM tags_google_business_profiles WHERE business_id=? LIMIT 1", [businessId]),
        db.query("SELECT question_code,value_json FROM tags_google_business_profile_answers WHERE business_id=?", [businessId]),
        db.query("SELECT id,parent_id,place_type,name,slug,country_code,latitude,longitude FROM tags_geo_places WHERE is_active=1 ORDER BY name", []),
        db.query("SELECT place_id,relation_type,is_primary FROM tags_business_places WHERE business_id=? ORDER BY is_primary DESC,place_id", [businessId])
    ]);
    const business = businessRows[0][0] || null;
    const profile = normalizeProfile(profileRows[0][0]);
    const answers = Object.fromEntries(answerRows[0].map(row => [row.question_code, parseJson(row.value_json, "")]));
    const presence = calculatePresenceScore(business, profile, answers);
    return {
        business,
        profile: { ...profile, completion_score: presence.score },
        answers,
        questions: questionPayload(profile.business_type, answers),
        recommendations: presence.recommendations,
        businessTypes: BUSINESS_TYPES,
        places: places[0],
        selectedPlaces: selected[0]
    };
}

export async function GET(request) {
    try {
        const businessId = Number(new URL(request.url).searchParams.get("businessId") || 0);
        const access = await getGoogleBusinessAdminAccess(businessId);
        if (!access.allowed) return googleBusinessError(access);
        const data = await payload(businessId);
        if (!data.business) return Response.json({ ok: false, error: "Cliente no encontrado" }, { status: 404 });
        return Response.json({ ok: true, addon: access.addon, ...data });
    } catch (error) {
        console.error("GOOGLE BUSINESS PROFILE GET ERROR", error.message);
        return googleBusinessError(error);
    }
}

export async function PATCH(request) {
    try {
        const body = await request.json().catch(() => null);
        const businessId = Number(body?.businessId || 0);
        const access = await getGoogleBusinessAdminAccess(businessId);
        if (!access.allowed) return googleBusinessError(access);
        const type = clean(body.business_type, 60);
        if (!BUSINESS_TYPES.some(item => item.id === type)) return Response.json({ ok: false, error: "Selecciona un tipo de negocio valido" }, { status: 400 });
        const allowedQuestionCodes = new Set(questionsForBusinessType(type).map(item => item.code));
        const answers = body.answers && typeof body.answers === "object" ? body.answers : {};
        const services = array(body.services).map(item => clean(item, 240));
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            await connection.query(
                `INSERT INTO tags_google_business_profiles
                    (business_id,business_type,business_subtype,primary_category_id,primary_category_name,secondary_categories_json,has_physical_location,is_service_area_business,service_areas_json,regular_hours_json,special_hours_json,services_json,attributes_json,profile_status,completion_score)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'profile_in_progress',0)
                 ON DUPLICATE KEY UPDATE business_type=VALUES(business_type),business_subtype=VALUES(business_subtype),primary_category_id=VALUES(primary_category_id),primary_category_name=VALUES(primary_category_name),secondary_categories_json=VALUES(secondary_categories_json),has_physical_location=VALUES(has_physical_location),is_service_area_business=VALUES(is_service_area_business),service_areas_json=VALUES(service_areas_json),regular_hours_json=VALUES(regular_hours_json),special_hours_json=VALUES(special_hours_json),services_json=VALUES(services_json),attributes_json=VALUES(attributes_json),profile_status='profile_in_progress',updated_at=NOW()`,
                [businessId, type, clean(body.business_subtype, 120) || null, clean(body.primary_category_id, 190) || null, clean(body.primary_category_name, 190) || null, JSON.stringify(array(body.secondary_categories)), body.has_physical_location === false || Number(body.has_physical_location) === 0 ? 0 : 1, body.is_service_area_business === true || Number(body.is_service_area_business) === 1 ? 1 : 0, JSON.stringify(array(body.service_areas)), JSON.stringify(body.regular_hours && typeof body.regular_hours === "object" ? body.regular_hours : {}), JSON.stringify(array(body.special_hours)), JSON.stringify(services), JSON.stringify(array(body.attributes))]
            );
            for (const [code, value] of Object.entries(answers)) {
                if (!allowedQuestionCodes.has(code)) continue;
                const normalized = typeof value === "number" || typeof value === "boolean" ? value : clean(value, 5000);
                await connection.query(
                    `INSERT INTO tags_google_business_profile_answers (business_id,question_code,value_json)
                     VALUES (?,?,?) ON DUPLICATE KEY UPDATE value_json=VALUES(value_json),updated_at=NOW()`,
                    [businessId, code, JSON.stringify(normalized)]
                );
            }
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally { connection.release(); }
        const data = await payload(businessId);
        await db.query("UPDATE tags_google_business_profiles SET completion_score=?,profile_status=? WHERE business_id=?", [data.profile.completion_score, data.profile.completion_score >= 80 ? "profile_complete" : "profile_in_progress", businessId]);
        return Response.json({ ok: true, ...data });
    } catch (error) {
        console.error("GOOGLE BUSINESS PROFILE PATCH ERROR", error.message);
        return googleBusinessError(error);
    }
}
