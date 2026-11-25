import { db } from "@/app/lib/tags-db";
import { normalizeDirectoryDbValue } from "@/app/modules/directory/lib/normalizeDirectoryDbValue";

const REQUIRED_TABLES = [
  "tags_destination_audit_log",
  "tags_destination_corridors",
  "tags_destination_experience_contents",
  "tags_destination_experience_places",
  "tags_destination_experience_segments",
  "tags_destination_experiences",
  "tags_destination_place_profiles",
  "tags_destination_segment_places",
  "tags_destination_segments",
];

function count(value) {
  return Number(value || 0);
}

export async function getDestinationCorridorSchemaState(connection = db) {
  const [rows] = await connection.execute(
    `SELECT TABLE_NAME
       FROM information_schema.TABLES
      WHERE TABLE_SCHEMA=DATABASE()
        AND TABLE_NAME LIKE 'tags\\_destination\\_%' ESCAPE '\\\\'`
  );
  const available = new Set(rows.map((row) => String(row.TABLE_NAME)));
  const missingTables = REQUIRED_TABLES.filter((table) => !available.has(table));
  return {
    ready: missingTables.length === 0,
    availableTables: REQUIRED_TABLES.filter((table) => available.has(table)),
    missingTables,
  };
}

export async function getDestinationCorridorBootstrap(siteCode) {
  const normalizedCode = String(siteCode || "").trim().toLowerCase();
  if (!normalizedCode) return null;

  const [[siteRows], schema] = await Promise.all([
    db.execute(
      `SELECT id,code,name,primary_host,brand_config,seo_config,directory_config,is_active
         FROM tags_directory_sites
        WHERE code=?
        LIMIT 1`,
      [normalizedCode]
    ),
    getDestinationCorridorSchemaState(),
  ]);

  const site = normalizeDirectoryDbValue(siteRows[0] || null);
  if (!site) return null;

  if (!schema.ready) {
    return {
      site,
      schema,
      summary: null,
      sources: [],
      corridors: [],
      experiences: [],
      placeProfiles: [],
    };
  }

  const siteId = Number(site.id);
  const [sourceResult, corridorResult, experienceResult, placeResult, summaryResult] = await Promise.all([
    db.execute(
      `SELECT id,name,source_kind,locality_name,website_url,status,updated_at
         FROM tags_ai_tourism_sources
        WHERE site_id=?
        ORDER BY name,id`,
      [siteId]
    ),
    db.execute(
      `SELECT c.id,c.code,c.slug,c.name,c.eyebrow,c.summary,c.description,c.start_place_id,c.end_place_id,
              c.distance_km,c.status,c.source_checked_at,c.reviewed_at,c.published_at,c.updated_at,
              c.source_id,c.source_url,
              (SELECT COUNT(*) FROM tags_destination_segments s WHERE s.corridor_id=c.id) segment_count,
              (SELECT COUNT(*) FROM tags_destination_segments s WHERE s.corridor_id=c.id AND s.status='published') published_segment_count
         FROM tags_destination_corridors c
        WHERE c.site_id=?
        ORDER BY c.created_at,c.id`,
      [siteId]
    ),
    db.execute(
      `SELECT e.id,e.code,e.slug,e.name,e.short_name,e.summary,e.description,e.sort_order,e.icon_url,
              e.cover_image_url,e.status,e.source_checked_at,e.reviewed_at,e.published_at,e.updated_at,
              e.seo_title,e.seo_description,e.source_id,e.source_url,
              (SELECT COUNT(*) FROM tags_destination_experience_contents ec WHERE ec.experience_id=e.id) content_count,
              (SELECT COUNT(*) FROM tags_destination_experience_places ep WHERE ep.experience_id=e.id) place_count,
              (SELECT COUNT(*) FROM tags_destination_experience_segments es WHERE es.experience_id=e.id) segment_count
         FROM tags_destination_experiences e
        WHERE e.site_id=?
        ORDER BY e.sort_order,e.name,e.id`,
      [siteId]
    ),
    db.execute(
      `SELECT p.id,p.place_id,p.public_slug,p.title,p.summary,p.is_emerging_destination,
              p.is_on_corridor,p.sort_order,p.status,p.source_checked_at,p.reviewed_at,p.published_at,p.updated_at,
              g.name place_name,g.place_type,g.latitude,g.longitude,g.is_active place_is_active
         FROM tags_destination_place_profiles p
         INNER JOIN tags_geo_places g ON g.id=p.place_id
        WHERE p.site_id=?
        ORDER BY p.sort_order,p.title,p.id`,
      [siteId]
    ),
    db.execute(
      `SELECT
          (SELECT COUNT(*) FROM tags_destination_corridors WHERE site_id=?) corridor_total,
          (SELECT COUNT(*) FROM tags_destination_corridors WHERE site_id=? AND status='published') corridor_published,
          (SELECT COUNT(*) FROM tags_destination_segments s INNER JOIN tags_destination_corridors c ON c.id=s.corridor_id WHERE c.site_id=?) segment_total,
          (SELECT COUNT(*) FROM tags_destination_place_profiles WHERE site_id=?) place_profile_total,
          (SELECT COUNT(*) FROM tags_destination_experiences WHERE site_id=?) experience_total,
          (SELECT COUNT(*) FROM tags_ai_tourism_contents WHERE site_id=? AND status='published') tourism_content_published,
          (SELECT COUNT(*) FROM tags_ai_tourism_sources WHERE site_id=? AND status='active') tourism_source_active`,
      [siteId, siteId, siteId, siteId, siteId, siteId, siteId]
    ),
  ]);

  const rawSummary = summaryResult[0][0] || {};
  return normalizeDirectoryDbValue({
    site,
    schema,
    summary: {
      corridorTotal: count(rawSummary.corridor_total),
      corridorPublished: count(rawSummary.corridor_published),
      segmentTotal: count(rawSummary.segment_total),
      placeProfileTotal: count(rawSummary.place_profile_total),
      experienceTotal: count(rawSummary.experience_total),
      tourismContentPublished: count(rawSummary.tourism_content_published),
      tourismSourceActive: count(rawSummary.tourism_source_active),
    },
    sources: sourceResult[0],
    corridors: corridorResult[0],
    experiences: experienceResult[0],
    placeProfiles: placeResult[0],
  });
}
