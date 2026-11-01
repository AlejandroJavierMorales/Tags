export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getGuestAdminAccess, guestAdminAccessResponse } from "@/app/modules/guest-experience/lib/getGuestAdminAccess";
import { cleanGuestText, guestError, parseGuestJson } from "@/app/modules/guest-experience/lib/guestExperienceService";

function unitFeatures(body, previous = {}) {
    const equipment = Array.isArray(body.equipment) ? body.equipment.map(item => cleanGuestText(item, 190)).filter(Boolean).slice(0, 50) : [];
    const images = Array.isArray(body.images) ? body.images.map(item => ({ url: cleanGuestText(item?.url, 2000), alt: cleanGuestText(item?.alt, 300), storagePath: cleanGuestText(item?.storagePath, 2000) })).filter(item => item.url).slice(0, 12) : [];
    return { ...previous, publicCategory: cleanGuestText(body.publicCategory, 190) || null, equipment, details: cleanGuestText(body.details, 4000), images, catalogProductId: Number(body.catalogProductId || 0) || null, catalogProductTitle: cleanGuestText(body.catalogProductTitle, 190) || null, catalogImportedAt: cleanGuestText(body.catalogImportedAt, 40) || null };
}

export async function POST(req) {
    const body = await req.json().catch(() => null); if (!body) return guestError("Cuerpo JSON inválido");
    const businessId = Number(body.businessId || 0), guestAppId = Number(body.guestAppId || 0);
    const access = await getGuestAdminAccess({ businessId, guestAppId }); if (!access.allowed) return guestAdminAccessResponse(access);
    const name = cleanGuestText(body.name, 190); if (!name) return guestError("El nombre de la unidad es requerido");
    const [result] = await db.query("INSERT INTO tags_guest_units (guest_app_id,code,name,description,capacity_adults,capacity_children,features_json) VALUES (?,?,?,?,?,?,?)", [guestAppId, cleanGuestText(body.code, 80) || null, name, cleanGuestText(body.description, 4000) || null, Math.max(1, Number(body.capacityAdults || 1)), Math.max(0, Number(body.capacityChildren || 0)), JSON.stringify(unitFeatures(body))]);
    return Response.json({ ok: true, unitId: result.insertId }, { status: 201 });
}

export async function PATCH(req) {
    const body = await req.json().catch(() => null); if (!body) return guestError("Cuerpo JSON invÃ¡lido");
    const businessId = Number(body.businessId || 0), guestAppId = Number(body.guestAppId || 0), unitId = Number(body.unitId || 0);
    const access = await getGuestAdminAccess({ businessId, guestAppId }); if (!access.allowed) return guestAdminAccessResponse(access);
    const name = cleanGuestText(body.name, 190); if (!unitId || !name) return guestError("La unidad y su nombre son requeridos");
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [rows] = await connection.query("SELECT features_json FROM tags_guest_units WHERE id=? AND guest_app_id=? LIMIT 1 FOR UPDATE", [unitId, guestAppId]);
        if (!rows[0]) { await connection.rollback(); return guestError("Unidad no encontrada", 404); }
        const features = unitFeatures(body, parseGuestJson(rows[0].features_json));
        await connection.query("UPDATE tags_guest_units SET code=?,name=?,description=?,capacity_adults=?,capacity_children=?,features_json=?,updated_at=NOW() WHERE id=? AND guest_app_id=?", [cleanGuestText(body.code, 80) || null, name, cleanGuestText(body.description, 4000) || null, Math.max(1, Number(body.capacityAdults || 1)), Math.max(0, Number(body.capacityChildren || 0)), JSON.stringify(features), unitId, guestAppId]);
        await connection.commit();
        return Response.json({ ok: true });
    } catch (error) {
        await connection.rollback();
        return guestError(error?.code === "ER_DUP_ENTRY" ? "Ya existe una unidad con ese cÃ³digo" : "No se pudo guardar la unidad", 400);
    } finally { connection.release(); }
}
