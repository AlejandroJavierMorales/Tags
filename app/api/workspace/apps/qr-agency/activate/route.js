export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getQrAgencyAdminAccess, qrAgencyAdminError } from "@/app/modules/qr-agency/lib/getQrAgencyAdminAccess";

function slugify(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 100);
}

export async function POST(req) {
    const body = await req.json().catch(() => null);
    const businessId = Number(body?.businessId || 0);
    const tierCode = String(body?.tierCode || "").trim().toLowerCase();
    if (!businessId) return Response.json({ ok: false, error: "Cliente inválido" }, { status: 400 });

    const access = await getQrAgencyAdminAccess(businessId);
    if (!access.allowed) return qrAgencyAdminError(access);

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const [businessRows] = await conn.query(
            `SELECT b.id,b.name,b.display_name,b.plan_id,p.code plan_code,p.name plan_name
             FROM tags_businesses b
             LEFT JOIN tags_plans p ON p.id=b.plan_id
             WHERE b.id=? LIMIT 1 FOR UPDATE`,
            [businessId]
        );
        const business = businessRows[0];
        if (!business) {
            await conn.rollback();
            return Response.json({ ok: false, error: "Cliente no encontrado" }, { status: 404 });
        }

        const [addonRows] = await conn.query(
            `SELECT id FROM tags_business_addons
             WHERE business_id=? AND addon_code='qr_agency' AND status='active'
             AND (expires_at IS NULL OR expires_at>=NOW()) LIMIT 1 FOR UPDATE`,
            [businessId]
        );
        if (!addonRows.length) {
            await conn.rollback();
            return Response.json({ ok: false, error: "El cliente no tiene Tags QR Agency activo" }, { status: 403 });
        }

        const [existingRows] = await conn.query("SELECT * FROM tags_qr_agencies WHERE business_id=? LIMIT 1 FOR UPDATE", [businessId]);
        if (existingRows.length) {
            await conn.commit();
            return Response.json({ ok: true, agency: existingRows[0], alreadyExists: true });
        }

        const [tierRows] = await conn.query(
            `SELECT * FROM tags_qr_agency_tiers
             WHERE code=? AND is_active=1 LIMIT 1`,
            [tierCode]
        );
        if (!tierRows.length) {
            await conn.rollback();
            return Response.json({ ok: false, error: "Seleccioná una modalidad de Agencia válida" }, { status: 400 });
        }
        const tier = tierRows[0];

        const [productRows] = await conn.query(
            `SELECT p.id FROM tags_products p
             INNER JOIN tags_supports s ON s.id=p.support_id AND s.is_digital=1
             INNER JOIN tags_qr_types qt ON qt.id=p.qr_type_id AND qt.code='digital'
             WHERE p.is_digital=1 ORDER BY p.id LIMIT 1`
        );
        if (!productRows.length) throw new Error("No se encontró un producto QR digital configurado");

        const requested = slugify(body?.slug);
        const base = requested || slugify(business.display_name || business.name) || `agencia-${businessId}`;
        let slug = base;
        const [slugRows] = await conn.query("SELECT id FROM tags_qr_agencies WHERE slug=? LIMIT 1", [slug]);
        if (slugRows.length) slug = `${base}-${businessId}`;

        const [result] = await conn.query(
            `INSERT INTO tags_qr_agencies
             (business_id,digital_product_id,tier_id,slug,status,qr_limit,settings_json,created_at,updated_at)
             VALUES (?,?,?,?,'active',?,JSON_OBJECT(),NOW(),NOW())`,
            [businessId, productRows[0].id, tier.id, slug, Number(tier.hard_limit_qrs)]
        );

        await conn.query(
            `UPDATE tags_business_addons
             SET quantity=?,amount=?,currency=?,notes=?,updated_at=NOW()
             WHERE id=?`,
            [Number(tier.hard_limit_qrs), Number(tier.base_price), tier.currency, `Modalidad ${tier.name}`, addonRows[0].id]
        );

        await conn.query(
            `INSERT INTO tags_qr_agency_audit_log
             (agency_id,actor_type,actor_id,action,after_json,created_at)
             VALUES (?,?,?,?,?,NOW())`,
            [result.insertId, access.session.role === "admin" ? "platform" : "agency", String(access.session.id || access.session.email || ""), "agency_activated", JSON.stringify({ slug, qrLimit: Number(tier.hard_limit_qrs), tierCode: tier.code, basePlanCode: business.plan_code })]
        );

        await conn.commit();
        return Response.json({ ok: true, agencyId: result.insertId, slug, qrLimit: Number(tier.hard_limit_qrs), tierCode: tier.code });
    } catch (error) {
        await conn.rollback();
        console.error("QR AGENCY ACTIVATE ERROR:", error);
        return Response.json({ ok: false, error: error.message || "No se pudo activar QR Agency" }, { status: 500 });
    } finally {
        conn.release();
    }
}
