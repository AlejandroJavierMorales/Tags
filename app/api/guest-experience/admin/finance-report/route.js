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
    const from = query.get("from"), to = query.get("to"), useDateRange = query.get("useDateRange") !== "false";
    const search = String(query.get("search") || "").trim();
    const documentSearch = search.replace(/\D/g, "");
    const access = await getGuestAdminAccess({ businessId, guestAppId, permission: "guest.accounts.view" });
    if (!access.allowed) return guestAdminAccessResponse(access);
    if (useDateRange && (!validDate(from) || !validDate(to) || from > to)) return guestError("El período no es válido");

    const [rows] = await db.query(`
        SELECT s.id,s.stay_code,s.status,s.starts_at,s.ends_at,s.adults,s.children,s.nightly_rate,s.lodging_total,
               s.deposit_required_amount,g.name guest_name,g.document_number,
               (SELECT pc.status FROM tags_guest_precheckins pc WHERE pc.stay_id=s.id LIMIT 1) precheckin_status,
               COALESCE((SELECT SUM(p.amount) FROM tags_guest_accounts ac INNER JOIN tags_guest_payments p ON p.account_id=ac.id WHERE ac.stay_id=s.id),0) paid_total
          FROM tags_guest_stays s
          INNER JOIN tags_guest_people g ON g.id=s.primary_guest_id
         WHERE s.guest_app_id=? ${useDateRange ? "AND DATE(s.starts_at)>=? AND DATE(s.starts_at)<=?" : ""} AND s.status<>'cancelled'
           AND (?='' OR s.stay_code LIKE CONCAT('%',?,'%') OR g.name LIKE CONCAT('%',?,'%')
                OR (?<>'' AND REPLACE(REPLACE(REPLACE(g.document_number,'.',''),'-',''),' ','') LIKE CONCAT('%',?,'%')))
         ORDER BY s.starts_at,s.stay_code`,
        [guestAppId, ...(useDateRange ? [from, to] : []), search, search, search, documentSearch, documentSearch]
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
    let statistics = null;
    if (useDateRange) {
        const [units] = await db.query("SELECT id,name FROM tags_guest_units WHERE guest_app_id=? AND is_active=1 ORDER BY sort_order,name", [guestAppId]);
        const [occupancyRows] = await db.query(`SELECT s.unit_id,DATE(s.starts_at) stay_start,DATE(s.ends_at) stay_end,GREATEST(DATE(s.starts_at),?) clipped_start,LEAST(DATE(s.ends_at),?) clipped_end,s.lodging_total FROM tags_guest_stays s WHERE s.guest_app_id=? AND s.status NOT IN ('cancelled','no_show_rebooking') AND DATE(s.starts_at)<? AND DATE(s.ends_at)>?`, [from,to,guestAppId,to,from]);
        const periodDays = Math.max(0, Math.round((new Date(`${to}T12:00:00`) - new Date(`${from}T12:00:00`)) / 86400000)), byUnit = new Map(units.map(unit => [Number(unit.id), { unitId: unit.id, name: unit.name, nights: 0, sold: 0 }]));
        for (const row of occupancyRows) { const nights = Math.max(0, Math.round((new Date(row.clipped_end) - new Date(row.clipped_start)) / 86400000)), stayNights = Math.max(1, Math.round((new Date(row.stay_end) - new Date(row.stay_start)) / 86400000)), target = byUnit.get(Number(row.unit_id)); if (target) { target.nights += nights; target.sold += Number(row.lodging_total || 0) / stayNights * nights; } }
        const unitStats = [...byUnit.values()].map(unit => ({ ...unit, averageRate: unit.nights ? unit.sold / unit.nights : 0 })), occupiedNights = unitStats.reduce((sum, unit) => sum + unit.nights, 0), totalSold = unitStats.reduce((sum, unit) => sum + unit.sold, 0);
        const availableNights = units.length * periodDays;
        statistics = { periodDays, activeUnits: units.length, availableNights, occupiedNights, occupancyPercentage: availableNights ? occupiedNights / availableNights * 100 : 0, averageStayNights: occupancyRows.length ? occupiedNights / occupancyRows.length : 0, totalSold, units: unitStats };
    }
    return Response.json({ ok: true, items, kpis, statistics, period: useDateRange ? { from, to } : null, search, useDateRange });
}
