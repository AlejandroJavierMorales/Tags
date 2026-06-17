import Image from "next/image";
import { tagsSiteConfig } from "../../config/configSite";
import { FacebookIcon, InstagramIcon } from "../SocialIcons";
import PoweredBy from "../PoweredBy";

export default function TagsFooter() {
  const { name, contact, social } = tagsSiteConfig;

  return (
    <footer className="footer tags_text_normal" style={{ backgroundColor: "#282727", color: "#d9d6d6", paddingBottom: "180px" }}>
      <div className="container py-5" >
        <div className="row">

          {/* LOGO */}
          <div className="col-md-4 mb-4 text-center">
            <div style={{ width: "200px", margin: "0 auto" }}>
              <Image
                src="/logo_tags_qr.webp"
                alt="Tags"
                width={280}
                height={66}
                style={{ width: "100%", height: "auto" }}
                priority
              />
            </div>

            <p className="mt-3 tags_subtitle" >
              {`${contact.name} - el QR y todo lo que pasa detrás...`}
            </p>
          </div>

          {/* CONTACTO */}
          <div className="col-md-4 mb-4 text-center text-md-start text-intro">
            <h3 className="tags_subtitle">Contacto</h3>

            <p className="mb-1">{contact.address}</p>

            <p className="mt-1 mb-1 pt-1 pb-1">
              Tel/WhatsApp:{" "}
              <a
                href={`https://wa.me/${contact.phone}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {contact.phone}
              </a>
            </p>

            <p className="mt-1 mb-1 pt-1 pb-1">
              <a href={`mailto:${contact.email}`}
              >
                {contact.email}
              </a>
            </p>

            <p className="mt-1 mb-1 pt-1 pb-1">
              <a href={contact.web} target="_blank" rel="noopener noreferrer"
              >
                {contact.web}
              </a>
            </p>
          </div>

          {/* REDES */}
          <div className="col-md-4 text-center">
            <h3 className="tags_subtitle">Seguinos</h3>

            <div className="d-flex justify-content-center gap-3">

              <a
                href={social.instagram}
                className="social-icon"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
              >
                <InstagramIcon />
              </a>

              <a
                href={social.instagram_calamuchitar}
                className="social-icon"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="IG Calamuchitar"
              >
                <InstagramIcon />
              </a>

            </div>
          </div>

          {/* POWERED BY */}
          <div className="m-0 p-0 mt-4" >
            <PoweredBy />
          </div>

        </div>
      </div>
    </footer>
  );
}