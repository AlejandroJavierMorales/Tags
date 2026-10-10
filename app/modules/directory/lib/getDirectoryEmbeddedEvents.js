import { db } from "@/app/lib/tags-db";
import { businessHasEventsAddon } from "@/app/modules/e-events/lib/eventAddonAccess";

export async function getDirectoryEmbeddedEvents(businessId, { includePast = false } = {}) {
    if (!await businessHasEventsAddon(businessId)) return [];
    const [rows] = await db.query(
        `SELECT e.id,e.name,e.description,e.location,e.starts_at,e.ends_at,e.cover_image,e.status,e.updated_at,
                s.public_slug,s.public_title,s.public_description,s.capacity,s.registration_opens_at,s.registration_closes_at,
                COALESCE(ps.payment_mode,'free') AS payment_mode,ps.ticket_price,COALESCE(ps.currency,'ARS') AS currency,
                COALESCE((SELECT SUM(1+GREATEST(COALESCE(a.plus_ones_confirmed,0),0))
                            FROM tags_event_attendees a
                           WHERE a.event_id=e.id AND a.status IN ('pending','confirmed','checked_in')),0) AS occupied
           FROM tags_events e
           INNER JOIN tags_event_registration_settings s ON s.event_id=e.id AND s.registration_enabled=1
           LEFT JOIN tags_event_payment_settings ps ON ps.event_id=e.id
          WHERE e.business_id=? AND e.status IN ('published','active')
            AND EXISTS (
                SELECT 1 FROM tags_business_addons ba
                 WHERE ba.business_id=e.business_id
                   AND TRIM(LOWER(ba.addon_code))=e.product_code
                   AND ba.status='active'
                   AND (ba.expires_at IS NULL OR ba.expires_at>=NOW())
            )
            ${includePast ? "" : "AND COALESCE(e.ends_at,e.starts_at)>=NOW()"}
          ORDER BY e.starts_at,e.id`,
        [Number(businessId)]
    );
    return rows.map(item => ({
        ...item,
        capacity: item.capacity == null ? null : Number(item.capacity),
        occupied: Number(item.occupied || 0),
        remaining: item.capacity == null ? null : Math.max(0, Number(item.capacity) - Number(item.occupied || 0))
    }));
}
