export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { db } from "@/app/lib/tags-db";
import { requireDirectoryAdmin, directoryAdminError } from "@/app/modules/directory/lib/requireDirectoryAdmin";

export async function GET() {
    const access = await requireDirectoryAdmin(); if (!access.ok) return directoryAdminError(access);
    const [sites,taxonomy,places,businesses,listings] = await Promise.all([
        db.query("SELECT * FROM tags_directory_sites ORDER BY name"),
        db.query("SELECT n.*,p.name parent_name,(SELECT COUNT(*) FROM tags_directory_listing_taxonomy lt WHERE lt.taxonomy_node_id=n.id) listing_count FROM tags_directory_taxonomy_nodes n LEFT JOIN tags_directory_taxonomy_nodes p ON p.id=n.parent_id ORDER BY n.depth,n.sort_order,n.name"),
        db.query("SELECT g.*,p.name parent_name,(SELECT COUNT(*) FROM tags_directory_listing_places lp WHERE lp.place_id=g.id) listing_count FROM tags_geo_places g LEFT JOIN tags_geo_places p ON p.id=g.parent_id ORDER BY g.place_type,g.name"),
        db.query("SELECT id,name,email,phone,description,logo_url,cover_url,whatsapp,address,website_url,instagram_url,facebook_url FROM tags_businesses ORDER BY name"),
        db.query(`SELECT l.id,l.business_id,l.display_name,l.status,l.qr_page_id,b.email business_email,MIN(sl.is_free) is_free,SUM(sl.publication_status='published') published_count,GROUP_CONCAT(DISTINCT CONCAT(s.name,'|',sl.slug) ORDER BY s.name SEPARATOR ';;') channels,GROUP_CONCAT(DISTINCT sl.site_id) site_ids,GROUP_CONCAT(DISTINCT lt.taxonomy_node_id) taxonomy_ids,(SELECT lp.place_id FROM tags_directory_listing_places lp WHERE lp.listing_id=l.id AND lp.relation_type='location' ORDER BY lp.is_primary DESC LIMIT 1) place_id FROM tags_directory_listings l LEFT JOIN tags_businesses b ON b.id=l.business_id LEFT JOIN tags_directory_site_listings sl ON sl.listing_id=l.id LEFT JOIN tags_directory_sites s ON s.id=sl.site_id LEFT JOIN tags_directory_listing_taxonomy lt ON lt.listing_id=l.id GROUP BY l.id,l.business_id,l.display_name,l.status,l.qr_page_id,b.email ORDER BY l.display_name`)
    ]);
    return Response.json({ ok:true,sites:sites[0],taxonomy:taxonomy[0],places:places[0],businesses:businesses[0],listings:listings[0] });
}
