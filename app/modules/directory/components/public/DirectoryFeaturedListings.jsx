import { FaArrowRight, FaLocationDot } from "react-icons/fa6";
import Link from "next/link";
import Image from "next/image";
import { directoryImageUrl } from "../../lib/directoryPublicFormatting";
import "./DirectoryFeaturedListings.css";

function providerHref(slug) {
  const params = new URLSearchParams();
  params.set("volver", "/directorio");
  params.set("ruta", JSON.stringify([{ label: "Inicio", href: "/directorio" }]));
  return `/${slug}?${params.toString()}`;
}

export default function DirectoryFeaturedListings({ listings }) {
  if (!listings?.length) return null;
  return <section className="tags_directory_featured" aria-labelledby="directory-featured-title">
    <div className="tags_directory_featured_heading"><div><span>ESPACIO PATROCINADO</span><h2 id="directory-featured-title">Comercios destacados</h2></div><p>Propuestas recomendadas de nuestra plataforma</p></div>
    <div className="tags_directory_featured_grid">{listings.map(listing => <article key={listing.id}>
      <div className="tags_directory_featured_image">{listing.image_url ? <Image src={directoryImageUrl(listing.image_url)} alt={listing.display_name} width={420} height={240} sizes="(max-width: 700px) 100vw, 420px" /> : <strong>{listing.display_name.charAt(0)}</strong>}<span>DESTACADO</span></div>
      <div className="tags_directory_featured_body"><h3>{listing.display_name}</h3>{listing.locality_name && <p><FaLocationDot /> {listing.locality_name}</p>}<small>{listing.short_description}</small><Link href={providerHref(listing.slug)}>Conocer más <FaArrowRight /></Link></div>
    </article>)}</div>
  </section>;
}
