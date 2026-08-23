export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { requireDirectoryAdmin, directoryAdminError } from "@/app/modules/directory/lib/requireDirectoryAdmin";
import { createSlug } from "@/app/modules/qr-page/lib/createSlug";

export async function POST(req) {
    const access = await requireDirectoryAdmin();
    if (!access.ok) return directoryAdminError(access);

    const body = await req.json().catch(() => null);
    const businessId = Number(body?.businessId);
    const requestedListingId = Number(body?.listingId) || 0;
    const siteIds = [...new Set((Array.isArray(body?.siteIds) ? body.siteIds : []).map(Number).filter(Boolean))];
    const taxonomyIds = [...new Set((Array.isArray(body?.taxonomyIds) ? body.taxonomyIds : []).map(Number).filter(Boolean))];
    const placeId = Number(body?.placeId) || 0;
    const publicationStatus = body?.isPublished === true ? "published" : "draft";
    if (!body || !businessId || !siteIds.length) {
        return Response.json({ error: "Cliente y al menos un Directorio son obligatorios" }, { status: 400 });
    }

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const [businessRows] = await conn.query("SELECT * FROM tags_businesses WHERE id=? LIMIT 1 FOR UPDATE", [businessId]);
        const business = businessRows[0];
        if (!business) {
            await conn.rollback();
            return Response.json({ error: "Cliente no encontrado" }, { status: 404 });
        }

        if (taxonomyIds.length) {
            const placeholders = taxonomyIds.map(() => "?").join(",");
            const [validTaxonomy] = await conn.query(
                `SELECT id FROM tags_directory_taxonomy_nodes n WHERE n.id IN (${placeholders}) AND n.is_active=1 AND NOT EXISTS (SELECT 1 FROM tags_directory_taxonomy_nodes child WHERE child.parent_id=n.id)`,
                taxonomyIds
            );
            if (validTaxonomy.length !== taxonomyIds.length) {
                await conn.rollback();
                return Response.json({ error: "Uno o más rubros seleccionados no son válidos" }, { status: 400 });
            }
        }

        if (placeId) {
            const [placeRows] = await conn.query("SELECT place_type FROM tags_geo_places WHERE id=? AND is_active=1 LIMIT 1", [placeId]);
            if (!placeRows.length || placeRows[0].place_type !== "locality") {
                await conn.rollback();
                return Response.json({ error: "La ubicación de la ficha debe ser una localidad" }, { status: 400 });
            }
        }

        const [owned] = await conn.query("SELECT id FROM tags_directory_listings WHERE business_id=? LIMIT 1 FOR UPDATE", [businessId]);
        let listingId = Number(owned[0]?.id) || 0;
        if (requestedListingId && listingId && requestedListingId !== listingId) {
            await conn.rollback();
            return Response.json({ error: "El cliente ya tiene otra ficha vinculada" }, { status: 409 });
        }

        if (requestedListingId && !listingId) {
            const [legacy] = await conn.query("SELECT id,business_id FROM tags_directory_listings WHERE id=? LIMIT 1 FOR UPDATE", [requestedListingId]);
            if (!legacy.length) {
                await conn.rollback();
                return Response.json({ error: "Ficha no encontrada" }, { status: 404 });
            }
            if (legacy[0].business_id && Number(legacy[0].business_id) !== businessId) {
                await conn.rollback();
                return Response.json({ error: "La ficha pertenece a otro cliente" }, { status: 409 });
            }
            listingId = requestedListingId;
            await conn.query("UPDATE tags_directory_listings SET business_id=? WHERE id=?", [businessId, listingId]);
        }

        if (!listingId) {
            const [result] = await conn.query(
                `INSERT INTO tags_directory_listings
                 (business_id,display_name,short_description,description,email,phone,whatsapp,website_url,address,social_config,status)
                 VALUES (?,?,?,?,?,?,?,?,?,?,'draft')`,
                [businessId, business.display_name || business.name, business.description || null, business.description || null, business.email || null, business.phone || null, business.whatsapp || null, business.website_url || null, business.address || null, JSON.stringify({ instagram: business.instagram_url || null, facebook: business.facebook_url || null })]
            );
            listingId = result.insertId;
        }

        const baseSlug = createSlug(body.slug || business.name);
        if (!baseSlug) throw new Error("Slug inválido");

        for (const siteId of siteIds) {
            const [existing] = await conn.query("SELECT id FROM tags_directory_site_listings WHERE site_id=? AND listing_id=? LIMIT 1", [siteId, listingId]);
            if (existing.length) continue;
            const [collision] = await conn.query("SELECT id FROM tags_directory_site_listings WHERE site_id=? AND slug=? LIMIT 1", [siteId, baseSlug]);
            if (collision.length) throw new Error(`El slug ${baseSlug} ya está utilizado en uno de los Directorios`);
            await conn.query(
                "INSERT INTO tags_directory_site_listings (site_id,listing_id,slug,publication_status,is_free,is_featured,sort_order) VALUES (?,?,?,'draft',1,0,0)",
                [siteId, listingId, baseSlug]
            );
        }

        const selectedSitePlaceholders = siteIds.map(() => "?").join(",");
        await conn.query(
            `UPDATE tags_directory_site_listings SET publication_status=?,published_at=IF(?='published',COALESCE(published_at,NOW()),published_at) WHERE listing_id=? AND site_id IN (${selectedSitePlaceholders})`,
            [publicationStatus, publicationStatus, listingId, ...siteIds]
        );
        await conn.query("UPDATE tags_directory_listings SET status=? WHERE id=?", [publicationStatus, listingId]);

        await conn.query("DELETE FROM tags_directory_listing_taxonomy WHERE listing_id=?", [listingId]);
        for (let index = 0; index < taxonomyIds.length; index += 1) {
            await conn.query(
                "INSERT INTO tags_directory_listing_taxonomy (listing_id,taxonomy_node_id,is_primary,sort_order) VALUES (?,?,?,?)",
                [listingId, taxonomyIds[index], index === 0 ? 1 : 0, index]
            );
        }

        await conn.query("DELETE FROM tags_directory_listing_places WHERE listing_id=? AND relation_type='location'", [listingId]);
        if (placeId) {
            await conn.query("INSERT INTO tags_directory_listing_places (listing_id,place_id,relation_type,is_primary) VALUES (?,?,'location',1)", [listingId, placeId]);
        }

        await conn.commit();
        return Response.json({ ok: true, listingId });
    } catch (error) {
        await conn.rollback();
        return Response.json({ error: error.code === "ER_DUP_ENTRY" ? "La ficha, ruta o asignación ya existe" : error.message }, { status: 500 });
    } finally {
        conn.release();
    }
}
