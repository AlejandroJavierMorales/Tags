export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getGuestAdminAccess, guestAdminAccessResponse } from "@/app/modules/guest-experience/lib/getGuestAdminAccess";
import { parseGuestJson, guestError } from "@/app/modules/guest-experience/lib/guestExperienceService";

export async function GET(req) {
    const q = new URL(req.url).searchParams;
    const businessId = Number(q.get("businessId") || 0);
    const guestAppId = Number(q.get("guestAppId") || 0);
    const stayId = Number(q.get("stayId") || 0);
    const access = await getGuestAdminAccess({ businessId, guestAppId });
    if (!access.allowed) return guestAdminAccessResponse(access);

    const [rows] = await db.query(`SELECT a.*,s.stay_code,s.status stay_status,s.starts_at,s.ends_at,s.adults,s.children,u.name unit_name,g.id guest_id,g.name guest_name,g.email guest_email,g.phone guest_phone,g.document_number guest_document_number FROM tags_guest_stays s INNER JOIN tags_guest_apps a ON a.id=s.guest_app_id AND a.business_id=? INNER JOIN tags_guest_people g ON g.id=s.primary_guest_id LEFT JOIN tags_guest_units u ON u.id=s.unit_id WHERE s.id=? AND s.guest_app_id=? LIMIT 1`, [businessId, stayId, guestAppId]);
    const item = rows[0];
    if (!item) return guestError("Reserva no encontrada", 404);

    const [accounts] = await db.query("SELECT id,currency,status FROM tags_guest_accounts WHERE guest_app_id=? AND stay_id=? LIMIT 1", [guestAppId, stayId]);
    const account = accounts[0] || null;
    let entries = [];
    const summary = { charges: 0, discounts: 0, paid: 0, balance: 0 };
    if (account) {
        const [rawEntries] = await db.query("SELECT e.id,e.entry_type,e.source_type,e.source_id,e.description,e.quantity,e.unit_amount,e.total_amount,e.currency,e.occurred_at,p.payment_method,p.reference FROM tags_guest_account_entries e LEFT JOIN tags_guest_payments p ON p.account_entry_id=e.id WHERE e.account_id=? AND e.status='confirmed' ORDER BY e.occurred_at,e.id", [account.id]);
        entries = rawEntries.map(entry => {
            const amount = Number(entry.total_amount || 0);
            if (entry.entry_type === "payment") summary.paid += Math.abs(amount);
            else if (entry.entry_type === "discount") summary.discounts += Math.abs(amount);
            else if (amount > 0) summary.charges += amount;
            summary.balance += amount;
            return { ...entry, balance_after: summary.balance };
        });
    }

    const settings = parseGuestJson(item.settings_json);
    let theme;
    if (!settings.themeOverride) {
        const [portal] = await db.query("SELECT t.id,t.code,t.name,t.css_tokens FROM tags_portals p INNER JOIN tags_qr_page_themes t ON t.code=p.theme_code AND t.is_active=1 WHERE p.business_id=? LIMIT 1", [businessId]);
        theme = portal[0];
    }
    if (!theme && settings.themeId) {
        const [selected] = await db.query("SELECT id,code,name,css_tokens FROM tags_qr_page_themes WHERE id=? AND is_active=1 LIMIT 1", [settings.themeId]);
        theme = selected[0];
    }
    if (!theme) {
        const [defaults] = await db.query("SELECT id,code,name,css_tokens FROM tags_qr_page_themes WHERE code='tags_default' AND is_active=1 LIMIT 1");
        theme = defaults[0];
    }

    return Response.json({ ok: true, experience: { name: item.name, logoUrl: item.logo_url, coverUrl: item.cover_url, welcomeMessage: item.welcome_message, settings, styles: parseGuestJson(item.styles_json), theme: theme ? { ...theme, css_tokens: parseGuestJson(theme.css_tokens) } : null }, stay: { code: item.stay_code, status: item.stay_status, startsAt: item.starts_at, endsAt: item.ends_at, adults: item.adults, children: item.children, unitName: ["active", "checked_out"].includes(item.stay_status) ? item.unit_name : null }, guest: { id: item.guest_id, name: item.guest_name, email: item.guest_email, phone: item.guest_phone, documentNumber: item.guest_document_number }, account: { account, entries, summary }, preview: true });
}
