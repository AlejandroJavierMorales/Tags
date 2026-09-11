import "server-only";

import { db } from "@/app/lib/tags-db";

function time(value, fallback) {
    const [hours, minutes] = String(value || fallback).split(":").map(Number);
    return { hours: Number.isFinite(hours) ? hours : 0, minutes: Number.isFinite(minutes) ? minutes : 0 };
}

function googleHours(hours) {
    const dayNames = { monday: "MONDAY", tuesday: "TUESDAY", wednesday: "WEDNESDAY", thursday: "THURSDAY", friday: "FRIDAY", saturday: "SATURDAY", sunday: "SUNDAY" };
    const periods = Object.entries(hours || {}).filter(([, value]) => !value?.closed).map(([day, value]) => ({
        openDay: dayNames[day], openTime: time(value?.open, "09:00"),
        closeDay: dayNames[day], closeTime: time(value?.close, "18:00")
    })).filter(item => item.openDay);
    return periods.length ? { periods } : undefined;
}

export async function buildGoogleLocationPayload(businessId) {
    const [businessRows, profileRows, placeRows] = await Promise.all([
        db.query("SELECT name,display_name,phone,address,postal_code,latitude,longitude,website_url,description FROM tags_businesses WHERE id=? LIMIT 1", [businessId]),
        db.query("SELECT primary_category_id,is_service_area_business,service_areas_json,regular_hours_json FROM tags_google_business_profiles WHERE business_id=? LIMIT 1", [businessId]),
        db.query(`SELECT locality.name locality,province.name administrative_area,COALESCE(country.country_code,'AR') region_code
                    FROM tags_business_places bp
                    INNER JOIN tags_geo_places locality ON locality.id=bp.place_id
                    LEFT JOIN tags_geo_places region ON region.id=locality.parent_id
                    LEFT JOIN tags_geo_places province ON province.id=CASE WHEN region.place_type='region' THEN region.parent_id ELSE locality.parent_id END
                    LEFT JOIN tags_geo_places country ON country.id=province.parent_id
                   WHERE bp.business_id=? AND bp.relation_type='location' ORDER BY bp.is_primary DESC LIMIT 1`, [businessId])
    ]);
    const business = businessRows[0][0];
    const profile = profileRows[0][0] || {};
    const place = placeRows[0][0] || {};
    if (!business) throw new Error("Cliente no encontrado");
    if (!profile.primary_category_id) { const error = new Error("Selecciona primero una categoria oficial de Google"); error.status = 400; throw error; }
    let regularHours = {};
    try { regularHours = typeof profile.regular_hours_json === "string" ? JSON.parse(profile.regular_hours_json || "{}") : profile.regular_hours_json || {}; } catch {}
    const location = {
        title: business.display_name || business.name,
        languageCode: "es-419",
        categories: { primaryCategory: { name: profile.primary_category_id } },
        phoneNumbers: business.phone ? { primaryPhone: business.phone } : undefined,
        websiteUri: business.website_url || undefined,
        profile: business.description ? { description: String(business.description).slice(0, 750) } : undefined,
        storefrontAddress: business.address ? { regionCode: String(place.region_code || "AR").toUpperCase(), languageCode: "es-419", postalCode: business.postal_code || undefined, administrativeArea: place.administrative_area || undefined, locality: place.locality || undefined, addressLines: [business.address] } : undefined,
        latlng: business.latitude != null && business.longitude != null ? { latitude: Number(business.latitude), longitude: Number(business.longitude) } : undefined,
        regularHours: googleHours(regularHours)
    };
    return JSON.parse(JSON.stringify(location));
}

export function sanitizeGoogleLocation(location) {
    const allowed = ["title", "languageCode", "storeCode", "categories", "phoneNumbers", "websiteUri", "profile", "storefrontAddress", "latlng", "regularHours", "specialHours", "serviceArea", "labels", "openInfo"];
    return Object.fromEntries(allowed.filter(key => location?.[key] != null).map(key => [key, location[key]]));
}
