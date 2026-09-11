import { parseJson } from "@/app/modules/turnos/lib/turnosService";
import { getSportsDurationPolicy } from "./sportsDurationPolicy";

export async function getSportsBookingPolicy(connection, turnosApp, service) {
    if (turnosApp?.business_profile_code !== "sports_club") return null;
    const [apps] = await connection.query(
        "SELECT id FROM tags_sports_apps WHERE turnos_id = ? AND business_id = ? AND status = 'active' LIMIT 1",
        [turnosApp.id, turnosApp.business_id]
    );
    if (!apps[0]) return null;
    const [rates] = await connection.query(
        `SELECT audience_type, price, currency
         FROM tags_sports_service_rates
         WHERE sports_app_id = ? AND service_id = ? AND is_active = 1`,
        [apps[0].id, service.id]
    );
    const byAudience = Object.fromEntries(rates.map(item => [item.audience_type, item]));
    const settings = parseJson(service.settings_json);
    return {
        sportsAppId: apps[0].id,
        audienceMode: settings?.sports?.audienceMode || "members_and_guests",
        guestPrice: Number(byAudience.guest?.price ?? service.price ?? 0),
        memberPrice: Number(byAudience.member?.price ?? service.price ?? 0),
        currency: byAudience.guest?.currency || service.currency || turnosApp.currency || "ARS",
        ...getSportsDurationPolicy(service)
    };
}
