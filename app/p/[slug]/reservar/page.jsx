import { notFound } from "next/navigation";
import { db } from "@/app/lib/tags-db";
import { parseGuestJson } from "@/app/modules/guest-experience/lib/guestExperienceService";
import { getDirectoryThemeStyleForBusiness } from "@/app/modules/directory/lib/getDirectoryThemeStyleForBusiness";
import LodgingBookingPage from "@/app/modules/guest-experience/components/public/LodgingBookingPage";
import { selectBusinessBookingHeroImages } from "@/app/modules/guest-experience/lib/selectBookingHeroImages";
import { getBookingCatalogImages } from "@/app/modules/guest-experience/server/getBookingCatalogImages";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function generateMetadata({params}){const{slug}=await params;const[rows]=await db.query("SELECT name FROM tags_guest_apps WHERE BINARY slug=BINARY ? AND status='published' LIMIT 1",[slug]);const app=rows[0];return{title:app?`Reservar | ${app.name}`:"Reservar alojamiento",description:app?`Consultá disponibilidad para alojarte en ${app.name}.`:"Consultá disponibilidad de alojamiento."}}

export default async function LodgingBookingRoute({params}) {
  const {slug}=await params;
  const [rows]=await db.query(`SELECT a.id,a.business_id,a.name,a.slug,a.logo_url,a.cover_url,a.welcome_message,a.currency,a.settings_json,b.logo_url business_logo_url,b.cover_url business_cover_url
    FROM tags_guest_apps a INNER JOIN tags_businesses b ON b.id=a.business_id
    WHERE BINARY a.slug=BINARY ? AND a.status='published' LIMIT 1`,[slug]);
  const app=rows[0];
  if(!app)notFound();
  const settings=parseGuestJson(app.settings_json);
  const themeStyle=await getDirectoryThemeStyleForBusiness(app.business_id);
  const [listings]=await db.query(`SELECT l.id,l.qr_page_id
    FROM tags_directory_listings l
    LEFT JOIN tags_directory_site_listings sl ON sl.listing_id=l.id AND sl.publication_status='published'
    WHERE l.business_id=? AND l.status='published'
    ORDER BY (sl.id IS NOT NULL) DESC,l.id DESC LIMIT 1`,[app.business_id]);
  const listing=listings[0];
  const configuredImages=[];
  if(listing?.qr_page_id){
    const [blocks]=await db.query(`SELECT b.content_json FROM tags_qr_page_blocks b
      INNER JOIN tags_qr_page_sections s ON s.id=b.section_id
      WHERE s.page_id=? AND s.is_visible=1 AND b.is_visible=1
      ORDER BY s.sort_order,b.sort_order,b.id`,[listing.qr_page_id]);
    blocks.forEach(block=>{const content=parseGuestJson(block.content_json);if(Array.isArray(content.images))content.images.forEach(image=>{if(image?.url)configuredImages.push({url:image.url,alt:image.alt||""})})});
  }
  const [media]=listing?await db.query("SELECT media_type,url,alt_text FROM tags_directory_media WHERE listing_id=? AND media_type IN ('cover','gallery') AND is_active=1 ORDER BY FIELD(media_type,'cover','gallery'),sort_order,id LIMIT 12",[listing.id]):[[]];
  const catalogImages=await getBookingCatalogImages(app.business_id);
  const allImages=[...configuredImages,...media.filter(image=>image.url).map(image=>({url:image.url,alt:image.alt_text||""})),...catalogImages].filter((image,index,list)=>list.findIndex(candidate=>candidate.url===image.url)===index);
  const coverUrl=settings.bookingShowCover===false?"":settings.bookingCoverSource==="custom"?(settings.bookingCoverUrl||""):(app.business_cover_url||app.cover_url||allImages[0]?.url||"");
  return <LodgingBookingPage app={{...app,logo_url:settings.bookingShowLogo===false?"":app.business_logo_url||app.logo_url||"",cover_url:coverUrl,bookingImages:selectBusinessBookingHeroImages(allImages,coverUrl,app.business_id),settings,themeStyle}}/>;
}
