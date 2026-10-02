import { db } from "@/app/lib/tags-db";
import { directoryImageUrl } from "@/app/modules/directory/lib/directoryPublicFormatting";

export async function getDestinationMapPoints(siteCode){
  if(!/^[a-z0-9_-]{2,60}$/i.test(String(siteCode||"")))return[];
  try{
    const [rows]=await db.execute(`SELECT l.listing_id id,l.name display_name,l.summary short_description,l.phone,l.whatsapp,l.address,l.latitude,l.longitude,l.locality_name,l.public_url,l.primary_image_url image_url,'business' layer,
      (SELECT GROUP_CONCAT(DISTINCT n.name ORDER BY n.name SEPARATOR ' | ')
         FROM tags_ai_search_location_categories lc
         INNER JOIN tags_directory_taxonomy_closure tc ON tc.descendant_id=lc.taxonomy_node_id
         INNER JOIN tags_directory_taxonomy_nodes n ON n.id=tc.ancestor_id
        WHERE lc.search_location_id=l.id AND lc.site_id=l.site_id AND lc.assignment_status<>'rejected') category_names,
      (SELECT n.image_url
         FROM tags_ai_search_location_categories lc
         INNER JOIN tags_directory_taxonomy_nodes n ON n.id=lc.taxonomy_node_id
        WHERE lc.search_location_id=l.id AND lc.site_id=l.site_id AND lc.assignment_status<>'rejected' AND n.image_url IS NOT NULL AND n.image_url<>''
        ORDER BY n.depth DESC,lc.is_primary DESC,n.sort_order,n.name LIMIT 1) category_icon_url,
      (SELECT n.depth
         FROM tags_ai_search_location_categories lc
         INNER JOIN tags_directory_taxonomy_nodes n ON n.id=lc.taxonomy_node_id
        WHERE lc.search_location_id=l.id AND lc.site_id=l.site_id AND lc.assignment_status<>'rejected' AND n.image_url IS NOT NULL AND n.image_url<>''
        ORDER BY n.depth DESC,lc.is_primary DESC,n.sort_order,n.name LIMIT 1) category_icon_depth,
      (SELECT GROUP_CONCAT(DISTINCT a.alias_value ORDER BY a.alias_value SEPARATOR ' | ')
         FROM tags_ai_search_location_categories lc
         INNER JOIN tags_directory_taxonomy_closure tc ON tc.descendant_id=lc.taxonomy_node_id
         INNER JOIN tags_ai_taxonomy_aliases a ON a.taxonomy_node_id=tc.ancestor_id AND a.site_id=l.site_id AND a.status='active'
        WHERE lc.search_location_id=l.id AND lc.site_id=l.site_id AND lc.assignment_status<>'rejected') search_aliases,
      (SELECT GROUP_CONCAT(DISTINCT CONCAT_WS(' ',i.name,i.category_text) ORDER BY i.name SEPARATOR ' | ')
         FROM tags_ai_search_items i
        WHERE i.search_location_id=l.id AND i.site_id=l.site_id AND i.visibility='public' AND i.verification_status<>'rejected') item_names
      FROM tags_ai_search_locations l INNER JOIN tags_directory_sites s ON s.id=l.site_id AND s.code=? AND s.is_active=1
      WHERE l.visibility='public' AND l.latitude IS NOT NULL AND l.longitude IS NOT NULL AND l.latitude BETWEEN -90 AND 90 AND l.longitude BETWEEN -180 AND 180 AND NOT(l.latitude=0 AND l.longitude=0)
      UNION ALL
      SELECT c.id,c.title,c.summary,NULL,NULL,c.address,c.latitude,c.longitude,c.locality_name,c.public_url,c.primary_image_url,c.content_type,
      (SELECT GROUP_CONCAT(DISTINCT n.name ORDER BY n.name SEPARATOR ' | ')
         FROM tags_ai_tourism_content_categories cc
         INNER JOIN tags_directory_taxonomy_closure tc ON tc.descendant_id=cc.taxonomy_node_id
         INNER JOIN tags_directory_taxonomy_nodes n ON n.id=tc.ancestor_id
        WHERE cc.content_id=c.id AND cc.site_id=c.site_id) category_names,
      (SELECT n.image_url
         FROM tags_ai_tourism_content_categories cc
         INNER JOIN tags_directory_taxonomy_nodes n ON n.id=cc.taxonomy_node_id
        WHERE cc.content_id=c.id AND cc.site_id=c.site_id AND n.image_url IS NOT NULL AND n.image_url<>''
        ORDER BY n.depth DESC,n.sort_order,n.name LIMIT 1) category_icon_url,
      (SELECT n.depth
         FROM tags_ai_tourism_content_categories cc
         INNER JOIN tags_directory_taxonomy_nodes n ON n.id=cc.taxonomy_node_id
        WHERE cc.content_id=c.id AND cc.site_id=c.site_id AND n.image_url IS NOT NULL AND n.image_url<>''
        ORDER BY n.depth DESC,n.sort_order,n.name LIMIT 1) category_icon_depth,
      (SELECT GROUP_CONCAT(DISTINCT a.alias_value ORDER BY a.alias_value SEPARATOR ' | ')
         FROM tags_ai_tourism_content_categories cc
         INNER JOIN tags_directory_taxonomy_closure tc ON tc.descendant_id=cc.taxonomy_node_id
         INNER JOIN tags_ai_taxonomy_aliases a ON a.taxonomy_node_id=tc.ancestor_id AND a.site_id=c.site_id AND a.status='active'
        WHERE cc.content_id=c.id AND cc.site_id=c.site_id) search_aliases,
      NULL item_names
      FROM tags_ai_tourism_contents c INNER JOIN tags_directory_sites s ON s.id=c.site_id AND s.code=? AND s.is_active=1
      WHERE c.status='published' AND (c.valid_until IS NULL OR c.valid_until>=NOW()) AND c.latitude IS NOT NULL AND c.longitude IS NOT NULL AND c.latitude BETWEEN -90 AND 90 AND c.longitude BETWEEN -180 AND 180 AND NOT(c.latitude=0 AND c.longitude=0)
      ORDER BY display_name LIMIT 1000`,[siteCode,siteCode]);
    return rows.map(row=>({...row,latitude:Number(row.latitude),longitude:Number(row.longitude),category_icon_url:directoryImageUrl(row.category_icon_url,Number(row.category_icon_depth||0))}));
  }catch(error){if(["ER_NO_SUCH_TABLE","ER_BAD_FIELD_ERROR"].includes(error?.code))return[];throw error;}
}
