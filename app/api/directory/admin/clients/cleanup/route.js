export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { bucket } from "@/app/modules/files/lib/googleStorage";
import { deleteFile } from "@/app/modules/files/lib/deleteFile";
import { requireDirectoryAdmin, directoryAdminError } from "@/app/modules/directory/lib/requireDirectoryAdmin";
import { updateDirectoryMercadoPagoPreapproval } from "@/app/modules/directory/lib/directoryMercadoPago";

const ALLOWED_ADDONS = new Set(["directory", "client_reviews"]);
const ALLOWED_PLAN_CODES = new Set(["directory_web", "directory_web_plus"]);
const ALLOWED_PAGE_TYPES = new Set(["directory", "client_reviews"]);
const SIGNUP_PREFIX = "directory/public-signups/";

function json(value, status = 200) {
    return Response.json(value, { status });
}

function cleanPath(value) {
    return String(value || "").trim().replace(/^\/+/, "");
}

function storagePathFromUrl(value) {
    try {
        const url = new URL(String(value || ""));
        const bucketName = String(process.env.GOOGLE_STORAGE_BUCKET || "");
        if (url.hostname !== "storage.googleapis.com") return "";
        const parts = url.pathname.split("/").filter(Boolean);
        if (!parts.length || parts[0] !== bucketName) return "";
        return cleanPath(parts.slice(1).join("/"));
    } catch {
        return "";
    }
}

function parseJson(value) {
    if (!value) return null;
    if (typeof value === "object") return value;
    try { return JSON.parse(value); } catch { return null; }
}

function collectStoragePaths(value, paths) {
    if (value == null) return;
    if (typeof value === "string") {
        const direct = storagePathFromUrl(value);
        if (direct) paths.add(direct);
        const parsed = parseJson(value);
        if (parsed && parsed !== value) collectStoragePaths(parsed, paths);
        return;
    }
    if (Array.isArray(value)) {
        value.forEach(item => collectStoragePaths(item, paths));
        return;
    }
    if (typeof value === "object") {
        Object.entries(value).forEach(([key, item]) => {
            if (/storage_?path/i.test(key)) {
                const path = cleanPath(item);
                if (path) paths.add(path);
            }
            collectStoragePaths(item, paths);
        });
    }
}

function pathBelongsToBusiness(path, businessId) {
    const normalized = cleanPath(path);
    if (normalized.startsWith(SIGNUP_PREFIX)) return true;
    const parts = normalized.split("/");
    return parts.length >= 3 && String(parts[1]) === String(businessId);
}

async function tableExists(conn, table) {
    const [rows] = await conn.query(
        "SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? LIMIT 1",
        [table]
    );
    return rows.length > 0;
}

async function rowsIfTable(conn, table, sql, params = []) {
    if (!await tableExists(conn, table)) return [];
    const [rows] = await conn.query(sql, params);
    return rows;
}

function placeholders(values) {
    return values.map(() => "?").join(",");
}

async function deleteByIds(conn, table, column, values) {
    const ids = [...new Set((values || []).map(Number).filter(Boolean))];
    if (!ids.length || !await tableExists(conn, table)) return 0;
    const [result] = await conn.query(`DELETE FROM \`${table}\` WHERE \`${column}\` IN (${placeholders(ids)})`, ids);
    return Number(result.affectedRows || 0);
}

async function deleteByBusiness(conn, table, businessId) {
    if (!await tableExists(conn, table)) return 0;
    const [result] = await conn.query(`DELETE FROM \`${table}\` WHERE business_id=?`, [businessId]);
    return Number(result.affectedRows || 0);
}

async function buildInventory(conn, businessId) {
    const [[business]] = await conn.query(
        "SELECT id,name,display_name,email,logo_url,cover_url FROM tags_businesses WHERE id=? LIMIT 1",
        [businessId]
    );
    if (!business) return null;

    const listings = await rowsIfTable(conn, "tags_directory_listings", "SELECT * FROM tags_directory_listings WHERE business_id=?", [businessId]);
    const listingIds = listings.map(item => Number(item.id));
    const qrs = await rowsIfTable(conn, "tags_qr_codes", "SELECT * FROM tags_qr_codes WHERE business_id=?", [businessId]);
    const qrIds = qrs.map(item => Number(item.id));
    const pages = await rowsIfTable(conn, "tags_qr_pages", "SELECT * FROM tags_qr_pages WHERE business_id=?", [businessId]);
    const pageIds = pages.map(item => Number(item.id));
    const subscriptions = await rowsIfTable(conn, "tags_subscriptions", `SELECT s.*,p.code plan_code,p.name plan_name FROM tags_subscriptions s LEFT JOIN tags_plans p ON p.id=s.plan_id WHERE s.business_id=? ORDER BY s.id`, [businessId]);
    const addons = await rowsIfTable(conn, "tags_business_addons", "SELECT * FROM tags_business_addons WHERE business_id=? ORDER BY id", [businessId]);
    const stores = await rowsIfTable(conn, "tags_stores", "SELECT id,app_type FROM tags_stores WHERE business_id=?", [businessId]);
    const turnos = await rowsIfTable(conn, "tags_turnos_apps", "SELECT id FROM tags_turnos_apps WHERE business_id=?", [businessId]);
    const guestApps = await rowsIfTable(conn, "tags_guest_apps", "SELECT id FROM tags_guest_apps WHERE business_id=?", [businessId]);
    const portals = await rowsIfTable(conn, "tags_portals", "SELECT id FROM tags_portals WHERE business_id=?", [businessId]);
    const agencies = await rowsIfTable(conn, "tags_qr_agencies", "SELECT id FROM tags_qr_agencies WHERE business_id=?", [businessId]);

    const blockers = [];
    if (!listings.length) blockers.push("El cliente no posee una ficha de Directorio.");
    const isPublicSignup = addons.some(item => item.addon_code === "directory" && String(item.notes || "").toLowerCase().includes("alta pública en"));
    if (!isPublicSignup) blockers.push("No fue creado por el circuito público de inscripción. Para proteger clientes reales o migrados, esta herramienta no puede eliminarlo.");
    const foreignAddons = addons.filter(item => !ALLOWED_ADDONS.has(String(item.addon_code || "")));
    if (foreignAddons.length) blockers.push(`Tiene otros addons: ${foreignAddons.map(item => item.addon_code).join(", ")}.`);
    const foreignPlans = subscriptions.filter(item => item.plan_code && !ALLOWED_PLAN_CODES.has(String(item.plan_code)) && Number(item.amount || 0) > 0);
    if (foreignPlans.length) blockers.push(`Tiene suscripciones ajenas a Directorio: ${foreignPlans.map(item => item.plan_name || item.plan_code).join(", ")}.`);
    const foreignPages = pages.filter(item => !ALLOWED_PAGE_TYPES.has(String(item.page_type || "")));
    if (foreignPages.length) blockers.push(`Tiene páginas de otros módulos: ${[...new Set(foreignPages.map(item => item.page_type))].join(", ")}.`);
    if (stores.length) blockers.push(`Tiene ${stores.length} Store/Resto asociado(s).`);
    if (turnos.length) blockers.push("Tiene Tags Turnos asociado.");
    if (guestApps.length) blockers.push("Tiene Experiencia de Huéspedes asociada.");
    if (portals.length) blockers.push("Tiene Portal asociado.");
    if (agencies.length) blockers.push("Tiene QR Agency asociado.");

    const paths = new Set();
    collectStoragePaths(business, paths);
    collectStoragePaths(listings, paths);
    collectStoragePaths(pages, paths);
    const media = listingIds.length
        ? await rowsIfTable(conn, "tags_directory_media", `SELECT * FROM tags_directory_media WHERE listing_id IN (${placeholders(listingIds)})`, listingIds)
        : [];
    collectStoragePaths(media, paths);
    const reviewMedia = await rowsIfTable(conn, "tags_client_review_media", "SELECT * FROM tags_client_review_media WHERE business_id=?", [businessId]);
    collectStoragePaths(reviewMedia, paths);
    const sections = pageIds.length
        ? await rowsIfTable(conn, "tags_qr_page_sections", `SELECT * FROM tags_qr_page_sections WHERE page_id IN (${placeholders(pageIds)})`, pageIds)
        : [];
    const sectionIds = sections.map(item => Number(item.id));
    const blocks = sectionIds.length
        ? await rowsIfTable(conn, "tags_qr_page_blocks", `SELECT * FROM tags_qr_page_blocks WHERE section_id IN (${placeholders(sectionIds)})`, sectionIds)
        : [];
    const products = pageIds.length
        ? await rowsIfTable(conn, "tags_qr_page_products", `SELECT * FROM tags_qr_page_products WHERE page_id IN (${placeholders(pageIds)})`, pageIds)
        : [];
    collectStoragePaths(blocks, paths);
    collectStoragePaths(products, paths);

    const ownedPaths = [...paths].filter(path => pathBelongsToBusiness(path, businessId)).sort();
    return {
        business,
        listings,
        listingIds,
        qrs,
        qrIds,
        pages,
        pageIds,
        sections,
        sectionIds,
        subscriptions,
        addons,
        media,
        reviewMedia,
        ownedPaths,
        blockers,
        canDelete: blockers.length === 0
    };
}

function publicInventory(inventory) {
    return {
        business: inventory.business,
        canDelete: inventory.canDelete,
        blockers: inventory.blockers,
        counts: {
            listings: inventory.listings.length,
            pages: inventory.pages.length,
            qrs: inventory.qrs.length,
            subscriptions: inventory.subscriptions.length,
            addons: inventory.addons.length,
            directoryMedia: inventory.media.length,
            reviewMedia: inventory.reviewMedia.length,
            files: inventory.ownedPaths.length
        },
        files: inventory.ownedPaths
    };
}

async function referencedSignupPaths(conn) {
    const paths = new Set();
    const businesses = await rowsIfTable(conn, "tags_businesses", "SELECT logo_url,cover_url FROM tags_businesses WHERE logo_url LIKE ? OR cover_url LIKE ?", [`%/${SIGNUP_PREFIX}%`, `%/${SIGNUP_PREFIX}%`]);
    const media = await rowsIfTable(conn, "tags_directory_media", "SELECT url,source_payload FROM tags_directory_media WHERE url LIKE ? OR CAST(source_payload AS CHAR) LIKE ?", [`%/${SIGNUP_PREFIX}%`, `%${SIGNUP_PREFIX}%`]);
    collectStoragePaths(businesses, paths);
    collectStoragePaths(media, paths);
    return paths;
}

export async function GET(req) {
    const access = await requireDirectoryAdmin();
    if (!access.ok) return directoryAdminError(access);
    const url = new URL(req.url);
    if (url.searchParams.get("orphans") !== "1") return json({ error: "Solicitud inválida" }, 400);
    try {
        const referenced = await referencedSignupPaths(db);
        const [files] = await bucket.getFiles({ prefix: SIGNUP_PREFIX, autoPaginate: true });
        const orphans = files
            .filter(file => !referenced.has(cleanPath(file.name)))
            .map(file => ({ path: file.name, size: Number(file.metadata?.size || 0), createdAt: file.metadata?.timeCreated || null }))
            .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
            .slice(0, 200);
        return json({ ok: true, orphans });
    } catch (error) {
        console.error("DIRECTORY ORPHAN FILES ERROR", error);
        return json({ error: "No se pudieron consultar los archivos huérfanos de inscripciones." }, 500);
    }
}

export async function POST(req) {
    const access = await requireDirectoryAdmin();
    if (!access.ok) return directoryAdminError(access);
    const body = await req.json().catch(() => null);
    const businessId = Number(body?.businessId || 0);
    if (!businessId) return json({ error: "Cliente inválido" }, 400);
    try {
        const inventory = await buildInventory(db, businessId);
        if (!inventory) return json({ error: "El cliente ya no existe" }, 404);
        return json({ ok: true, inventory: publicInventory(inventory) });
    } catch (error) {
        console.error("DIRECTORY CLIENT CLEANUP PREVIEW ERROR", error);
        return json({ error: "No se pudo preparar el detalle de eliminación." }, 500);
    }
}

export async function DELETE(req) {
    const access = await requireDirectoryAdmin();
    if (!access.ok) return directoryAdminError(access);
    const body = await req.json().catch(() => null);

    if (body?.action === "orphan_file") {
        const path = cleanPath(body.path);
        if (!path.startsWith(SIGNUP_PREFIX) || path.includes("..")) return json({ error: "Ruta de archivo inválida" }, 400);
        try {
            const referenced = await referencedSignupPaths(db);
            if (referenced.has(path)) return json({ error: "El archivo volvió a quedar asociado a un cliente y no puede eliminarse." }, 409);
            if (!await deleteFile(path)) return json({ error: "No se pudo eliminar el archivo de Cloud Storage." }, 502);
            return json({ ok: true, deletedFile: path });
        } catch (error) {
            console.error("DIRECTORY ORPHAN FILE DELETE ERROR", error);
            return json({ error: "No se pudo eliminar el archivo huérfano." }, 500);
        }
    }

    const businessId = Number(body?.businessId || 0);
    const confirmation = String(body?.confirmation || "").trim();
    if (!businessId || !confirmation) return json({ error: "Faltan el cliente y la confirmación" }, 400);

    const conn = await db.getConnection();
    let inventory;
    try {
        inventory = await buildInventory(conn, businessId);
        if (!inventory) return json({ error: "El cliente ya no existe" }, 404);
        const expected = String(inventory.business.display_name || inventory.business.name || "").trim();
        if (confirmation !== expected) return json({ error: "La confirmación no coincide exactamente con el nombre del negocio." }, 400);
        if (!inventory.canDelete) return json({ error: "El cliente tiene módulos o datos que impiden una eliminación segura.", blockers: inventory.blockers }, 409);

        for (const subscription of inventory.subscriptions) {
            if (subscription.payment_provider === "mercadopago" && subscription.external_subscription_id && !["cancelled", "paused"].includes(String(subscription.provider_status || ""))) {
                await updateDirectoryMercadoPagoPreapproval(subscription.external_subscription_id, "cancelled");
            }
        }

        await conn.beginTransaction();
        const responseRows = await rowsIfTable(conn, "tags_client_review_responses", "SELECT id FROM tags_client_review_responses WHERE business_id=?", [businessId]);
        const responseIds = responseRows.map(item => Number(item.id));
        const formRows = await rowsIfTable(conn, "tags_client_review_forms", "SELECT id FROM tags_client_review_forms WHERE business_id=?", [businessId]);
        const formIds = formRows.map(item => Number(item.id));
        const subscriptionIds = inventory.subscriptions.map(item => Number(item.id));

        await deleteByIds(conn, "tags_client_review_events", "response_id", responseIds);
        await deleteByIds(conn, "tags_client_review_answers", "response_id", responseIds);
        await deleteByBusiness(conn, "tags_client_review_media", businessId);
        await deleteByBusiness(conn, "tags_client_review_responses", businessId);
        await deleteByIds(conn, "tags_client_review_questions", "form_id", formIds);
        await deleteByBusiness(conn, "tags_client_review_forms", businessId);

        await deleteByIds(conn, "tags_qr_page_blocks", "section_id", inventory.sectionIds);
        await deleteByIds(conn, "tags_qr_page_products", "page_id", inventory.pageIds);
        await deleteByIds(conn, "tags_qr_page_sections", "page_id", inventory.pageIds);
        await deleteByIds(conn, "tags_portal_routes", "page_id", inventory.pageIds);
        await deleteByBusiness(conn, "tags_portal_routes", businessId);

        await deleteByIds(conn, "tags_legacy_routes", "listing_id", inventory.listingIds);
        await deleteByIds(conn, "tags_directory_media", "listing_id", inventory.listingIds);
        await deleteByIds(conn, "tags_directory_listing_places", "listing_id", inventory.listingIds);
        await deleteByIds(conn, "tags_directory_listing_taxonomy", "listing_id", inventory.listingIds);
        await deleteByIds(conn, "tags_directory_site_listings", "listing_id", inventory.listingIds);

        await deleteByBusiness(conn, "tags_qr_addon_usage", businessId);
        await deleteByIds(conn, "tags_clicks", "qr_code_id", inventory.qrIds);
        await deleteByIds(conn, "tags_stats_daily", "qr_code_id", inventory.qrIds);
        if (inventory.listingIds.length) await conn.query(`UPDATE tags_directory_listings SET qr_page_id=NULL WHERE id IN (${placeholders(inventory.listingIds)})`, inventory.listingIds);
        await deleteByBusiness(conn, "tags_qr_pages", businessId);
        await deleteByBusiness(conn, "tags_qr_codes", businessId);

        await deleteByIds(conn, "tags_subscription_provider_events", "subscription_id", subscriptionIds);
        await deleteByBusiness(conn, "tags_subscription_payments", businessId);
        await deleteByBusiness(conn, "tags_subscriptions", businessId);
        await deleteByBusiness(conn, "tags_business_addons", businessId);
        await deleteByBusiness(conn, "tags_business_places", businessId);
        await deleteByBusiness(conn, "tags_domains", businessId);
        await deleteByIds(conn, "tags_directory_listings", "id", inventory.listingIds);

        if (await tableExists(conn, "tags_legacy_entity_map")) {
            await conn.query("DELETE FROM tags_legacy_entity_map WHERE (target_table='tags_businesses' AND target_id=?) OR (target_table='tags_directory_listings' AND target_id IN (?)) OR (target_table='tags_qr_pages' AND target_id IN (?)) OR (target_table='tags_qr_codes' AND target_id IN (?))", [businessId, inventory.listingIds.length ? inventory.listingIds : [0], inventory.pageIds.length ? inventory.pageIds : [0], inventory.qrIds.length ? inventory.qrIds : [0]]);
        }
        if (inventory.business.email && await tableExists(conn, "tags_auth_tokens")) await conn.query("DELETE FROM tags_auth_tokens WHERE LOWER(email)=LOWER(?)", [inventory.business.email]);
        const [businessDelete] = await conn.query("DELETE FROM tags_businesses WHERE id=?", [businessId]);
        if (!businessDelete.affectedRows) throw new Error("El cliente no pudo eliminarse");
        await conn.commit();

        const failedFiles = [];
        for (const path of inventory.ownedPaths) {
            if (!await deleteFile(path)) failedFiles.push(path);
        }
        return json({
            ok: true,
            deleted: publicInventory(inventory),
            filesDeleted: inventory.ownedPaths.length - failedFiles.length,
            failedFiles,
            warning: failedFiles.length ? "El cliente fue eliminado, pero algunos archivos deberán limpiarse desde Archivos huérfanos." : null
        });
    } catch (error) {
        try { await conn.rollback(); } catch {}
        console.error("DIRECTORY CLIENT CLEANUP DELETE ERROR", { businessId, code: error?.code, message: error?.message, constraint: error?.sqlMessage });
        const foreignKey = error?.code === "ER_ROW_IS_REFERENCED_2" || error?.code === "ER_ROW_IS_REFERENCED";
        return json({ error: foreignKey ? "La eliminación fue cancelada porque todavía existe una relación no contemplada. No se modificó la base de datos." : (error?.message || "No se pudo eliminar el cliente."), code: error?.code || null }, 500);
    } finally {
        conn.release();
    }
}
