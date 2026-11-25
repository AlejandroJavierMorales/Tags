export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getGuestAdminAccess, guestAdminAccessResponse } from "@/app/modules/guest-experience/lib/getGuestAdminAccess";

const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]));
const money = value => `$ ${Number(value || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = value => new Date(value).toLocaleDateString("es-AR");
const status = value => value === "active" ? "En curso" : value === "checked_out" ? "Concluida" : value === "no_show_rebooking" ? "Pendiente de reprogramación" : "Pendiente";

export async function GET(req) {
    const query = new URL(req.url).searchParams;
    const businessId = Number(query.get("businessId") || 0), guestAppId = Number(query.get("guestAppId") || 0);
    const from = query.get("from"), to = query.get("to"), useDateRange = query.get("useDateRange") !== "false", search = String(query.get("search") || "").trim(), documentSearch = search.replace(/\D/g, "");
    const access = await getGuestAdminAccess({ businessId, guestAppId, permission: "guest.accounts.view" });
    if (!access.allowed) return guestAdminAccessResponse(access);
    if (useDateRange && (!validDate(from) || !validDate(to) || from > to)) return new Response("Período inválido", { status: 400 });

    const [[app], [rows]] = await Promise.all([
        db.query("SELECT name,logo_url FROM tags_guest_apps WHERE id=? AND business_id=? LIMIT 1", [guestAppId, businessId]),
        db.query(`SELECT s.stay_code,s.status,s.starts_at,s.ends_at,s.adults,s.children,s.nightly_rate,s.lodging_total,g.name guest_name,COALESCE((SELECT SUM(p.amount) FROM tags_guest_accounts ac INNER JOIN tags_guest_payments p ON p.account_id=ac.id WHERE ac.stay_id=s.id),0) paid_total FROM tags_guest_stays s INNER JOIN tags_guest_people g ON g.id=s.primary_guest_id WHERE s.guest_app_id=? ${useDateRange ? "AND DATE(s.starts_at)>=? AND DATE(s.starts_at)<=?" : ""} AND s.status<>'cancelled' AND (?='' OR s.stay_code LIKE CONCAT('%',?,'%') OR g.name LIKE CONCAT('%',?,'%') OR (?<>'' AND REPLACE(REPLACE(REPLACE(g.document_number,'.',''),'-',''),' ','') LIKE CONCAT('%',?,'%'))) ORDER BY s.starts_at,s.stay_code`, [guestAppId, ...(useDateRange ? [from, to] : []), search, search, search, documentSearch, documentSearch])
    ]);
    const establishment = app[0];
    if (!establishment) return new Response("Establecimiento no encontrado", { status: 404 });
    const items = rows.map(item => ({ ...item, nights: Math.max(1, Math.round((new Date(item.ends_at) - new Date(item.starts_at)) / 86400000)), passengers: Number(item.adults || 0) + Number(item.children || 0), due: Math.max(0, Number(item.lodging_total || 0) - Number(item.paid_total || 0)) }));
    const totals = items.reduce((sum, item) => ({ sold: sum.sold + Number(item.lodging_total || 0), paid: sum.paid + Number(item.paid_total || 0), due: sum.due + item.due }), { sold: 0, paid: 0, due: 0 });
    const perPage = 18, totalPages = Math.max(1, Math.ceil(items.length / perPage));
    const period = useDateRange ? `${date(`${from}T12:00:00`)} al ${date(`${to}T12:00:00`)}` : "Todas las fechas";
    const pages = Array.from({ length: totalPages }, (_, index) => {
        const pageItems = items.slice(index * perPage, (index + 1) * perPage);
        return `<section class="page"><header>${establishment.logo_url ? `<img src="${escapeHtml(establishment.logo_url)}" alt="">` : ""}<div><small>MI ESTADÍA · REPORTE</small><h1>${escapeHtml(establishment.name)}</h1><p>Estadías y pagos · ${escapeHtml(period)}${search ? ` · Búsqueda: ${escapeHtml(search)}` : ""}</p></div></header><div class="summary"><div><span>Vendido</span><b>${money(totals.sold)}</b></div><div><span>Cobrado</span><b>${money(totals.paid)}</b></div><div><span>Adeudado</span><b>${money(totals.due)}</b></div></div><table><thead><tr><th>Reserva</th><th>Cliente</th><th>Ingreso</th><th>Egreso</th><th>Pas.</th><th>Noches</th><th>Total</th><th>Pagado</th><th>Adeudado</th><th>Estado</th></tr></thead><tbody>${pageItems.map(item => `<tr><td><b>${escapeHtml(item.stay_code)}</b></td><td>${escapeHtml(item.guest_name)}</td><td>${date(item.starts_at)}</td><td>${date(item.ends_at)}</td><td>${item.passengers}</td><td>${item.nights}</td><td>${money(item.lodging_total)}</td><td>${money(item.paid_total)}</td><td>${money(item.due)}</td><td>${escapeHtml(status(item.status))}</td></tr>`).join("") || `<tr><td colspan="10" class="empty">No hay estadías para los filtros seleccionados.</td></tr>`}</tbody></table><footer><span>Generado el ${new Date().toLocaleString("es-AR")}</span><b>Página ${index + 1} de ${totalPages}</b></footer></section>`;
    }).join("");
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Reporte · ${escapeHtml(establishment.name)}</title><style>@page{size:A4 landscape;margin:0}*{box-sizing:border-box}body{margin:0;background:#dfe5e1;color:#1d3026;font:11px Arial,sans-serif}.toolbar{position:sticky;top:0;z-index:2;padding:10px;text-align:center;background:#213c2f}.toolbar button{padding:10px 18px;border:0;border-radius:8px;background:#fff;color:#214634;font-weight:700;cursor:pointer}.page{position:relative;width:297mm;min-height:210mm;margin:10px auto;padding:12mm 10mm 14mm;background:#fff;page-break-after:always}.page:last-child{page-break-after:auto}header{display:flex;align-items:center;gap:14px;border-bottom:2px solid #2d7b52;padding-bottom:9px}header img{width:34mm;height:18mm;object-fit:contain}header small{color:#2d7b52;font-weight:800;letter-spacing:1.2px}h1{margin:3px 0;font-size:22px}header p{margin:0;color:#607068}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:9px 0}.summary div{display:flex;justify-content:space-between;padding:8px 10px;border-radius:7px;background:#eef5f1}.summary span{color:#5e7066}.summary b{font-size:13px}table{width:100%;border-collapse:collapse}th{padding:7px 5px;background:#e2eee7;text-align:left;font-size:9px;text-transform:uppercase}td{padding:7px 5px;border-bottom:1px solid #e5ebe7}tbody tr:nth-child(even){background:#fafcfb}td:nth-child(n+5):nth-child(-n+9){text-align:right}.empty{padding:30px;text-align:center}footer{position:absolute;right:10mm;bottom:7mm;left:10mm;display:flex;justify-content:space-between;padding-top:5px;border-top:1px solid #dce5df;color:#64736b}@media print{body{background:#fff}.toolbar{display:none}.page{margin:0;box-shadow:none}}</style></head><body><div class="toolbar"><button onclick="window.print()">Imprimir / Guardar como PDF</button></div>${pages}</body></html>`;
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" } });
}
