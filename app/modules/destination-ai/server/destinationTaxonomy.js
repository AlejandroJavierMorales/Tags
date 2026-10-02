import { db } from "@/app/lib/tags-db";
export { normalizeDestinationTerm, resolveTaxonomyTerms, taxonomyCatalogForPrompt } from "./destinationTaxonomyCore.js";

export async function getDestinationTaxonomyCatalog(siteCode) {
  if (!/^[a-z0-9_-]{2,60}$/i.test(String(siteCode || ""))) return [];
  const [rows] = await db.execute(
    `SELECT n.id,n.parent_id,n.name,n.slug,n.node_type,n.depth,
            GROUP_CONCAT(DISTINCT a.alias_value ORDER BY a.alias_value SEPARATOR ' | ') aliases
       FROM tags_directory_sites s
       INNER JOIN tags_directory_taxonomy_nodes n ON (n.site_id=s.id OR n.site_id IS NULL)
       LEFT JOIN tags_ai_taxonomy_aliases a
         ON a.site_id=s.id AND a.taxonomy_node_id=n.id AND a.status='active'
      WHERE s.code=? AND s.is_active=1 AND n.is_active=1
      GROUP BY n.id,n.parent_id,n.name,n.slug,n.node_type,n.depth
      ORDER BY n.depth,n.parent_id,n.sort_order,n.name`,
    [siteCode]
  ).catch(async error => {
    if (!["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR"].includes(error?.code)) throw error;
    const [fallback] = await db.execute(
      `SELECT n.id,n.parent_id,n.name,n.slug,n.node_type,n.depth,NULL aliases
         FROM tags_directory_sites s
         INNER JOIN tags_directory_taxonomy_nodes n ON (n.site_id=s.id OR n.site_id IS NULL)
        WHERE s.code=? AND s.is_active=1 AND n.is_active=1
        ORDER BY n.depth,n.parent_id,n.sort_order,n.name`,
      [siteCode]
    );
    return [fallback];
  });
  return rows.map(row => ({
    id: Number(row.id),
    parentId: row.parent_id == null ? null : Number(row.parent_id),
    name: row.name,
    slug: row.slug,
    type: row.node_type,
    depth: Number(row.depth || 0),
    aliases: String(row.aliases || "").split("|").map(value => value.trim()).filter(Boolean),
  }));
}
