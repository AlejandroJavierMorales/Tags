import { db } from "@/app/lib/tags-db";
import { resolveBusinessChatCapabilities } from "@/app/modules/ai-chat/server/businessChatCapabilities.mjs";

export async function getBusinessChatCapabilities(businessId) {
  const id = Number(businessId || 0);
  if (!id) return resolveBusinessChatCapabilities();
  const [addons] = await db.query(`SELECT addon_code FROM tags_business_addons
    WHERE business_id=? AND status='active' AND (expires_at IS NULL OR expires_at>=NOW())`, [id]);
  const addonCodes = addons.map(row => String(row.addon_code || "")).filter(Boolean);
  if (!addonCodes.includes("guest_experience")) return resolveBusinessChatCapabilities({ addonCodes });
  const [apps] = await db.query("SELECT id,business_id,name,slug,currency,status,settings_json FROM tags_guest_apps WHERE business_id=? ORDER BY (status='published') DESC,id DESC LIMIT 1", [id]);
  const app = apps[0];
  if (!app) return resolveBusinessChatCapabilities({ addonCodes });
  const [listings] = await db.query(`SELECT sl.slug
    FROM tags_directory_listings l
    INNER JOIN tags_directory_site_listings sl ON sl.listing_id=l.id AND sl.publication_status='published'
    WHERE l.business_id=? AND l.status='published'
    ORDER BY sl.id LIMIT 1`, [id]);
  return resolveBusinessChatCapabilities({ addonCodes, guestApp: app, listingSlug: listings[0]?.slug || "" });
}
