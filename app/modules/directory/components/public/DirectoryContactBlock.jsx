import { FaEnvelope, FaFacebookF, FaGlobe, FaInstagram, FaLocationDot, FaMapLocationDot, FaPhone, FaWhatsapp } from "react-icons/fa6";
import { directoryWhatsappUrl } from "../../lib/directoryPublicFormatting";
import "./DirectoryContactBlock.css";

export default function DirectoryContactBlock({ listing, social = {}, content = {}, styles = {} }) {
  const whatsapp = directoryWhatsappUrl(listing.whatsapp, content.whatsappMessage || "Hola, quiero hacer una consulta.");
  const directions = listing.latitude != null && listing.longitude != null ? `https://www.google.com/maps/dir/?api=1&destination=${listing.latitude},${listing.longitude}` : null;
  return <div className="tags_directory_contact" style={{ textAlign: styles.alignment || "left" }}>
    <header>{content.eyebrow !== "" && <span>{content.eyebrow || "CONTACTO"}</span>}{content.title !== "" && <h2 style={styles.typography?.title || {}}>{content.title || "Hablemos"}</h2>}{content.subtitle && <p style={styles.typography?.subtitle || {}}>{content.subtitle}</p>}</header>
    <div className="tags_directory_contact_grid">
      {content.showWhatsapp !== false && whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer"><FaWhatsapp /><span><small>{content.whatsappLabel || "WhatsApp"}</small>{listing.whatsapp}</span></a>}
      {content.showPhone !== false && listing.phone && <a href={`tel:${String(listing.phone).replace(/[^\d+]/g, "")}`}><FaPhone /><span><small>{content.phoneLabel || "Teléfono"}</small>{listing.phone}</span></a>}
      {content.showEmail !== false && listing.email && <a href={`mailto:${listing.email}`}><FaEnvelope /><span><small>{content.emailLabel || "Email"}</small>{listing.email}</span></a>}
      {content.showWebsite !== false && listing.website_url && <a href={listing.website_url} target="_blank" rel="noreferrer"><FaGlobe /><span><small>{content.websiteLabel || "Sitio web"}</small>{content.websiteAction || "Visitar sitio"}</span></a>}
      {content.showAddress !== false && listing.address && <div><FaLocationDot /><span><small>{content.addressLabel || "Dirección"}</small>{listing.address}</span></div>}
      {directions && <a href={directions} target="_blank" rel="noreferrer"><FaMapLocationDot /><span><small>{content.directionsLabel || "Ubicación"}</small>{content.directionsAction || "Cómo llegar"}</span></a>}
    </div>
    {(social.instagram || social.facebook) && <nav aria-label="Redes sociales">{social.instagram && <a href={social.instagram} target="_blank" rel="noreferrer" aria-label="Instagram" title="Instagram"><FaInstagram /></a>}{social.facebook && <a href={social.facebook} target="_blank" rel="noreferrer" aria-label="Facebook" title="Facebook"><FaFacebookF /></a>}</nav>}
  </div>;
}
