import { db } from "@/app/lib/tags-db";
import { requireQRPageAccess } from "@/app/modules/qr-page/lib/requireQRPageAccess";
import DirectoryWebBuilderClient from "@/app/modules/directory/components/admin/DirectoryWebBuilderClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Administrar mi Web | Tags", robots: { index: false, follow: false } };

export default async function DirectoryBusinessPage({ params }) {
  const { id } = await params;
  const businessId = Number(id);
  const access = await requireQRPageAccess(businessId, { skipQRPageValidation: true });
  if (!access.ok) return <main className="tags_dashboard_page"><h2>Sin acceso</h2><p>{access.error}</p></main>;

  const [rows] = await db.query(`SELECT p.qr_code_id,l.*,sl.slug,s.primary_host,s.name site_name,s.code site_code,
      (SELECT gp.name FROM tags_directory_listing_places lp INNER JOIN tags_geo_places gp ON gp.id=lp.place_id WHERE lp.listing_id=l.id AND lp.relation_type='location' ORDER BY lp.is_primary DESC LIMIT 1) locality_name
    FROM tags_qr_pages p
    INNER JOIN tags_directory_listings l ON l.qr_page_id=p.id AND l.business_id=p.business_id
    LEFT JOIN tags_directory_site_listings sl ON sl.listing_id=l.id
    LEFT JOIN tags_directory_sites s ON s.id=sl.site_id
    WHERE p.business_id=? AND p.page_type='directory'
    ORDER BY sl.id LIMIT 1`, [businessId]);
  const listing = rows[0];
  if (!listing?.qr_code_id) return <main className="tags_dashboard_page"><h2>Web no activada</h2><p>Volvé al negocio y activá Mi Web.</p></main>;

  const [media] = await db.query("SELECT id,media_type,url,alt_text,sort_order FROM tags_directory_media WHERE listing_id=? AND is_active=1 ORDER BY sort_order,id", [listing.id]);
  const publicUrl = listing.slug
    ? (process.env.NODE_ENV === "development" ? `/${listing.slug}` : `https://${listing.primary_host}/${listing.slug}`)
    : null;
  const directoryData = { listing: { ...listing }, media: media.map(item => ({ ...item })), taxonomy: [] };

  return <DirectoryWebBuilderClient businessId={businessId} qrCodeId={listing.qr_code_id} business={access.business} publicUrl={publicUrl} directoryData={directoryData} />;
}
