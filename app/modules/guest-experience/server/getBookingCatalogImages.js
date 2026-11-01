import { db } from "@/app/lib/tags-db";

export async function getBookingCatalogImages(businessId) {
  const [rows] = await db.query(
    `SELECT p.title,img.image_url
       FROM tags_stores s
       INNER JOIN tags_store_products p
         ON p.store_id=s.id AND p.status='published' AND p.is_visible=1
       INNER JOIN tags_store_product_images img
         ON img.product_id=p.id AND img.is_primary=1
      WHERE s.business_id=?
      ORDER BY p.is_featured DESC,p.created_at DESC,p.id DESC
      LIMIT 100`,
    [Number(businessId)],
  );
  return rows.filter(row => row.image_url).map(row => ({ url: row.image_url, alt: row.title || "" }));
}
