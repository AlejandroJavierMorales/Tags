import { headers } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";
import { FaWhatsapp } from "react-icons/fa6";
import { db } from "@/app/lib/tags-db";
import { getHeadersHost } from "@/app/lib/channelContext";
import { getPublicSitemapContext } from "@/app/lib/seo/publicSitemap";
import DirectoryPublicHeader from "@/app/modules/directory/components/public/DirectoryPublicHeader";
import DirectoryPublicFooter from "@/app/modules/directory/components/public/DirectoryPublicFooter";
import { directoryWhatsappUrl } from "@/app/modules/directory/lib/directoryPublicFormatting";
import { getDirectoryListingBySlug, getDirectorySiteCodeByHost } from "@/app/modules/directory/lib/getDirectoryPublicData";
import { getDirectoryWebPageData } from "@/app/modules/directory/lib/getDirectoryWebPageData";
import { buildDirectoryThemeStyle } from "@/app/modules/directory/lib/directoryThemeStyle";
import { getPublicEntitlement } from "@/app/modules/subscriptions/lib/publicEntitlement";
import ProductShareButton from "./ProductShareButton";
import "./productPage.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function productIdFromSlug(value) {
  const match = String(value || "").match(/^(\d+)(?:-|$)/);
  return match ? Number(match[1]) : 0;
}

function productPublicSlug(product) {
  const slug = String(product.title || "producto").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${product.id}-${slug || "producto"}`;
}

function imagesOf(product) {
  try {
    const parsed = typeof product.images_json === "string" ? JSON.parse(product.images_json || "[]") : product.images_json;
    if (Array.isArray(parsed) && parsed.length) return parsed.filter(item => item?.url).slice(0, 12);
  } catch {}
  return product.image_url ? [{ url: product.image_url, alt: product.title }] : [];
}

async function loadData(directorySlug, productSlug) {
  const requestHeaders = await headers();
  const siteCode = await getDirectorySiteCodeByHost(getHeadersHost(requestHeaders));
  const listingData = await getDirectoryListingBySlug(directorySlug, siteCode);
  const productId = productIdFromSlug(productSlug);
  if (!listingData || !productId || !listingData.listing.qr_page_id) return null;
  const [rows] = await db.query(
    `SELECT * FROM tags_qr_page_products
      WHERE id=? AND page_id=? AND is_visible=1 LIMIT 1`,
    [productId, listingData.listing.qr_page_id]
  );
  if (!rows[0]) return null;
  const web = await getDirectoryWebPageData(listingData.listing.qr_page_id);
  return { listingData, product: rows[0], siteCode, web };
}

export async function generateMetadata({ params }) {
  const values = await Promise.resolve(params);
  const data = await loadData(values.directorySlug, values.productSlug);
  if (!data) return {};
  const { product, listingData, web } = data;
  const context = await getPublicSitemapContext();
  const canonical = new URL(`/${listingData.listing.slug}/producto/${productPublicSlug(product)}`, `${context.baseUrl}/`).toString();
  const title = product.seo_title || `${product.title} | ${listingData.listing.display_name}`;
  const description = product.seo_description || product.description || `Conocé ${product.title} de ${listingData.listing.display_name}.`;
  const image = imagesOf(product)[0]?.url;
  const entitlement = await getPublicEntitlement(listingData.listing.business_id, "directory");
  const index = listingData.listing.publication_status === "published" && Number(listingData.listing.is_free) === 0 && entitlement.allowed && !context.isTags;
  return {
    title, description,
    alternates: { canonical },
    openGraph: { type: "website", url: canonical, title, description, ...(image ? { images: [{ url: image }] } : {}) },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, ...(image ? { images: [image] } : {}) },
    robots: { index, follow: index }
  };
}

export default async function DirectoryProductPage({ params }) {
  const values = await Promise.resolve(params);
  const data = await loadData(values.directorySlug, values.productSlug);
  if (!data) notFound();
  const { product, listingData } = data;
  const canonicalProductSlug = productPublicSlug(product);
  if (values.productSlug !== canonicalProductSlug) permanentRedirect(`/${listingData.listing.slug}/producto/${canonicalProductSlug}`);
  const entitlement = await getPublicEntitlement(listingData.listing.business_id, "directory");
  if (listingData.listing.publication_status !== "published" || Number(listingData.listing.is_free) === 1 || !entitlement.allowed) notFound();
  const images = imagesOf(product);
  const whatsapp = directoryWhatsappUrl(listingData.listing.whatsapp || listingData.listing.phone, product.whatsapp_text || `Hola, quiero consultar por ${product.title}`);
  const site = { id: listingData.listing.site_id, name: listingData.listing.site_name, code: listingData.listing.site_code, directory_config: listingData.listing.directory_config };
  const price = Number(product.price || 0);
  const themeStyle = buildDirectoryThemeStyle({ themeTokens: web?.page?.theme?.css_tokens || {}, globalStyles: web?.page?.global_styles || {} });

  return <main className="tags_directory_product_page" style={themeStyle}>
    <DirectoryPublicHeader site={site} showSearch={false} />
    <article>
      <a className="tags_directory_product_back" href={`/${listingData.listing.slug}?productoCatalogo=${product.id}#catalog-product-${product.id}`}>Volver</a>
      <div className="tags_directory_product_layout">
        <section className="tags_directory_product_gallery">{images.map((image,index)=><img src={image.url} alt={image.alt || `${product.title} ${index+1}`} key={`${image.url}-${index}`} />)}</section>
        <section className="tags_directory_product_info"><span>{product.category || "General"}</span><h1>{product.title}</h1>{product.description&&<p>{product.description}</p>}{Number(product.old_price)>0&&<del>$ {Number(product.old_price).toLocaleString("es-AR")}</del>}{product.discount_label&&<em>{product.discount_label}</em>}{price>0&&<strong>{String(product.currency||"ARS")==="USD"?"US$":"$"} {price.toLocaleString("es-AR")}</strong>}<div className="tags_directory_product_actions">{whatsapp&&<a className="tags_directory_product_whatsapp" href={whatsapp} target="_blank" rel="noreferrer"><FaWhatsapp /> Consultar por WhatsApp</a>}<ProductShareButton title={product.title} description={product.description} /></div></section>
      </div>
    </article>
    <DirectoryPublicFooter site={site} />
  </main>;
}
