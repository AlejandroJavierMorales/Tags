import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { FaArrowLeft, FaArrowRight, FaCheck, FaWhatsapp } from "react-icons/fa6";
import DirectoryPublicHeader from "@/app/modules/directory/components/public/DirectoryPublicHeader";
import DirectoryPublicFooter from "@/app/modules/directory/components/public/DirectoryPublicFooter";
import { getDirectorySiteCodeByHost, getDirectorySiteByCode } from "@/app/modules/directory/lib/getDirectoryPublicData";
import { getHeadersHost } from "@/app/lib/channelContext";
import { DIRECTORY_PRODUCT_LINKS, DIRECTORY_PRODUCT_PAGES } from "@/app/directorio/experiencia/productPages";
import "./productPage.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const product = DIRECTORY_PRODUCT_PAGES[params.slug];
  if (!product) return {};
  return {
    title: `${product.title} | CalamuchitAr`,
    description: product.description,
    alternates: { canonical: `/experiencias-digitales/${params.slug}` },
    robots: { index: true, follow: true },
    openGraph: { title: `${product.title} | CalamuchitAr`, description: product.description, images: [product.imageDesk] },
  };
}

export default async function DirectoryProductPage({ params }) {
  const product = DIRECTORY_PRODUCT_PAGES[params.slug];
  if (!product) notFound();
  const requestHeaders = await headers();
  const siteCode = await getDirectorySiteCodeByHost(getHeadersHost(requestHeaders));
  const site = await getDirectorySiteByCode(siteCode);
  if (!site) notFound();
  const whatsappText = `Estoy interesado en saber más acerca de ${product.title}`;

  return <main className="tags_directory_product_page">
    <DirectoryPublicHeader site={site} compact showSearch={false} />
    <article className="tags_directory_product_content">
      <Link className="tags_directory_product_back" href="/experiencias-digitales"><FaArrowLeft /> Volver a Qué Ofrecemos</Link>
      <header className="tags_directory_product_heading">
        <span>{product.eyebrow}</span>
        <h1>{product.title}</h1>
        <p>{product.description}</p>
      </header>
      <picture className="tags_directory_product_hero_image"><source media="(max-width: 620px)" srcSet={product.imageMobile} /><img src={product.imageDesk} alt={product.alt} /></picture>
      <div className="tags_directory_product_sections">
        <section><h2>Qué podés hacer</h2>{product.features.map(item => <p key={item}><FaCheck /> {item}</p>)}</section>
        <section className="is_advantage"><h2>Por qué te sirve</h2>{product.benefits.map(item => <p key={item}><FaCheck /> {item}</p>)}</section>
      </div>
      <div className="tags_directory_product_cta"><div><strong>¿Querés conocer más?</strong><span>Te ayudamos a encontrar la solución adecuada para tu negocio.</span></div><a href={`https://wa.me/543546562855?text=${encodeURIComponent(whatsappText)}`} target="_blank" rel="noreferrer"><FaWhatsapp /> Consultanos <FaArrowRight /></a></div>
      <nav className="tags_directory_product_related" aria-label="Otras soluciones"><strong>Otras soluciones</strong>{DIRECTORY_PRODUCT_LINKS.filter(item => item[0] !== params.slug).map(([slug, label]) => <Link href={`/experiencias-digitales/${slug}`} key={slug}>{label}</Link>)}</nav>
    </article>
    <DirectoryPublicFooter site={site} />
  </main>;
}
