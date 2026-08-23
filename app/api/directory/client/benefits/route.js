export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { requireQRPageAccess } from "@/app/modules/qr-page/lib/requireQRPageAccess";

function text(value, max = 2000) {
    return String(value ?? "").trim().slice(0, max);
}

function date(value) {
    const valueText = text(value, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(valueText) ? valueText : null;
}

async function context(businessId, pageId) {
    const [rows] = await db.query(`
        SELECT p.id page_id, l.id listing_id, sl.site_id
        FROM tags_qr_pages p
        INNER JOIN tags_directory_listings l ON l.qr_page_id=p.id AND l.business_id=p.business_id
        LEFT JOIN tags_directory_site_listings sl ON sl.listing_id=l.id
        WHERE p.id=? AND p.business_id=? AND p.page_type='directory'
        ORDER BY sl.id
        LIMIT 1
    `, [pageId, businessId]);
    return rows[0] || null;
}

async function paidAccess(businessId, session) {
    if (session?.role === "admin") return true;
    const [rows] = await db.query(`
        SELECT 1
        FROM tags_business_addons a
        WHERE a.business_id=? AND a.addon_code='directory' AND a.status='active'
          AND (a.expires_at IS NULL OR a.expires_at>=NOW())
          AND (
            COALESCE(a.amount,0)>0 OR EXISTS (
                SELECT 1 FROM tags_subscriptions s
                INNER JOIN tags_plans p ON p.id=s.plan_id
                WHERE s.business_id=a.business_id
                  AND s.status IN ('active','trial','past_due')
                  AND p.is_free=0
            )
          )
        LIMIT 1
    `, [businessId]);
    return Boolean(rows[0]);
}

function responseError(message, status = 400) {
    return Response.json({ ok: false, error: message }, { status });
}

function normalize(body) {
    const benefitType = ["amount", "percentage", "quantity"].includes(body?.benefitType) ? body.benefitType : "amount";
    const value = Number(body?.benefitValue);
    const validFrom = date(body?.validFrom);
    const validUntil = date(body?.validUntil);
    if (!text(body?.name, 190)) return { error: "El nombre del beneficio es obligatorio." };
    if (!Number.isFinite(value) || value < 0 || (benefitType === "percentage" && value > 100)) return { error: benefitType === "percentage" ? "El porcentaje debe estar entre 0 y 100." : "El monto del beneficio no es válido." };
    if (!validFrom || !validUntil || validUntil < validFrom) return { error: "La fecha de inicio y de fin no son válidas." };
    const promotionBuyQuantity = Number(body?.promotionBuyQuantity || 0);
    const promotionPayQuantity = Number(body?.promotionPayQuantity || 0);
    if (benefitType === "quantity" && (!Number.isInteger(promotionBuyQuantity) || !Number.isInteger(promotionPayQuantity) || promotionBuyQuantity < 2 || promotionPayQuantity < 1 || promotionPayQuantity >= promotionBuyQuantity)) return { error: "La promoción debe indicar cantidades válidas, por ejemplo 2x1 o 4x3." };
    return {
        name: text(body.name, 190),
        benefitType,
        value,
        promotionBuyQuantity: benefitType === "quantity" ? promotionBuyQuantity : null,
        promotionPayQuantity: benefitType === "quantity" ? promotionPayQuantity : null,
        promotionItem: text(body.promotionItem, 190) || null,
        validFrom,
        validUntil,
        description: text(body.description, 5000) || null,
        imageUrl: text(body.imageUrl, 2000) || null,
        visibility: body.visibility === "public" ? "public" : "private",
        isActive: body.isActive === false ? 0 : 1,
        sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0
    };
}

export async function GET(request) {
    try {
        const params = new URL(request.url).searchParams;
        const businessId = Number(params.get("businessId") || 0);
        const pageId = Number(params.get("pageId") || 0);
        if (!businessId || !pageId) return responseError("Faltan el negocio y la ficha.");
        const access = await requireQRPageAccess(businessId, { skipQRPageValidation: true });
        if (!access.ok) return responseError(access.error, access.status);
        if (!(await paidAccess(businessId, access.session))) return responseError("Beneficios está disponible para fichas de Directorio con plan pago.", 403);
        const item = await context(businessId, pageId);
        if (!item) return responseError("Ficha de Directorio no encontrada.", 404);
        const [benefits] = await db.query("SELECT * FROM tags_directory_benefits WHERE listing_id=? ORDER BY sort_order,id", [item.listing_id]);
        return Response.json({ ok: true, benefits, context: item });
    } catch (error) {
        console.error("DIRECTORY BENEFITS GET ERROR", error);
        return responseError(error?.code === "ER_NO_SUCH_TABLE" ? "Falta ejecutar la migración de Beneficios de Directorio." : "No se pudieron cargar los beneficios.", 500);
    }
}

export async function POST(request) {
    try {
        const body = await request.json().catch(() => null);
        const businessId = Number(body?.businessId || 0), pageId = Number(body?.pageId || 0);
        if (!body || !businessId || !pageId) return responseError("Solicitud incompleta.");
        const access = await requireQRPageAccess(businessId, { skipQRPageValidation: true });
        if (!access.ok) return responseError(access.error, access.status);
        if (!(await paidAccess(businessId, access.session))) return responseError("Beneficios está disponible para fichas de Directorio con plan pago.", 403);
        const item = await context(businessId, pageId);
        if (!item) return responseError("Ficha de Directorio no encontrada.", 404);
        const value = normalize(body);
        if (value.error) return responseError(value.error);
        const [result] = await db.query(`
            INSERT INTO tags_directory_benefits
                (business_id,site_id,listing_id,name,benefit_type,benefit_value,promotion_buy_quantity,promotion_pay_quantity,promotion_item,valid_from,valid_until,description,image_url,visibility,is_active,sort_order)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `, [businessId, item.site_id || null, item.listing_id, value.name, value.benefitType, value.value, value.promotionBuyQuantity, value.promotionPayQuantity, value.promotionItem, value.validFrom, value.validUntil, value.description, value.imageUrl, value.visibility, value.isActive, value.sortOrder]);
        return Response.json({ ok: true, id: result.insertId }, { status: 201 });
    } catch (error) {
        console.error("DIRECTORY BENEFITS POST ERROR", error);
        return responseError("No se pudo guardar el beneficio.", 500);
    }
}

export async function PATCH(request) {
    try {
        const body = await request.json().catch(() => null);
        const businessId = Number(body?.businessId || 0), pageId = Number(body?.pageId || 0), id = Number(body?.id || 0);
        if (!body || !businessId || !pageId || !id) return responseError("Solicitud incompleta.");
        const access = await requireQRPageAccess(businessId, { skipQRPageValidation: true });
        if (!access.ok) return responseError(access.error, access.status);
        if (!(await paidAccess(businessId, access.session))) return responseError("Beneficios está disponible para fichas de Directorio con plan pago.", 403);
        const item = await context(businessId, pageId);
        if (!item) return responseError("Ficha de Directorio no encontrada.", 404);
        const value = normalize(body);
        if (value.error) return responseError(value.error);
        const [result] = await db.query(`
            UPDATE tags_directory_benefits SET name=?,benefit_type=?,benefit_value=?,promotion_buy_quantity=?,promotion_pay_quantity=?,promotion_item=?,valid_from=?,valid_until=?,description=?,image_url=?,visibility=?,is_active=?,sort_order=?,updated_at=NOW()
            WHERE id=? AND business_id=? AND listing_id=?
        `, [value.name, value.benefitType, value.value, value.promotionBuyQuantity, value.promotionPayQuantity, value.promotionItem, value.validFrom, value.validUntil, value.description, value.imageUrl, value.visibility, value.isActive, value.sortOrder, id, businessId, item.listing_id]);
        if (!result.affectedRows) return responseError("Beneficio no encontrado.", 404);
        return Response.json({ ok: true });
    } catch (error) {
        console.error("DIRECTORY BENEFITS PATCH ERROR", error);
        return responseError("No se pudo actualizar el beneficio.", 500);
    }
}

export async function DELETE(request) {
    try {
        const body = await request.json().catch(() => null);
        const businessId = Number(body?.businessId || 0), pageId = Number(body?.pageId || 0), id = Number(body?.id || 0);
        if (!body || !businessId || !pageId || !id) return responseError("Solicitud incompleta.");
        const access = await requireQRPageAccess(businessId, { skipQRPageValidation: true });
        if (!access.ok) return responseError(access.error, access.status);
        if (!(await paidAccess(businessId, access.session))) return responseError("Beneficios está disponible para fichas de Directorio con plan pago.", 403);
        const item = await context(businessId, pageId);
        if (!item) return responseError("Ficha de Directorio no encontrada.", 404);
        const [result] = await db.query("DELETE FROM tags_directory_benefits WHERE id=? AND business_id=? AND listing_id=?", [id, businessId, item.listing_id]);
        if (!result.affectedRows) return responseError("Beneficio no encontrado.", 404);
        return Response.json({ ok: true });
    } catch (error) {
        console.error("DIRECTORY BENEFITS DELETE ERROR", error);
        return responseError("No se pudo eliminar el beneficio.", 500);
    }
}
