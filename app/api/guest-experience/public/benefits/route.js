export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getGuestPublicSession } from "@/app/modules/guest-experience/lib/getGuestPublicSession";
import { benefitError, createCouponCode, signCouponCode } from "@/app/modules/benefits/lib/benefitService";

function publicCoupon(item, origin) {
    const signature = signCouponCode(item.code);
    const status = item.status === "issued" && item.expires_at && new Date(item.expires_at) < new Date() ? "expired" : item.status;
    return { id: item.id, campaignId: item.campaign_id, code: item.code, status, issuedAt: item.issued_at, expiresAt: item.expires_at, redeemedAt: item.redeemed_at, signature, qrPayload: `${origin}/beneficios/validar?code=${encodeURIComponent(item.code)}&signature=${signature}` };
}

export async function GET(req) {
    try {
        const url = new URL(req.url), session = await getGuestPublicSession(url.searchParams.get("slug"));
        if (!session) return benefitError("La sesión venció o no es válida", 401);
        const [campaigns] = await db.query(`SELECT c.id,c.category_id,c.name,c.image_url,c.description,c.conditions_text,c.usage_instructions,c.benefit_type,c.benefit_value,c.valid_from,c.valid_until,c.limit_scope,c.max_issues,m.name merchant_name,l.name location_name,l.address,l.phone,l.whatsapp,l.latitude,l.longitude,bc.name category_name
            FROM tags_benefit_campaigns c INNER JOIN tags_benefit_merchants m ON m.id=c.merchant_id AND m.status='active'
            LEFT JOIN tags_benefit_locations l ON l.id=c.location_id AND l.is_active=1 LEFT JOIN tags_benefit_categories bc ON bc.id=c.category_id
            WHERE c.status='published' AND (c.valid_from IS NULL OR c.valid_from<=NOW()) AND (c.valid_until IS NULL OR c.valid_until>=NOW())
            AND (c.scope_type='global' OR c.guest_app_id=? OR EXISTS(SELECT 1 FROM tags_benefit_campaign_scopes cs WHERE cs.campaign_id=c.id AND (cs.scope_type='global' OR (cs.scope_type='guest_app' AND cs.scope_id=?))))
            ORDER BY bc.sort_order,bc.name,c.name`, [session.id, session.id]);
        const [coupons] = await db.query("SELECT * FROM tags_benefit_coupons WHERE guest_app_id=? AND stay_id=? AND guest_id=? ORDER BY issued_at DESC", [session.id, session.stay_id, session.guest_id]);
        const issued = coupons.reduce((map, item) => { (map[item.campaign_id] ||= []).push(publicCoupon(item, url.origin)); return map; }, {});
        return Response.json({ ok: true, categories: [...new Map(campaigns.filter(item => item.category_id).map(item => [item.category_id, { id: item.category_id, name: item.category_name }])).values()], campaigns: campaigns.map(item => ({ ...item, coupons: issued[item.id] || [] })) });
    } catch (error) { console.error("PUBLIC BENEFITS GET ERROR", error); return benefitError(error?.code === "ER_NO_SUCH_TABLE" ? "Beneficios todavía no está habilitado." : "No se pudieron cargar los beneficios", 500); }
}

export async function POST(req) {
    const body = await req.json().catch(() => null); if (!body) return benefitError("Cuerpo JSON inválido");
    const session = await getGuestPublicSession(body.slug); if (!session) return benefitError("La sesión venció o no es válida", 401);
    if (!["reserved", "active"].includes(session.stay_status)) return benefitError("La estadía no está habilitada para generar cupones", 409);
    const campaignId = Number(body.campaignId || 0), connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [rows] = await connection.query(`SELECT c.* FROM tags_benefit_campaigns c WHERE c.id=? AND c.status='published'
            AND (c.valid_from IS NULL OR c.valid_from<=NOW()) AND (c.valid_until IS NULL OR c.valid_until>=NOW())
            AND (c.scope_type='global' OR c.guest_app_id=? OR EXISTS(SELECT 1 FROM tags_benefit_campaign_scopes cs WHERE cs.campaign_id=c.id AND (cs.scope_type='global' OR (cs.scope_type='guest_app' AND cs.scope_id=?)))) LIMIT 1 FOR UPDATE`, [campaignId, session.id, session.id]);
        const campaign = rows[0]; if (!campaign) { await connection.rollback(); return benefitError("El beneficio no está disponible", 404); }
        let clause = "stay_id=?", owner = session.stay_id;
        if (campaign.limit_scope === "guest" || campaign.limit_scope === "user") { clause = "guest_id=?"; owner = session.guest_id; }
        const [counts] = await connection.query(`SELECT COUNT(*) total FROM tags_benefit_coupons WHERE campaign_id=? AND ${clause} AND status NOT IN ('cancelled','expired')`, [campaignId, owner]);
        if (Number(counts[0].total) >= Number(campaign.max_issues || 1)) { await connection.rollback(); return benefitError("Ya utilizaste la cantidad disponible para este beneficio", 409, "LIMIT_REACHED"); }
        const code = createCouponCode(), campaignExpiry = campaign.valid_until ? new Date(campaign.valid_until) : null, stayExpiry = new Date(session.ends_at), expiresAt = campaignExpiry && campaignExpiry < stayExpiry ? campaignExpiry : stayExpiry, signature = signCouponCode(code);
        const [result] = await connection.query("INSERT INTO tags_benefit_coupons (campaign_id,code,signature_hash,guest_app_id,stay_id,guest_id,status,expires_at) VALUES (?,?,?,?,?,?,'issued',?)", [campaignId, code, signature, session.id, session.stay_id, session.guest_id, expiresAt]);
        await connection.query("INSERT INTO tags_benefit_audit_log (merchant_id,campaign_id,coupon_id,actor_type,actor_id,action,metadata_json,ip_address) VALUES (?,?,?,'guest',?,'coupon.issued',?,?)", [campaign.merchant_id, campaignId, result.insertId, session.guest_id, JSON.stringify({ stayId: session.stay_id }), req.headers.get("x-forwarded-for")?.split(",")[0] || null]);
        await connection.commit();
        return Response.json({ ok: true, coupon: publicCoupon({ id: result.insertId, campaign_id: campaignId, code, status: "issued", issued_at: new Date(), expires_at: expiresAt }, new URL(req.url).origin) }, { status: 201 });
    } catch (error) { await connection.rollback(); console.error("PUBLIC BENEFIT ISSUE ERROR", error); return benefitError("No se pudo generar el cupón", 500); } finally { connection.release(); }
}
