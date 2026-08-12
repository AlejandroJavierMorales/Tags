export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getGuestAdminAccess, guestAdminAccessResponse } from "@/app/modules/guest-experience/lib/getGuestAdminAccess";
import { guestError } from "@/app/modules/guest-experience/lib/guestExperienceService";

const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));

export async function GET(req) {
    const query = new URL(req.url).searchParams;
    const businessId = Number(query.get("businessId") || 0);
    const guestAppId = Number(query.get("guestAppId") || 0);
    const from = query.get("from"), to = query.get("to");
    const search = String(query.get("search") || "").trim();
    const documentSearch = search.replace(/\D/g, "");
    const access = await getGuestAdminAccess({ businessId, guestAppId });
    if (!access.allowed) return guestAdminAccessResponse(access);
    if (!validDate(from) || !validDate(to) || from > to) return guestError("El período no es válido");

    const [rows] = await db.query(`
        SELECT s.id,s.stay_code,s.status,s.starts_at,s.ends_at,s.adults,s.children,s.nightly_rate,s.lodging_total,
               s.deposit_required_amount,g.name guest_name,g.document_number,
               (SELECT pc.status FROM tags_guest_precheckins pc WHERE pc.stay_id=s.id LIMIT 1) precheckin_status,
               COALESCE((SELECT SUM(p.amount) FROM tags_guest_accounts ac INNER JOIN tags_guest_payments p ON p.account_id=ac.id WHERE ac.stay_id=s.id),0) paid_total
          FROM tags_guest_stays s
          INNER JOIN tags_guest_people g ON g.id=s.primary_guest_id
         WHERE s.guest_app_id=? AND DATE(s.starts_at)>=? AND DATE(s.starts_at)<=? AND s.status<>'cancelled'
           AND (?='' OR s.stay_code LIKE CONCAT('%',?,'%') OR g.name LIKE CONCAT('%',?,'%')
                OR (?<>'' AND REPLACE(REPLACE(REPLACE(g.document_number,'.',''),'-',''),' ','') LIKE CONCAT('%',?,'%')))
         ORDER BY s.starts_at,s.stay_code`,
        [guestAppId, from, to, search, search, search, documentSearch, documentSearch]
    );
    const ids = rows.map(item => item.id);
    let payments = [];
    if (ids.length) {
        const placeholders = ids.map(() => "?").join(",");
        [payments] = await db.query(`SELECT ac.stay_id,p.id,p.amount,p.payment_method,p.reference,p.notes,p.received_at,e.description FROM tags_guest_accounts ac INNER JOIN tags_guest_payments p ON p.account_id=ac.id INNER JOIN tags_guest_account_entries e ON e.id=p.account_entry_id WHERE ac.stay_id IN (${placeholders}) ORDER BY p.received_at,p.id`, ids);
    }
    const byStay = payments.reduce((map, item) => { (map[item.stay_id] ||= []).push(item); return map; }, {});
    const items = rows.map(item => {
        const nights = Math.max(1, Math.round((new Date(item.ends_at) - new Date(item.starts_at)) / 86400000));
        const paid = Number(item.paid_total || 0), total = Number(item.lodging_total || 0);
        return { ...item, nights, passengers: Number(item.adults || 0) + Number(item.children || 0), paid_total: paid, due_total: Math.max(0, total - paid), payments: byStay[item.id] || [] };
    });
    const kpis = items.reduce((result, item) => ({ sold: result.sold + Number(item.lodging_total || 0), paid: result.paid + item.paid_total, due: result.due + item.due_total }), { sold: 0, paid: 0, due: 0 });
    return Response.json({ ok: true, items, kpis, period: { from, to }, search });
}
