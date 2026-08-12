export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getQrAgencyAdminAccess, qrAgencyAdminError } from "@/app/modules/qr-agency/lib/getQrAgencyAdminAccess";

function cleanSlug(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);
}

export async function GET(req) {
    const businessId = Number(new URL(req.url).searchParams.get("businessId") || 0);
    const access = await getQrAgencyAdminAccess(businessId);
    if (!access.allowed) return qrAgencyAdminError(access);

    const [businessRows] = await db.query(
        `SELECT b.id,b.name,b.display_name,b.logo_url,b.plan_id,p.code plan_code,p.name plan_name,p.price,p.currency
         FROM tags_businesses b
         LEFT JOIN tags_plans p ON p.id=b.plan_id
         WHERE b.id=? LIMIT 1`,
        [businessId]
    );
    if (!businessRows.length) return Response.json({ ok: false, error: "Cliente no encontrado" }, { status: 404 });

    const [addonRows] = await db.query(
        `SELECT id,status,expires_at FROM tags_business_addons
         WHERE business_id=? AND addon_code='qr_agency' AND status='active'
         AND (expires_at IS NULL OR expires_at>=NOW()) LIMIT 1`,
        [businessId]
    );
    const [agencyRows] = await db.query(
        `SELECT a.*,t.code tier_code,t.name tier_name,t.included_qrs,t.hard_limit_qrs,t.base_price,t.additional_unit_price,t.billing_mode,
                (SELECT COUNT(*) FROM tags_qr_agency_customers c WHERE c.agency_id=a.id AND c.status='active') customer_count,
                (SELECT COUNT(*) FROM tags_qr_agency_assignments x WHERE x.agency_id=a.id AND x.status IN ('active','paused')) used_qrs
         FROM tags_qr_agencies a
         LEFT JOIN tags_qr_agency_tiers t ON t.id=a.tier_id
         WHERE a.business_id=? LIMIT 1`,
        [businessId]
    );

    const [tiers] = await db.query(
        `SELECT code,name,included_qrs,hard_limit_qrs,base_price,additional_unit_price,currency,billing_mode
         FROM tags_qr_agency_tiers WHERE is_active=1 ORDER BY sort_order,id`
    );

    return Response.json({ ok: true, business: businessRows[0], addonActive: addonRows.length > 0, agency: agencyRows[0] || null, tiers });
}

export async function PATCH(req) {
    const body = await req.json().catch(() => null);
    const businessId = Number(body?.businessId || 0);
    const slug = cleanSlug(body?.slug);
    if (!businessId || !slug) return Response.json({ ok: false, error: "La ruta es obligatoria" }, { status: 400 });
    const access = await getQrAgencyAdminAccess(businessId);
    if (!access.allowed) return qrAgencyAdminError(access);

    try {
        const [agencyRows] = await db.query("SELECT id,slug FROM tags_qr_agencies WHERE business_id=? LIMIT 1", [businessId]);
        if (!agencyRows.length) return Response.json({ ok: false, error: "QR Agency todavía no está activado" }, { status: 404 });
        const [duplicate] = await db.query("SELECT id FROM tags_qr_agencies WHERE slug=? AND id<>? LIMIT 1", [slug, agencyRows[0].id]);
        if (duplicate.length) return Response.json({ ok: false, error: "La ruta ya está siendo utilizada" }, { status: 409 });

        await db.query("UPDATE tags_qr_agencies SET slug=?,updated_at=NOW() WHERE id=?", [slug, agencyRows[0].id]);
        await db.query(
            `INSERT INTO tags_qr_agency_audit_log
             (agency_id,actor_type,actor_id,action,before_json,after_json,created_at)
             VALUES (?,?,?,?,?,?,NOW())`,
            [agencyRows[0].id, access.session.role === "admin" ? "platform" : "agency", String(access.session.id || access.session.email || ""), "agency_slug_changed", JSON.stringify({ slug: agencyRows[0].slug }), JSON.stringify({ slug })]
        );
        return Response.json({ ok: true, slug });
    } catch (error) {
        console.error("QR AGENCY SETTINGS ERROR:", error);
        return Response.json({ ok: false, error: "No se pudo guardar la configuración" }, { status: 500 });
    }
}
