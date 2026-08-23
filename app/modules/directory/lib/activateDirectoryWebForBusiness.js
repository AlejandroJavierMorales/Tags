import { createSlug } from "@/app/modules/qr-page/lib/createSlug";
import { createAppQRCode } from "@/app/modules/qr/lib/createAppQRCode";
import { createQRPageFromTemplate } from "@/app/modules/qr-page/lib/createQRPageFromTemplate";
import { registerQRAddonUsage } from "@/app/modules/addons/lib/registerQRAddonUsage";
import { getDefaultDirectoryTemplate } from "@/app/modules/directory/lib/getDefaultDirectoryTemplate";

async function synchronizeDirectoryActivation({
    conn,
    business,
    businessId,
    listing,
    pageId,
    qrId,
    publicUrl,
    logoUrl = null
}) {
    await conn.query(
        `UPDATE tags_qr_pages
            SET qr_code_id=?,status='published',updated_at=NOW()
          WHERE id=? AND business_id=? AND page_type='directory'`,
        [qrId, pageId, businessId]
    );
    await conn.query(
        `UPDATE tags_directory_listings
            SET qr_page_id=?,display_name=?,short_description=COALESCE(NULLIF(?,''),short_description),
                email=?,phone=?,whatsapp=?,website_url=?,address=?,social_config=?,updated_at=NOW()
          WHERE id=? AND business_id=?`,
        [pageId, business.name, business.description || listing.description || listing.short_description || "", business.email || null, business.phone || null, business.whatsapp || null, business.website_url || null, business.address || null, JSON.stringify({ instagram: business.instagram_url || null, facebook: business.facebook_url || null }), listing.id, businessId]
    );
    await conn.query(
        "UPDATE tags_directory_site_listings SET is_free=0,publication_status='published',published_at=COALESCE(published_at,NOW()) WHERE id=?",
        [listing.site_listing_id]
    );
    await conn.query(
        "UPDATE tags_qr_codes SET has_qr_page=1,is_active=1,status='active',value=?,final_url=? WHERE id=? AND business_id=?",
        [publicUrl, publicUrl, qrId, businessId]
    );
    await conn.query(
        "UPDATE tags_businesses SET qr_page_enabled=1,logo_url=COALESCE(NULLIF(logo_url,''),?) WHERE id=?",
        [logoUrl, businessId]
    );
    await registerQRAddonUsage({ conn, qrCodeId: qrId, businessId, addonCode: "directory", sourceTable: "tags_directory_listings", sourceId: listing.id });

    const [[linked]] = await conn.query(
        `SELECT l.qr_page_id,p.qr_code_id
           FROM tags_directory_listings l
           INNER JOIN tags_qr_pages p ON p.id=l.qr_page_id AND p.business_id=l.business_id
           INNER JOIN tags_qr_codes q ON q.id=p.qr_code_id AND q.business_id=p.business_id
          WHERE l.id=? AND l.business_id=? AND p.page_type='directory' LIMIT 1`,
        [listing.id, businessId]
    );
    if (!linked?.qr_page_id || !linked?.qr_code_id) {
        throw new Error("No se pudo vincular la Web con su QR-Page");
    }
}

export async function activateDirectoryWebForBusiness({ conn, businessId, siteId, origin }) {
    const [[business]] = await conn.query("SELECT * FROM tags_businesses WHERE id=? LIMIT 1", [businessId]);
    if (!business) throw new Error("Negocio no encontrado");

    const [[listing]] = await conn.query(
        `SELECT l.*, sl.id site_listing_id, sl.slug site_slug
           FROM tags_directory_listings l
           INNER JOIN tags_directory_site_listings sl ON sl.listing_id=l.id AND sl.site_id=?
          WHERE l.business_id=? LIMIT 1 FOR UPDATE`,
        [siteId, businessId]
    );
    if (!listing) throw new Error("La ficha no está asignada al Directorio");

    const [[existing]] = await conn.query(
        "SELECT id,slug,qr_code_id FROM tags_qr_pages WHERE business_id=? AND page_type='directory' LIMIT 1 FOR UPDATE",
        [businessId]
    );
    const pageSlug = createSlug(listing.site_slug || business.name) || `directorio-${businessId}`;
    const publicUrl = `${String(origin || "").replace(/\/+$/, "")}/${listing.site_slug}`;

    if (existing) {
        let qrId = Number(existing.qr_code_id || 0);
        if (qrId) {
            const [[ownedQr]] = await conn.query(
                "SELECT id FROM tags_qr_codes WHERE id=? AND business_id=? LIMIT 1 FOR UPDATE",
                [qrId, businessId]
            );
            if (!ownedQr) qrId = 0;
        }
        if (!qrId) {
            const qr = await createAppQRCode({
                conn,
                businessId,
                label: business.name,
                value: publicUrl,
                finalUrl: publicUrl,
                status: "active",
                allowTrial: true
            });
            qrId = qr.id;
        }
        await synchronizeDirectoryActivation({ conn, business, businessId, listing, pageId: existing.id, qrId, publicUrl, logoUrl: business.logo_url || null });
        return { pageId: existing.id, qrId, slug: existing.slug, publicUrl, alreadyActive: true };
    }

    const [[collision]] = await conn.query("SELECT id FROM tags_qr_pages WHERE slug=? LIMIT 1", [pageSlug]);
    const finalPageSlug = collision ? createSlug(`directory-${businessId}-${pageSlug}`) : pageSlug;

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
    const template = getDefaultDirectoryTemplate(templateBusiness);
    const galleryBlock = template.sections.find(section => section.settings_json?.directoryBaseSlot === "gallery")?.blocks?.[0];
    if (galleryBlock) {
        galleryBlock.content_json.images = legacyMedia
            .filter(item => ["cover", "gallery"].includes(item.media_type))
            .slice(0, 8)
            .map(item => ({ url: item.url, alt: item.alt_text || "" }));
    }

    const qr = await createAppQRCode({
        conn,
        businessId,
        label: business.name,
        value: publicUrl,
        finalUrl: publicUrl,
        status: "active",
        allowTrial: true
    });
    const { pageId } = await createQRPageFromTemplate({
        conn,
        business: templateBusiness,
        businessId,
        qrCodeId: qr.id,
        slug: finalPageSlug,
        title: business.name,
        status: "published",
        pageType: "directory",
        templateOverride: template
    });

    await synchronizeDirectoryActivation({ conn, business: templateBusiness, businessId, listing, pageId, qrId: qr.id, publicUrl, logoUrl: templateBusiness.logo_url });

    return { pageId, qrId: qr.id, slug: finalPageSlug, publicUrl, alreadyActive: false };
}
