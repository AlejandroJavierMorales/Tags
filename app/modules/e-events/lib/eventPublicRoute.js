import { db } from "@/app/lib/tags-db";

function normalizeHost(value) {
    return String(value || "").trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export async function getEventDirectoryRoute({ eventId = null, publicSlug = null, executor = db } = {}) {
    if (!eventId && !publicSlug) return null;
    const [rows] = await executor.query(
        `SELECT sl.slug AS directory_slug,s.primary_host
           FROM tags_events e
           INNER JOIN tags_event_registration_settings ers ON ers.event_id=e.id
           INNER JOIN tags_directory_listings l ON l.business_id=e.business_id AND l.status='published'
           INNER JOIN tags_directory_site_listings sl ON sl.listing_id=l.id AND sl.publication_status='published'
           INNER JOIN tags_directory_sites s ON s.id=sl.site_id AND s.is_active=1
          WHERE ${eventId ? "e.id=?" : "ers.public_slug=?"}
            AND EXISTS (
                SELECT 1 FROM tags_business_addons ba
                 WHERE ba.business_id=e.business_id
                   AND TRIM(LOWER(ba.addon_code))=e.product_code
                   AND ba.status='active'
                   AND (ba.expires_at IS NULL OR ba.expires_at>=NOW())
            )
          ORDER BY (s.code='calamuchitar') DESC,s.id,sl.id
          LIMIT 1`,
        [eventId || publicSlug]
    );
    const row = rows[0];
    if (!row?.directory_slug) return null;
    const path = `/${row.directory_slug}/eventos/${publicSlug || ""}`.replace(/\/$/, "");
    return { ...row, primary_host: normalizeHost(row.primary_host), path };
}
