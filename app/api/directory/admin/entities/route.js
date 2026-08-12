export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { requireDirectoryAdmin, directoryAdminError } from "@/app/modules/directory/lib/requireDirectoryAdmin";
import { createSlug } from "@/app/modules/qr-page/lib/createSlug";

const clean = (value, limit = 500) => String(value || "").trim().slice(0, limit);

function apiError(error) {
    return Response.json({
        error: error.code === "ER_DUP_ENTRY" ? "Ya existe un registro con esos datos" : error.message
    }, { status: 500 });
}

async function rebuildTaxonomyClosure(conn) {
    const [nodes] = await conn.query("SELECT id,parent_id FROM tags_directory_taxonomy_nodes");
    const byId = new Map(nodes.map(node => [Number(node.id), node]));
    const closureRows = [];
    const depths = new Map();

    for (const node of nodes) {
        const nodeId = Number(node.id);
        const visited = new Set([nodeId]);
        const ancestors = [nodeId];
        let parentId = Number(node.parent_id) || 0;
        while (parentId) {
            if (visited.has(parentId) || !byId.has(parentId)) throw new Error("La jerarquía de rubros contiene un ciclo o un superior inválido");
            visited.add(parentId);
            ancestors.push(parentId);
            parentId = Number(byId.get(parentId).parent_id) || 0;
        }
        depths.set(nodeId, ancestors.length - 1);
        ancestors.forEach((ancestorId, depth) => closureRows.push([ancestorId, nodeId, depth]));
    }

    const ids = nodes.map(node => Number(node.id));
    if (ids.length) {
        await conn.query(`DELETE FROM tags_directory_taxonomy_closure WHERE descendant_id IN (${ids.map(() => "?").join(",")})`, ids);
        for (const row of closureRows) {
            await conn.query("INSERT INTO tags_directory_taxonomy_closure (ancestor_id,descendant_id,depth) VALUES (?,?,?)", row);
        }
        for (const [id, depth] of depths) {
            await conn.query("UPDATE tags_directory_taxonomy_nodes SET depth=? WHERE id=?", [depth, id]);
        }
    }
}

export async function POST(req) {
    const access = await requireDirectoryAdmin();
    if (!access.ok) return directoryAdminError(access);
    const body = await req.json().catch(() => null);
    if (!body) return Response.json({ error: "Solicitud inválida" }, { status: 400 });

    try {
        if (body.entity === "site") {
            const code = createSlug(body.code);
            const name = clean(body.name, 190);
            const host = clean(body.primaryHost, 255).toLowerCase();
            const territoryPlaceId = Number(body.territoryPlaceId) || null;
            if (!code || !name || !host) {
                return Response.json({ error: "Código, nombre y dominio son obligatorios" }, { status: 400 });
            }
            const [result] = await db.query(
                `INSERT INTO tags_directory_sites
                 (code,name,primary_host,brand_config,seo_config,directory_config,is_active)
                 VALUES (?,?,?,JSON_OBJECT(),JSON_OBJECT(),JSON_OBJECT('territoryPlaceId',?),?)`,
                [code, name, host, territoryPlaceId, body.isActive === false ? 0 : 1]
            );
            return Response.json({ ok: true, id: result.insertId });
        }

        if (body.entity === "taxonomy") {
            const parentId = Number(body.parentId) || null;
            const name = clean(body.name, 190);
            const slug = createSlug(body.slug || name);
            if (!name || !slug) {
                return Response.json({ error: "El nombre del rubro es obligatorio" }, { status: 400 });
            }
            const conn = await db.getConnection();
            try {
                await conn.beginTransaction();
                let depth = 0;
                if (parentId) {
                    const [parents] = await conn.query(
                        "SELECT depth FROM tags_directory_taxonomy_nodes WHERE id=? LIMIT 1",
                        [parentId]
                    );
                    if (!parents.length) throw new Error("Rubro superior inválido");
                    depth = Number(parents[0].depth) + 1;
                }
                const [duplicates] = await conn.query(
                    "SELECT id FROM tags_directory_taxonomy_nodes WHERE parent_id <=> ? AND slug=? LIMIT 1",
                    [parentId, slug]
                );
                if (duplicates.length) throw new Error("Ya existe un rubro con ese nombre en el mismo nivel");
                const [result] = await conn.query(
                    `INSERT INTO tags_directory_taxonomy_nodes
                     (site_id,parent_id,name,slug,node_type,depth,image_url,description,sort_order,is_active)
                     VALUES (?,?,?,?,'category',?,?,?,?,?)`,
                    [null, parentId, name, slug, depth, clean(body.imageUrl, 2000) || null, clean(body.description, 1000) || null, Number(body.sortOrder || 0), body.isActive === false ? 0 : 1]
                );
                if (parentId) {
                    await conn.query(
                        "INSERT INTO tags_directory_taxonomy_closure (ancestor_id,descendant_id,depth) SELECT ancestor_id,?,depth+1 FROM tags_directory_taxonomy_closure WHERE descendant_id=?",
                        [result.insertId, parentId]
                    );
                }
                await conn.query(
                    "INSERT INTO tags_directory_taxonomy_closure (ancestor_id,descendant_id,depth) VALUES (?,?,0)",
                    [result.insertId, result.insertId]
                );
                await conn.commit();
                return Response.json({ ok: true, id: result.insertId });
            } catch (error) {
                await conn.rollback();
                throw error;
            } finally {
                conn.release();
            }
        }

        if (body.entity === "place") {
            const name = clean(body.name, 190);
            const slug = createSlug(body.slug || name);
            const placeType = clean(body.placeType, 30);
            if (!name || !slug || !placeType) {
                return Response.json({ error: "Tipo y nombre son obligatorios" }, { status: 400 });
            }
            const [result] = await db.query(
                "INSERT INTO tags_geo_places (parent_id,place_type,name,slug,country_code,latitude,longitude,is_active) VALUES (?,?,?,?,?,?,?,?)",
                [Number(body.parentId) || null, placeType, name, slug, clean(body.countryCode, 2) || null, body.latitude === "" ? null : Number(body.latitude), body.longitude === "" ? null : Number(body.longitude), body.isActive === false ? 0 : 1]
            );
            return Response.json({ ok: true, id: result.insertId });
        }

        return Response.json({ error: "Entidad inválida" }, { status: 400 });
    } catch (error) {
        return apiError(error);
    }
}

export async function PATCH(req) {
    const access = await requireDirectoryAdmin();
    if (!access.ok) return directoryAdminError(access);
    const body = await req.json().catch(() => null);
    const id = Number(body?.id);
    if (!body || !id) return Response.json({ error: "Solicitud inválida" }, { status: 400 });

    try {
        if (body.entity === "site") {
            await db.query(
                "UPDATE tags_directory_sites SET name=?,primary_host=?,directory_config=JSON_SET(COALESCE(directory_config,JSON_OBJECT()),'$.territoryPlaceId',?),is_active=? WHERE id=?",
                [clean(body.name, 190), clean(body.primaryHost, 255).toLowerCase(), Number(body.territoryPlaceId) || null, body.isActive === false ? 0 : 1, id]
            );
        } else if (body.entity === "taxonomy") {
            const conn = await db.getConnection();
            try {
                await conn.beginTransaction();
                const [nodes] = await conn.query("SELECT id FROM tags_directory_taxonomy_nodes WHERE id=? LIMIT 1 FOR UPDATE", [id]);
                if (!nodes.length) throw new Error("Rubro no encontrado");
                const parentId = Number(body.parentId) || null;
                if (parentId) {
                    const [parents] = await conn.query("SELECT id FROM tags_directory_taxonomy_nodes WHERE id=? LIMIT 1", [parentId]);
                    if (!parents.length || parentId === id) throw new Error("Rubro superior inválido");
                }
                const slug = createSlug(body.slug || body.name);
                const [duplicates] = await conn.query(
                    "SELECT id FROM tags_directory_taxonomy_nodes WHERE parent_id <=> ? AND slug=? AND id<>? LIMIT 1",
                    [parentId, slug, id]
                );
                if (duplicates.length) throw new Error("Ya existe un rubro con ese nombre en el mismo nivel");
                await conn.query(
                    "UPDATE tags_directory_taxonomy_nodes SET site_id=NULL,parent_id=?,name=?,slug=?,image_url=?,description=?,sort_order=?,is_active=? WHERE id=?",
                    [parentId, clean(body.name, 190), slug, clean(body.imageUrl, 2000) || null, clean(body.description, 1000) || null, Number(body.sortOrder || 0), body.isActive === false ? 0 : 1, id]
                );
                await rebuildTaxonomyClosure(conn);
                await conn.commit();
            } catch (error) {
                await conn.rollback();
                throw error;
            } finally {
                conn.release();
            }
        } else if (body.entity === "place") {
            const parentId = Number(body.parentId) || null;
            if (parentId) {
                const [places] = await db.query("SELECT id,parent_id FROM tags_geo_places");
                const byId = new Map(places.map(place => [Number(place.id), Number(place.parent_id) || 0]));
                let cursor = parentId;
                const visited = new Set();
                while (cursor) {
                    if (cursor === id || visited.has(cursor)) throw new Error("La ubicación superior generaría un ciclo");
                    visited.add(cursor);
                    cursor = byId.get(cursor) || 0;
                }
            }
            await db.query(
                "UPDATE tags_geo_places SET parent_id=?,place_type=?,name=?,slug=?,country_code=?,latitude=?,longitude=?,is_active=? WHERE id=?",
                [parentId, clean(body.placeType, 30), clean(body.name, 190), createSlug(body.slug || body.name), clean(body.countryCode, 2) || null, body.latitude === "" ? null : Number(body.latitude), body.longitude === "" ? null : Number(body.longitude), body.isActive === false ? 0 : 1, id]
            );
        } else {
            return Response.json({ error: "Entidad inválida" }, { status: 400 });
        }
        return Response.json({ ok: true });
    } catch (error) {
        return apiError(error);
    }
}

export async function DELETE(req) {
    const access = await requireDirectoryAdmin();
    if (!access.ok) return directoryAdminError(access);
    const body = await req.json().catch(() => null);
    const id = Number(body?.id);
    if (!body || !id) return Response.json({ error: "Solicitud inválida" }, { status: 400 });

    try {
        if (body.entity === "site") {
            const [siteListings] = await db.query("SELECT COUNT(*) total FROM tags_directory_site_listings WHERE site_id=?", [id]);
            if (Number(siteListings[0].total) > 0) {
                return Response.json({ error: "El Directorio tiene datos asociados y no puede eliminarse" }, { status: 409 });
            }
            await db.query("DELETE FROM tags_directory_sites WHERE id=?", [id]);
        } else if (body.entity === "taxonomy") {
            const [[listings], [children]] = await Promise.all([
                db.query("SELECT COUNT(*) total FROM tags_directory_listing_taxonomy WHERE taxonomy_node_id=?", [id]),
                db.query("SELECT COUNT(*) total FROM tags_directory_taxonomy_nodes WHERE parent_id=?", [id])
            ]);
            if (Number(listings[0].total) + Number(children[0].total) > 0) {
                return Response.json({ error: "El rubro tiene datos asociados y no puede eliminarse" }, { status: 409 });
            }
            await db.query("DELETE FROM tags_directory_taxonomy_nodes WHERE id=?", [id]);
        } else if (body.entity === "place") {
            const [[listings], [children]] = await Promise.all([
                db.query("SELECT COUNT(*) total FROM tags_directory_listing_places WHERE place_id=?", [id]),
                db.query("SELECT COUNT(*) total FROM tags_geo_places WHERE parent_id=?", [id])
            ]);
            if (Number(listings[0].total) + Number(children[0].total) > 0) {
                return Response.json({ error: "La ubicación tiene datos asociados y no puede eliminarse" }, { status: 409 });
            }
            await db.query("DELETE FROM tags_geo_places WHERE id=?", [id]);
        } else {
            return Response.json({ error: "Entidad inválida" }, { status: 400 });
        }
        return Response.json({ ok: true });
    } catch (error) {
        return apiError(error);
    }
}
