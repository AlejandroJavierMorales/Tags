import { db } from "@/app/lib/tags-db";
import { requireQRPageAccess } from "@/app/modules/qr-page/lib/requireQRPageAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const businessId = Number(new URL(request.url).searchParams.get("businessId") || 0);
  const access = await requireQRPageAccess(businessId, { skipQRPageValidation: true });
  if (!access.ok) return Response.json({ error: access.error }, { status: access.status });
  try {
    const [rows] = await db.query(
      `SELECT g.id group_id,g.product_code,g.name group_name,g.description group_description,
              v.id,v.title,v.description,v.video_url,v.sort_order
         FROM tags_directory_tutorial_groups g
         INNER JOIN tags_directory_tutorials v ON v.group_id=g.id AND v.status='published' AND v.is_active=1
        WHERE g.is_active=1 AND (
          g.product_code='general' OR g.site_id IN (
            SELECT sl.site_id FROM tags_directory_listings l
            INNER JOIN tags_directory_site_listings sl ON sl.listing_id=l.id
            WHERE l.business_id=? AND sl.publication_status='published'
          )
        )
        ORDER BY g.sort_order,g.name,v.sort_order,v.title`,
      [businessId]
    );
    const groups = [];
    const byId = new Map();
    rows.forEach(row => {
      if (!byId.has(Number(row.group_id))) {
        const group = { id: row.group_id, productCode: row.product_code, name: row.group_name, description: row.group_description, videos: [] };
        byId.set(Number(row.group_id), group); groups.push(group);
      }
      byId.get(Number(row.group_id)).videos.push({ id: row.id, title: row.title, description: row.description, videoUrl: row.video_url });
    });
    return Response.json({ ok: true, groups, total: rows.length });
  } catch (error) {
    if (["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR"].includes(error?.code)) return Response.json({ ok: true, groups: [], total: 0 });
    console.error("BUSINESS TUTORIALS ERROR", error);
    return Response.json({ error: "No se pudieron cargar los tutoriales" }, { status: 500 });
  }
}
