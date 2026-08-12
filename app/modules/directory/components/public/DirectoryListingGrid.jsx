import { FaArrowRight, FaLocationDot, FaMapLocationDot, FaWhatsapp } from "react-icons/fa6";
import Link from "next/link";
import Image from "next/image";
import { directoryImageUrl, directoryWhatsappUrl } from "../../lib/directoryPublicFormatting";
import "./DirectoryListingGrid.css";

function providerHref(slug, returnHref, navigationTrail) {
  const params = new URLSearchParams();
  if (returnHref?.startsWith("/directorio")) params.set("volver", returnHref);
  if (navigationTrail?.length) params.set("ruta", JSON.stringify(navigationTrail));
  const query = params.toString();
  return `/directorio/prestador/${slug}${query ? `?${query}` : ""}`;
}

export default function DirectoryListingGrid({ listings, returnHref = "", navigationTrail = [] }) {
  if (!listings.length) return <div className="tags_directory_empty"><strong>No encontramos resultados</strong><span>Probá con otro rubro, localidad o término de búsqueda.</span></div>;
  return <div className="tags_directory_listing_grid">
    {listings.map(listing => {
      const whatsapp = directoryWhatsappUrl(listing.whatsapp);
      const directions = listing.latitude != null && listing.longitude != null ? `https://www.google.com/maps/dir/?api=1&destination=${listing.latitude},${listing.longitude}` : null;
      return <article className="tags_directory_listing_card" key={listing.id}>
        <div className="tags_directory_listing_image">
          {listing.image_url ? <Image src={directoryImageUrl(listing.image_url)} alt={`Imagen de ${listing.display_name}`} width={260} height={220} sizes="(max-width: 380px) 80px, (max-width: 700px) 94px, 130px" /> : <span>{listing.display_name.charAt(0)}</span>}
        </div>
        <div className="tags_directory_listing_body">
          <div><h3>{listing.display_name}</h3>{listing.locality_name && <p><FaLocationDot /> {listing.locality_name}</p>}</div>
          {listing.short_description && <p className="tags_directory_listing_description">{listing.short_description}</p>}
          <div className="tags_directory_listing_actions">
            {whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer" className="is_whatsapp" aria-label={`WhatsApp de ${listing.display_name}`}><FaWhatsapp /> WhatsApp</a>}
            {directions && <a href={directions} target="_blank" rel="noreferrer"><FaMapLocationDot /> Cómo llegar</a>}
            {Number(listing.is_free) === 0
              ? <Link href={providerHref(listing.slug, returnHref, navigationTrail)} className="is_detail">Ver sitio web <FaArrowRight /></Link>
              : <span className="is_free_badge">Publicación gratuita</span>}
          </div>
        </div>
      </article>;
    })}
  </div>;
}
