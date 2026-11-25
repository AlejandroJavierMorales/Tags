import { db } from "@/app/lib/tags-db";
import { normalizeDirectoryDbValue } from "@/app/modules/directory/lib/normalizeDirectoryDbValue";

const VISIBLE_PREVIEW_STATUSES = ["draft", "in_review", "published"];

export async function getRuta100PublicData(siteId) {
  const id = Number(siteId || 0);
  if (!Number.isSafeInteger(id) || id <= 0) return null;

  const [siteResult, corridorResult, experienceResult] = await Promise.all([
    db.execute(
      `SELECT id,code,name,primary_host,brand_config
         FROM tags_directory_sites
        WHERE id=? AND code='ruta100cordoba' AND is_active=1
        LIMIT 1`,
      [id]
    ),
    db.execute(
      `SELECT c.id,c.code,c.slug,c.name,c.eyebrow,c.summary,c.description,c.distance_km,
              c.status,c.source_url,c.source_checked_at,s.name source_name
         FROM tags_destination_corridors c
         LEFT JOIN tags_ai_tourism_sources s ON s.id=c.source_id AND s.site_id=c.site_id
        WHERE c.site_id=? AND c.status IN (?,?,?)
        ORDER BY (c.code='ruta-100-cordoba') DESC,c.id
        LIMIT 1`,
      [id, ...VISIBLE_PREVIEW_STATUSES]
    ),
    db.execute(
      `SELECT e.id,e.code,e.slug,e.name,e.short_name,e.summary,e.description,e.sort_order,
              e.icon_url,e.cover_image_url,e.seo_title,e.seo_description,e.status,
              e.source_url,e.source_checked_at,s.name source_name
         FROM tags_destination_experiences e
         LEFT JOIN tags_ai_tourism_sources s ON s.id=e.source_id AND s.site_id=e.site_id
        WHERE e.site_id=? AND e.status IN (?,?,?)
        ORDER BY e.sort_order,e.name,e.id`,
      [id, ...VISIBLE_PREVIEW_STATUSES]
    ),
  ]);

  const site = siteResult[0][0];
  const corridor = corridorResult[0][0];
  if (!site || !corridor) return null;

  const experiences = experienceResult[0];
  return normalizeDirectoryDbValue({
    site,
    corridor,
    experiences,
    fullyPublished: corridor.status === "published" && experiences.length === 10 && experiences.every((item) => item.status === "published"),
  });
}

export async function getRuta100ExperienceBySlug(siteId, slug) {
  const data = await getRuta100PublicData(siteId);
  if (!data) return null;
  const normalizedSlug = String(slug || "").trim().toLowerCase();
  const experience = data.experiences.find((item) => item.slug === normalizedSlug);
  return experience ? { ...data, experience } : null;
}
