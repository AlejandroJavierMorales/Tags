import { FaEnvelope, FaFacebookF, FaInstagram, FaLocationDot, FaPhone, FaWhatsapp } from "react-icons/fa6";
import { directoryImageUrl, directoryWhatsappUrl } from "../../lib/directoryPublicFormatting";
import "./DirectoryProviderFooter.css";

export default function DirectoryProviderFooter({ listing, logo, social = {}, config = {} }) {
  if (config.showFooter === false) return null;
  const whatsapp = directoryWhatsappUrl(listing.whatsapp);
  return <footer className="tags_directory_provider_footer">
    <div className="tags_directory_provider_footer_main">
      <div className="tags_directory_provider_footer_identity">{config.showLogo !== false && logo && <img src={directoryImageUrl(logo.url)} alt={`Logo de ${listing.display_name}`} />}{config.showBusinessName !== false && <h2>{config.title || listing.display_name}</h2>}</div>
      {config.showContact !== false && <div className="tags_directory_provider_footer_data"><h3>{config.contactTitle || "Contacto"}</h3>{whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer"><FaWhatsapp /> {listing.whatsapp}</a>}{listing.phone && <a href={`tel:${String(listing.phone).replace(/[^\d+]/g, "")}`}><FaPhone /> {listing.phone}</a>}{listing.email && <a href={`mailto:${listing.email}`}><FaEnvelope /> {listing.email}</a>}{listing.address && <p><FaLocationDot /> {listing.address}{listing.locality_name ? ` · ${listing.locality_name}` : ""}</p>}</div>}
      {config.showSocialLinks !== false && <div className="tags_directory_provider_footer_social"><h3>{config.socialTitle || "Seguinos"}</h3><div>{social.instagram && <a href={social.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><FaInstagram /></a>}{social.facebook && <a href={social.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"><FaFacebookF /></a>}</div></div>}
    </div>
    <div className="tags_directory_provider_footer_credit"><span>Desarrollado por</span><img src="/directory/calamuchitar/LogoCalamuchitar.webp" alt="CalamuchitAr" /><small>La Plataforma Comercial de Calamuchita</small></div>
  </footer>;
}
