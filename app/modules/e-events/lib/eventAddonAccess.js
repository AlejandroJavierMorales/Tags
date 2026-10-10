import { db } from "@/app/lib/tags-db";

export const EVENTS_ADDON_CODES = ["e_events", "events"];
export const SIMPLE_EVENTS_ADDON_CODE = "events";
export const PRO_EVENTS_ADDON_CODE = "e_events";

export async function businessHasEventsAddon(businessId, addonCodes = EVENTS_ADDON_CODES) {
    const normalizedBusinessId = Number(businessId);

    if (!Number.isInteger(normalizedBusinessId) || normalizedBusinessId <= 0) {
        return false;
    }

    const codes = Array.isArray(addonCodes) ? addonCodes : [addonCodes];
    if (!codes.length) return false;

    const [rows] = await db.query(
        `SELECT id
           FROM tags_business_addons
          WHERE business_id = ?
            AND TRIM(LOWER(addon_code)) IN (${codes.map(() => "?").join(",")})
            AND status = 'active'
            AND (expires_at IS NULL OR expires_at >= NOW())
          LIMIT 1`,
        [normalizedBusinessId, ...codes]
    );

    return rows.length > 0;
}

export const businessHasSimpleEventsAddon = businessId => businessHasEventsAddon(businessId, SIMPLE_EVENTS_ADDON_CODE);
export const businessHasProEventsAddon = businessId => businessHasEventsAddon(businessId, PRO_EVENTS_ADDON_CODE);

export async function getBusinessEventsProduct(businessId) {
    const [simple, pro] = await Promise.all([
        businessHasSimpleEventsAddon(businessId),
        businessHasProEventsAddon(businessId)
    ]);
    return { simple, pro, mode: pro ? "pro" : simple ? "simple" : null };
}
