export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { requireQRPageAccess } from "@/app/modules/qr-page/lib/requireQRPageAccess";
import { getDirectoryWebPageData } from "@/app/modules/directory/lib/getDirectoryWebPageData";
import { DIRECTORY_MODULE_CODES, getDirectoryModuleSettings } from "@/app/modules/directory/lib/directoryModuleSettings";
import { normalizeDirectorySectionGroups } from "@/app/modules/directory/lib/directorySectionGroups";
import { normalizeDirectoryDbValue } from "@/app/modules/directory/lib/normalizeDirectoryDbValue";
import { safeParseJSON } from "@/app/modules/qr-page/lib/safeParseJSON";

function parse(value) {
    if (!value) return {};
    if (typeof value === "object") return value;
    try { return JSON.parse(value); } catch { return {}; }
}

const LAYOUT_MODULES = new Set(["store", "resto", "turnos", "events", "reviewsInvitation", "reviewsSlider"]);

function normalizeLayoutOrder(value, groupIds = new Set(), sectionIds = new Set()) {
    if (!Array.isArray(value)) return null;
    const seen = new Set();
    return value.slice(0, 100).map(item => String(item || "").trim()).filter(item => {
        const validSection = /^section:\d+$/.test(item) && sectionIds.has(Number(item.slice(8)));
        const validModule = item.startsWith("module:") && LAYOUT_MODULES.has(item.slice(7));
        const validGroup = item.startsWith("group:") && groupIds.has(item.slice(6));
        if (!validSection && !validModule && !validGroup) return false;
        if (seen.has(item)) return false;
        seen.add(item);
        return true;
    });
}

async function pageFor(businessId, pageId) {
    const [rows] = await db.query("SELECT id,global_styles FROM tags_qr_pages WHERE id=? AND business_id=? AND page_type='directory' LIMIT 1", [pageId, businessId]);
    return rows[0] || null;
}

export async function GET(request) {
    const url = new URL(request.url);
    const businessId = Number(url.searchParams.get("businessId") || 0);
    const pageId = Number(url.searchParams.get("pageId") || 0);
    const sectionId = Number(url.searchParams.get("sectionId") || 0);
    if (!businessId || !pageId) return Response.json({ error: "Datos incompletos" }, { status: 400 });
    const access = await requireQRPageAccess(businessId, { skipQRPageValidation: true });
    if (!access.ok) return Response.json({ error: access.error }, { status: access.status });
    if (!(await pageFor(businessId, pageId))) return Response.json({ error: "Web Directory no encontrada" }, { status: 404 });
    if (sectionId) {
        const [sections] = await db.query("SELECT * FROM tags_qr_page_sections WHERE id=? AND page_id=? LIMIT 1", [sectionId, pageId]);
        if (!sections.length) return Response.json({ error: "Sección no encontrada" }, { status: 404 });
        const [blocks, media] = await Promise.all([
            db.query("SELECT * FROM tags_qr_page_blocks WHERE section_id=? ORDER BY sort_order,id", [sectionId]),
            db.query(`SELECT m.id,m.media_type,m.url,m.alt_text,m.sort_order
                        FROM tags_directory_media m
                        INNER JOIN tags_directory_listings l ON l.id=m.listing_id
                       WHERE l.qr_page_id=? AND l.business_id=? AND m.is_active=1
                         AND m.media_type IN ('cover','gallery')
                       ORDER BY FIELD(m.media_type,'cover','gallery'),m.sort_order,m.id
                       LIMIT 12`, [pageId, businessId])
        ]);
        const section = normalizeDirectoryDbValue({
            ...sections[0],
            settings_json: safeParseJSON(sections[0].settings_json),
            styles_json: safeParseJSON(sections[0].styles_json),
            blocks: blocks[0].map(block => ({
                ...block,
                content_json: safeParseJSON(block.content_json),
                styles_json: safeParseJSON(block.styles_json)
            }))
        });
        const effectiveMedia = [];
        const usedUrls = new Set();
        const appendMedia = (source, fallbackId) => {
            const normalized = normalizeDirectoryDbValue(source);
            const url = typeof normalized === "string"
                ? normalized
                : normalized?.url || normalized?.src || normalized?.image_url || normalized?.imageUrl;
            if (!url || usedUrls.has(url) || effectiveMedia.length >= 12) return;
            usedUrls.add(url);
            effectiveMedia.push({
                id: normalized?.id || fallbackId,
                media_type: normalized?.media_type || "gallery",
                url,
                alt_text: normalized?.alt_text || normalized?.alt || normalized?.imageAlt || "",
                sort_order: effectiveMedia.length
            });
        };
        normalizeDirectoryDbValue(media[0]).forEach(item => appendMedia(item, `directory-media-${item.id}`));
        return Response.json({ ok: true, section, directoryMedia: effectiveMedia });
    }
    const web = await getDirectoryWebPageData(pageId, { includeDraft: true });
    return Response.json({ ok: true, web });
}

export async function POST(request) {
    const body = await request.json().catch(() => null);
    const businessId = Number(body?.businessId || 0);
    const pageId = Number(body?.pageId || 0);
    if (!businessId || !pageId || !body) return Response.json({ error: "Solicitud inválida" }, { status: 400 });
    const access = await requireQRPageAccess(businessId, { skipQRPageValidation: true });
    if (!access.ok) return Response.json({ error: access.error }, { status: access.status });
    const page = await pageFor(businessId, pageId);
    if (!page) return Response.json({ error: "Web Directory no encontrada" }, { status: 404 });
    const globalStyles = parse(page.global_styles);
    const current = getDirectoryModuleSettings(globalStyles);
    const requested = body.modules || {};
    const modules = DIRECTORY_MODULE_CODES.reduce((result, code, index) => {
        result[code] = {
            enabled: requested?.[code]?.enabled !== false,
            sortOrder: Number(requested?.[code]?.sortOrder || current?.[code]?.sortOrder || (1000 + index * 10)),
            content: {
                ...(current?.[code]?.content || {}),
                ...(requested?.[code]?.content || {})
            }
        };
        return result;
    }, {});
    const [sectionRows] = await db.query("SELECT id FROM tags_qr_page_sections WHERE page_id=?", [pageId]);
    const allowedSectionIds = new Set(sectionRows.map(row => Number(row.id)));
    const sectionGroups = body.sectionGroups === undefined
        ? normalizeDirectorySectionGroups(globalStyles.directorySectionGroups, allowedSectionIds)
        : normalizeDirectorySectionGroups(body.sectionGroups, allowedSectionIds);
    const requestedLayout = normalizeLayoutOrder(body.layoutOrder, new Set(sectionGroups.map(group => group.id)), allowedSectionIds);
    const nextStyles = {
        ...globalStyles,
        directoryModules: modules,
        directorySectionGroups: sectionGroups,
        ...(requestedLayout ? { directoryLayoutOrder: requestedLayout } : {})
    };
    await db.query("UPDATE tags_qr_pages SET global_styles=?,updated_at=NOW() WHERE id=? AND business_id=? AND page_type='directory'", [JSON.stringify(nextStyles), pageId, businessId]);
    return Response.json({ ok: true, modules, globalStyles: nextStyles });
}
