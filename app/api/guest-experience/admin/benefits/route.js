export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getGuestAdminAccess, guestAdminAccessResponse } from "@/app/modules/guest-experience/lib/getGuestAdminAccess";
import { benefitError, cleanBenefitText, normalizeWhatsapp, validDateOrNull } from "@/app/modules/benefits/lib/benefitService";

async function accessFrom(source) {
    const businessId = Number(source.businessId || 0), guestAppId = Number(source.guestAppId || 0);
    const access = await getGuestAdminAccess({ businessId, guestAppId });
    return { businessId, guestAppId, access };
}
async function ownsMerchant(merchantId, businessId) {
    const [rows] = await db.query("SELECT id FROM tags_benefit_merchants WHERE id=? AND (created_by_business_id=? OR business_id=?) LIMIT 1", [merchantId, businessId, businessId]);
    return Boolean(rows[0]);
}
function active(value) { return value === false ? 0 : 1; }

export async function GET(req) {
    try {
        const params = Object.fromEntries(new URL(req.url).searchParams), { businessId, guestAppId, access } = await accessFrom(params);
        if (!access.allowed) return guestAdminAccessResponse(access);
        const [categories] = await db.query("SELECT * FROM tags_benefit_categories WHERE guest_app_id=? AND issuer_business_id=? ORDER BY sort_order,name", [guestAppId, businessId]);
        const [campaigns] = await db.query(`SELECT c.*,m.name merchant_name,l.name location_name,bc.name category_name
            FROM tags_benefit_campaigns c INNER JOIN tags_benefit_merchants m ON m.id=c.merchant_id
            LEFT JOIN tags_benefit_locations l ON l.id=c.location_id LEFT JOIN tags_benefit_categories bc ON bc.id=c.category_id
            WHERE c.issuer_business_id=? AND c.guest_app_id=? ORDER BY c.created_at DESC`, [businessId, guestAppId]);
        const [coupons] = await db.query(`SELECT cp.id,cp.campaign_id,cp.code,cp.status,cp.issued_at,cp.expires_at,cp.redeemed_at,ca.name benefit_name,m.name merchant_name,g.name guest_name,s.stay_code,r.staff_id,r.redeemed_at redemption_date,st.name redeemed_by
            FROM tags_benefit_coupons cp INNER JOIN tags_benefit_campaigns ca ON ca.id=cp.campaign_id AND ca.issuer_business_id=? AND ca.guest_app_id=?
            INNER JOIN tags_benefit_merchants m ON m.id=ca.merchant_id LEFT JOIN tags_guest_people g ON g.id=cp.guest_id LEFT JOIN tags_guest_stays s ON s.id=cp.stay_id
            LEFT JOIN tags_benefit_redemptions r ON r.coupon_id=cp.id AND r.status='confirmed' LEFT JOIN tags_benefit_staff st ON st.id=r.staff_id ORDER BY cp.issued_at DESC LIMIT 500`, [businessId, guestAppId]);
        const [merchants] = await db.query("SELECT * FROM tags_benefit_merchants WHERE created_by_business_id=? OR business_id=? ORDER BY name", [businessId, businessId]);
        const merchantIds = merchants.map(item => item.id);
        let locations = [], staff = [];
        if (merchantIds.length) {
            const marks = merchantIds.map(() => "?").join(",");
            [locations] = await db.query(`SELECT * FROM tags_benefit_locations WHERE merchant_id IN (${marks}) ORDER BY name`, merchantIds);
            [staff] = await db.query(`SELECT id,merchant_id,location_id,name,email,status,created_at FROM tags_benefit_staff WHERE merchant_id IN (${marks}) ORDER BY name`, merchantIds);
        }
        return Response.json({ ok: true, categories, merchants, locations, staff, campaigns, coupons });
    } catch (error) {
        console.error("BENEFITS ADMIN GET ERROR", error);
        return benefitError(error?.code === "ER_NO_SUCH_TABLE" ? "Falta ejecutar la migración del módulo Beneficios." : "No se pudo cargar Beneficios.", 500);
    }
}

export async function POST(req) {
    try {
        const body = await req.json().catch(() => null); if (!body) return benefitError("Cuerpo JSON inválido");
        const { businessId, guestAppId, access } = await accessFrom(body); if (!access.allowed) return guestAdminAccessResponse(access);
        const entity = body.entity;
        if (entity === "category") {
            const name = cleanBenefitText(body.name, 120); if (!name) return benefitError("El nombre de la categoría es obligatorio");
            const [result] = await db.query("INSERT INTO tags_benefit_categories (issuer_business_id,guest_app_id,name,icon_code,sort_order,is_active) VALUES (?,?,?,?,?,?)", [businessId, guestAppId, name, cleanBenefitText(body.iconCode, 60) || null, Number(body.sortOrder || 0), active(body.isActive)]);
            return Response.json({ ok: true, id: result.insertId }, { status: 201 });
        }
        if (entity === "merchant") {
            const name = cleanBenefitText(body.name, 190), email = cleanBenefitText(body.email, 190).toLowerCase(); if (!name) return benefitError("El nombre del comercio es obligatorio");
            const [result] = await db.query("INSERT INTO tags_benefit_merchants (created_by_business_id,name,tax_id,email,phone,status) VALUES (?,?,?,?,?,'active')", [businessId, name, cleanBenefitText(body.taxId, 40) || null, email || null, cleanBenefitText(body.phone, 60) || null]);
            return Response.json({ ok: true, id: result.insertId }, { status: 201 });
        }
        const merchantId = Number(body.merchantId || 0); if (!merchantId || !(await ownsMerchant(merchantId, businessId))) return benefitError("Comercio no encontrado", 404);
        if (entity === "location") {
            const name = cleanBenefitText(body.name, 190); if (!name) return benefitError("El nombre de la sucursal es obligatorio");
            const latitude = body.latitude === "" ? null : Number(body.latitude), longitude = body.longitude === "" ? null : Number(body.longitude);
            if ((latitude !== null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) || (longitude !== null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180))) return benefitError("Coordenadas inválidas");
            const [result] = await db.query("INSERT INTO tags_benefit_locations (merchant_id,name,address,latitude,longitude,phone,whatsapp,is_active) VALUES (?,?,?,?,?,?,?,?)", [merchantId, name, cleanBenefitText(body.address, 500) || null, latitude, longitude, cleanBenefitText(body.phone, 60) || null, normalizeWhatsapp(body.whatsapp) || null, active(body.isActive)]);
            return Response.json({ ok: true, id: result.insertId }, { status: 201 });
        }
        if (entity === "staff") {
            const name = cleanBenefitText(body.name, 190), email = cleanBenefitText(body.email, 190).toLowerCase(); if (!name || !/^\S+@\S+\.\S+$/.test(email)) return benefitError("Nombre y email válido son obligatorios");
            const [result] = await db.query("INSERT INTO tags_benefit_staff (merchant_id,location_id,name,email,status) VALUES (?,?,?,?,'active')", [merchantId, Number(body.locationId || 0) || null, name, email]);
            return Response.json({ ok: true, id: result.insertId }, { status: 201 });
        }
        if (entity === "campaign") {
            const name = cleanBenefitText(body.name, 190), from = validDateOrNull(body.validFrom), until = validDateOrNull(body.validUntil);
            if (!name) return benefitError("El nombre del beneficio es obligatorio"); if (from === false || until === false || (from && until && from >= until)) return benefitError("Revisá la vigencia del beneficio");
            const status = ["draft", "published", "archived"].includes(body.status) ? body.status : "draft", limitScope = ["stay", "guest", "user"].includes(body.limitScope) ? body.limitScope : "stay";
            const [result] = await db.query(`INSERT INTO tags_benefit_campaigns (merchant_id,location_id,category_id,issuer_type,issuer_business_id,guest_app_id,name,image_url,description,conditions_text,usage_instructions,benefit_type,benefit_value,valid_from,valid_until,limit_scope,max_issues,scope_type,status)
                VALUES (?,?,?,'business',?,?,?,?,?,?,?,?,?,?,?,?,?,'guest_app',?)`, [merchantId, Number(body.locationId || 0) || null, Number(body.categoryId || 0) || null, businessId, guestAppId, name, cleanBenefitText(body.imageUrl, 2000) || null, cleanBenefitText(body.description, 1000) || null, cleanBenefitText(body.conditionsText, 5000) || null, cleanBenefitText(body.usageInstructions, 1000) || null, cleanBenefitText(body.benefitType, 40) || "custom", body.benefitValue === "" ? null : Number(body.benefitValue), from, until, limitScope, Math.max(1, Number(body.maxIssues || 1)), status]);
            await db.query("INSERT INTO tags_benefit_campaign_scopes (campaign_id,scope_type,scope_id) VALUES (?,'guest_app',?)", [result.insertId, guestAppId]);
            return Response.json({ ok: true, id: result.insertId }, { status: 201 });
        }
        return benefitError("Entidad no válida");
    } catch (error) {
        console.error("BENEFITS ADMIN POST ERROR", error);
        if (error?.code === "ER_DUP_ENTRY") return benefitError("Ya existe un registro con esos datos", 409);
        return benefitError("No se pudo guardar el registro", 500);
    }
}

export async function PATCH(req) {
    try {
        const body = await req.json().catch(() => null); if (!body) return benefitError("Cuerpo JSON inválido");
        const { businessId, guestAppId, access } = await accessFrom(body); if (!access.allowed) return guestAdminAccessResponse(access);
        const id = Number(body.id || 0), entity = body.entity; if (!id) return benefitError("Registro inválido");
        if (entity === "category") { const [result] = await db.query("UPDATE tags_benefit_categories SET name=?,icon_code=?,sort_order=?,is_active=? WHERE id=? AND issuer_business_id=? AND guest_app_id=?", [cleanBenefitText(body.name, 120), cleanBenefitText(body.iconCode, 60) || null, Number(body.sortOrder || 0), active(body.isActive), id, businessId, guestAppId]); if (!result.affectedRows) return benefitError("Categoría no encontrada", 404); return Response.json({ ok: true }); }
        if (entity === "merchant") { if (!(await ownsMerchant(id, businessId))) return benefitError("Comercio no encontrado", 404); await db.query("UPDATE tags_benefit_merchants SET name=?,tax_id=?,email=?,phone=?,status=? WHERE id=?", [cleanBenefitText(body.name, 190), cleanBenefitText(body.taxId, 40) || null, cleanBenefitText(body.email, 190).toLowerCase() || null, cleanBenefitText(body.phone, 60) || null, body.isActive === false ? "inactive" : "active", id]); return Response.json({ ok: true }); }
        if (entity === "campaign") {
            const [owned] = await db.query("SELECT id,merchant_id FROM tags_benefit_campaigns WHERE id=? AND issuer_business_id=? AND guest_app_id=? LIMIT 1", [id, businessId, guestAppId]); if (!owned[0]) return benefitError("Beneficio no encontrado", 404);
            const merchantId = Number(body.merchantId || 0); if (!(await ownsMerchant(merchantId, businessId))) return benefitError("Comercio no encontrado", 404);
            const from = validDateOrNull(body.validFrom), until = validDateOrNull(body.validUntil); if (from === false || until === false || (from && until && from >= until)) return benefitError("Revisá la vigencia");
            await db.query(`UPDATE tags_benefit_campaigns SET merchant_id=?,location_id=?,category_id=?,name=?,image_url=?,description=?,conditions_text=?,usage_instructions=?,benefit_type=?,benefit_value=?,valid_from=?,valid_until=?,limit_scope=?,max_issues=?,status=? WHERE id=? AND issuer_business_id=? AND guest_app_id=?`, [merchantId, Number(body.locationId || 0) || null, Number(body.categoryId || 0) || null, cleanBenefitText(body.name, 190), cleanBenefitText(body.imageUrl, 2000) || null, cleanBenefitText(body.description, 1000) || null, cleanBenefitText(body.conditionsText, 5000) || null, cleanBenefitText(body.usageInstructions, 1000) || null, cleanBenefitText(body.benefitType, 40) || "custom", body.benefitValue === "" ? null : Number(body.benefitValue), from, until, ["stay", "guest", "user"].includes(body.limitScope) ? body.limitScope : "stay", Math.max(1, Number(body.maxIssues || 1)), ["draft", "published", "archived"].includes(body.status) ? body.status : "draft", id, businessId, guestAppId]);
            return Response.json({ ok: true });
        }
        const merchantId = Number(body.merchantId || 0); if (!(await ownsMerchant(merchantId, businessId))) return benefitError("Comercio no encontrado", 404);
        if (entity === "location") { await db.query("UPDATE tags_benefit_locations SET name=?,address=?,latitude=?,longitude=?,phone=?,whatsapp=?,is_active=? WHERE id=? AND merchant_id=?", [cleanBenefitText(body.name, 190), cleanBenefitText(body.address, 500) || null, body.latitude === "" ? null : Number(body.latitude), body.longitude === "" ? null : Number(body.longitude), cleanBenefitText(body.phone, 60) || null, normalizeWhatsapp(body.whatsapp) || null, active(body.isActive), id, merchantId]); return Response.json({ ok: true }); }
        if (entity === "staff") { await db.query("UPDATE tags_benefit_staff SET location_id=?,name=?,email=?,status=? WHERE id=? AND merchant_id=?", [Number(body.locationId || 0) || null, cleanBenefitText(body.name, 190), cleanBenefitText(body.email, 190).toLowerCase(), body.isActive === false ? "inactive" : "active", id, merchantId]); return Response.json({ ok: true }); }
        return benefitError("Entidad no válida");
    } catch (error) { console.error("BENEFITS ADMIN PATCH ERROR", error); return benefitError(error?.code === "ER_DUP_ENTRY" ? "Ya existe un registro con esos datos" : "No se pudo actualizar", error?.code === "ER_DUP_ENTRY" ? 409 : 500); }
}

export async function DELETE(req) {
    const body = await req.json().catch(() => null); if (!body) return benefitError("Cuerpo JSON inválido");
    const { businessId, guestAppId, access } = await accessFrom(body); if (!access.allowed) return guestAdminAccessResponse(access);
    const id = Number(body.id || 0), entity = body.entity;
    try {
        if (entity === "campaign") { const [coupons] = await db.query("SELECT COUNT(*) total FROM tags_benefit_coupons WHERE campaign_id=?", [id]); if (Number(coupons[0].total)) return benefitError("El beneficio ya tiene cupones emitidos; archivarlo conserva el historial", 409); await db.query("DELETE FROM tags_benefit_campaign_scopes WHERE campaign_id=?", [id]); const [result] = await db.query("DELETE FROM tags_benefit_campaigns WHERE id=? AND issuer_business_id=? AND guest_app_id=?", [id, businessId, guestAppId]); if (!result.affectedRows) return benefitError("Beneficio no encontrado", 404); return Response.json({ ok: true }); }
        if (entity === "category") { const [used] = await db.query("SELECT COUNT(*) total FROM tags_benefit_campaigns WHERE category_id=?", [id]); if (Number(used[0].total)) return benefitError("La categoría tiene beneficios asociados", 409); await db.query("DELETE FROM tags_benefit_categories WHERE id=? AND issuer_business_id=? AND guest_app_id=?", [id, businessId, guestAppId]); return Response.json({ ok: true }); }
        const merchantId = entity === "merchant" ? id : Number(body.merchantId || 0); if (!(await ownsMerchant(merchantId, businessId))) return benefitError("Comercio no encontrado", 404);
        if (entity === "staff") await db.query("DELETE FROM tags_benefit_staff WHERE id=? AND merchant_id=?", [id, merchantId]);
        else if (entity === "location") { const [used] = await db.query("SELECT COUNT(*) total FROM tags_benefit_campaigns WHERE location_id=?", [id]); if (Number(used[0].total)) return benefitError("La sucursal tiene beneficios asociados", 409); await db.query("DELETE FROM tags_benefit_locations WHERE id=? AND merchant_id=?", [id, merchantId]); }
        else if (entity === "merchant") { const [used] = await db.query("SELECT COUNT(*) total FROM tags_benefit_campaigns WHERE merchant_id=?", [id]); if (Number(used[0].total)) return benefitError("El comercio tiene beneficios asociados", 409); await db.query("DELETE FROM tags_benefit_staff WHERE merchant_id=?", [id]); await db.query("DELETE FROM tags_benefit_locations WHERE merchant_id=?", [id]); await db.query("DELETE FROM tags_benefit_merchants WHERE id=?", [id]); }
        else return benefitError("Entidad no válida");
        return Response.json({ ok: true });
    } catch (error) { console.error("BENEFITS ADMIN DELETE ERROR", error); return benefitError("No se pudo eliminar", 500); }
}
