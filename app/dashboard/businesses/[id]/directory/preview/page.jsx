import { db } from "@/app/lib/tags-db";
import { requireQRPageAccess } from "@/app/modules/qr-page/lib/requireQRPageAccess";
import { getDirectoryWebPageData } from "@/app/modules/directory/lib/getDirectoryWebPageData";
import DirectoryProviderRenderer from "@/app/modules/directory/components/public/DirectoryProviderRenderer";
import DirectoryEmbeddedStore from "@/app/modules/directory/components/public/DirectoryEmbeddedStore";
import DirectoryEmbeddedResto from "@/app/modules/directory/components/public/DirectoryEmbeddedResto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Vista previa de la Web", robots: { index: false, follow: false } };

export default async function DirectoryPreviewPage({params}){
  const {id}=await params,businessId=Number(id);
  const access=await requireQRPageAccess(businessId,{skipQRPageValidation:true});
  if(!access.ok)return <main><h2>Sin acceso</h2><p>{access.error}</p></main>;
  const [rows]=await db.query(`SELECT l.*,p.id page_id,(SELECT gp.name FROM tags_directory_listing_places lp INNER JOIN tags_geo_places gp ON gp.id=lp.place_id WHERE lp.listing_id=l.id AND lp.relation_type='location' ORDER BY lp.is_primary DESC LIMIT 1) locality_name FROM tags_directory_listings l INNER JOIN tags_qr_pages p ON p.id=l.qr_page_id AND p.page_type='directory' WHERE l.business_id=? LIMIT 1`,[businessId]);
  const listing=rows[0];
  if(!listing)return <main><h2>Web no encontrada</h2></main>;
  const [media]=await db.query("SELECT id,media_type,url,alt_text,sort_order FROM tags_directory_media WHERE listing_id=? AND is_active=1 ORDER BY sort_order,id",[listing.id]);
  const web=await getDirectoryWebPageData(listing.page_id,{includeDraft:true});
  const data={listing,media,taxonomy:[]},modules=web?.page?.global_styles?.directoryModules||{};
  return <DirectoryProviderRenderer data={data} web={web} standalone embeddedStoreName={web?.embeddedStore?.store?.name||"Tienda"} embeddedStoreContent={web?.embeddedStore&&modules.store?.enabled!==false?<DirectoryEmbeddedStore data={web.embeddedStore} returnUrl="#directory-section-store"/>:null} embeddedRestoName={web?.embeddedResto?.store?.name||"Gastronomía"} embeddedRestoContent={web?.embeddedResto&&modules.resto?.enabled!==false?<DirectoryEmbeddedResto data={web.embeddedResto} returnUrl="#directory-section-resto"/>:null}/>;
}
