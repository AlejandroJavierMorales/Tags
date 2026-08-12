export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { createSlug } from "@/app/modules/qr-page/lib/createSlug";
import { requireQRPageAccess } from "@/app/modules/qr-page/lib/requireQRPageAccess";
import { createAppQRCode } from "@/app/modules/qr/lib/createAppQRCode";
import { createQRPageFromTemplate } from "@/app/modules/qr-page/lib/createQRPageFromTemplate";
import { registerQRAddonUsage } from "@/app/modules/addons/lib/registerQRAddonUsage";
import { getDefaultDirectoryTemplate } from "@/app/modules/directory/lib/getDefaultDirectoryTemplate";

function baseUrl() {
    return process.env.NODE_ENV === "development" ? "http://localhost:3000" : process.env.NEXT_PUBLIC_BASE_URL_PROD;
}

export async function POST(req) {
    const body = await req.json().catch(() => null);
    const businessId = Number(body?.businessId || 0);
    if (!body || !businessId) return Response.json({ error: "Solicitud inválida" }, { status: 400 });

    const access = await requireQRPageAccess(businessId, { skipQRPageValidation: true });
    if (!access.ok) return Response.json({ error: access.error }, { status: access.status });

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const [addons] = await conn.query(
            "SELECT id FROM tags_business_addons WHERE business_id=? AND addon_code='directory' AND status='active' AND (expires_at IS NULL OR expires_at>=NOW()) LIMIT 1 FOR UPDATE",
            [businessId]
        );
        if (!addons.length) {
            await conn.rollback();
            return Response.json({ error: "El cliente no tiene Directorio activo" }, { status: 403 });
        }

        const [existingPages] = await conn.query(
            "SELECT id,qr_code_id,slug FROM tags_qr_pages WHERE business_id=? AND page_type='directory' LIMIT 1",
            [businessId]
        );
        if (existingPages.length) {
            await conn.rollback();
            return Response.json({ error: "La Web del Directorio ya está activada", pageId: existingPages[0].id }, { status: 409 });
        }

        const [listings] = await conn.query(
            `SELECT l.*,
                (SELECT sl.slug
                 FROM tags_directory_site_listings sl
                 WHERE sl.listing_id=l.id
                 AND EXISTS (
                    SELECT 1 FROM tags_legacy_routes lr
                    WHERE lr.listing_id=l.id AND lr.site_id=sl.site_id AND lr.is_active=1
                    AND TRIM(BOTH '/' FROM lr.legacy_path)=sl.slug
                 )
                 ORDER BY sl.id LIMIT 1) historical_slug,
                (SELECT COUNT(*) FROM tags_directory_site_listings sl WHERE sl.listing_id=l.id) channel_count
             FROM tags_directory_listings l
             WHERE l.business_id=? LIMIT 1 FOR UPDATE`,
            [businessId]
        );
        const listing = listings[0];
        if (!listing) {
            await conn.rollback();
            return Response.json({ error: "La plataforma todavía no creó la ficha y sus canales" }, { status: 409 });
        }
        if (!Number(listing.channel_count || 0)) {
            await conn.rollback();
            return Response.json({ error: "La plataforma todavía no asignó ningún Directorio" }, { status: 409 });
        }

        const requestedSlug = createSlug(body.slug || body.name || access.business.name);
        const publicSlug = createSlug(listing.historical_slug || requestedSlug);
        if (!publicSlug) {
            await conn.rollback();
            return Response.json({ error: "Slug inválido" }, { status: 400 });
        }

        if (!listing.historical_slug) {
            const [collisions] = await conn.query(
                `SELECT sl.id
                 FROM tags_directory_site_listings own
                 INNER JOIN tags_directory_site_listings sl
                    ON sl.site_id=own.site_id AND sl.slug=? AND sl.listing_id<>own.listing_id
                 WHERE own.listing_id=? LIMIT 1`,
                [publicSlug, listing.id]
            );
            if (collisions.length) {
                await conn.rollback();
                return Response.json({ error: "Ese slug ya está en uso en uno de los Directorios" }, { status: 409 });
            }
            await conn.query("UPDATE tags_directory_site_listings SET slug=? WHERE listing_id=?", [publicSlug, listing.id]);
        }

        let pageSlug = publicSlug;
        const [pageSlugRows] = await conn.query("SELECT id FROM tags_qr_pages WHERE slug=? LIMIT 1", [pageSlug]);
        if (pageSlugRows.length) pageSlug = createSlug(`directory-${businessId}-${publicSlug}`);

        const [businessRows] = await conn.query("SELECT * FROM tags_businesses WHERE id=? LIMIT 1", [businessId]);
        const business = businessRows[0];
        const [legacyMedia] = await conn.query(
            "SELECT media_type,url,alt_text FROM tags_directory_media WHERE listing_id=? AND is_active=1 ORDER BY FIELD(media_type,'logo','cover','gallery'),sort_order,id LIMIT 10",
            [listing.id]
        );
        const templateBusiness = {
            ...business,
            description: business.description || listing.description || listing.short_description || "",
            logo_url: business.logo_url || legacyMedia.find(item => item.media_type === "logo")?.url || null,
            cover_url: business.cover_url || legacyMedia.find(item => item.media_type === "cover")?.url || null
        };

        const [channelRows] = await conn.query(
            "SELECT sl.slug,s.primary_host FROM tags_directory_site_listings sl INNER JOIN tags_directory_sites s ON s.id=sl.site_id WHERE sl.listing_id=? ORDER BY sl.id LIMIT 1",
            [listing.id]
        );
        const channel = channelRows[0];
        const publicUrl = process.env.NODE_ENV === "development"
            ? `${baseUrl()}/${channel.slug}`
            : `https://${channel.primary_host}/${channel.slug}`;

        const qr = await createAppQRCode({ conn, businessId, label: business.name, value: publicUrl, finalUrl: publicUrl, status: "active" });
        const template = getDefaultDirectoryTemplate(templateBusiness);
        const galleryBlock = template.sections.find(section => section.title === "Galería")?.blocks?.[0];
        if (galleryBlock) {
            galleryBlock.content_json.images = legacyMedia
                .filter(item => ["cover", "gallery"].includes(item.media_type))
                .slice(0, 8)
                .map(item => ({ url: item.url, alt: item.alt_text || "" }));
        }

        const { pageId } = await createQRPageFromTemplate({
            conn,
            business: templateBusiness,
            businessId,
            qrCodeId: qr.id,
            slug: pageSlug,
            title: business.name,
            status: "draft",
            pageType: "directory",
            templateOverride: template
        });

        await conn.query(
            "UPDATE tags_directory_listings SET qr_page_id=?,display_name=?,short_description=COALESCE(NULLIF(?,''),short_description),email=?,phone=?,whatsapp=?,website_url=?,address=?,social_config=?,updated_at=NOW() WHERE id=? AND business_id=?",
            [pageId, business.name, templateBusiness.description, business.email || null, business.phone || null, business.whatsapp || null, business.website_url || null, business.address || null, JSON.stringify({ instagram: business.instagram_url || null, facebook: business.facebook_url || null }), listing.id, businessId]
        );
        await conn.query("UPDATE tags_directory_site_listings SET is_free=0 WHERE listing_id=?", [listing.id]);
        await conn.query("UPDATE tags_qr_codes SET has_qr_page=1 WHERE id=? AND business_id=?", [qr.id, businessId]);
        await conn.query("UPDATE tags_businesses SET qr_page_enabled=1 WHERE id=?", [businessId]);
        await registerQRAddonUsage({ conn, qrCodeId: qr.id, businessId, addonCode: "directory", sourceTable: "tags_directory_listings", sourceId: listing.id });

        await conn.commit();
        return Response.json({ ok: true, listingId: listing.id, pageId, qrId: qr.id, slug: publicSlug, historicalSlug: Boolean(listing.historical_slug), publicUrl });
    } catch (error) {
        await conn.rollback();
        console.error("DIRECTORY ACTIVATE ERROR:", error);
        return Response.json({ error: error.message || "No se pudo activar la Web" }, { status: error.status || 500 });
    } finally {
        conn.release();
    }
}
