import { FaEnvelope, FaFacebookF, FaHouse, FaInstagram, FaPhone, FaWhatsapp } from "react-icons/fa6";
import Image from "next/image";
import Link from "next/link";
import "./DirectoryPublicFooter.css";
import { DIRECTORY_PRODUCT_LINKS } from "@/app/directorio/experiencia/productPages";

const FRIENDS = [
  ["LogoCabanasEn.png", "Cabañas en Calamuchita", "https://xn--cabaasen-g3a.com.ar/"],
  ["LogoCabanasEnLosReartes.png", "Cabañas en Los Reartes", "https://xn--cabaasenlosreartes-q0b.com.ar/"],
  ["LogoCabanasEnVGB.png", "Cabañas en Villa General Belgrano", "https://xn--cabaasenvillageneralbelgrano-0xc.com.ar/"],
  ["LogoCabanasEnSantaRosa.png", "Cabañas en Santa Rosa", "https://xn--cabaasensantarosadecalamuchita-h4c.com.ar/"],
];

export default function DirectoryPublicFooter({ site = { code: "calamuchitar", name: "CalamuchitAr" } }) {
  if (site.code !== "calamuchitar") {
    return <footer className="tags_directory_platform_footer"><div className="tags_directory_footer_signature"><strong>{site.name}</strong><span>Plataforma Comercial</span><small>Desarrollado con Tags</small></div><div className="tags_directory_footer_legal">© {site.name} · Todos los derechos reservados</div></footer>;
  }
  return <footer className="tags_directory_platform_footer">
    <div className="tags_directory_footer_main">
      <div className="tags_directory_footer_brand"><Image src="/directory/calamuchitar/footer/logo_calamuchitar_redondo_200x200.png" alt="CalamuchitAr" width={200} height={200} sizes="80px" /><strong>CalamuchitAr®</strong><span>La Plataforma Comercial de Calamuchita</span></div>
      <div className="tags_directory_footer_contact"><h2>Contacto</h2><a href="https://wa.me/543546562855" target="_blank" rel="noreferrer"><FaWhatsapp /> 3546 562855</a><a href="mailto:info@calamuchita.ar"><FaEnvelope /> info@calamuchita.ar</a><p><FaHouse /> Alberdi 1506 · El Vergel · Los Reartes</p></div>
      <div className="tags_directory_footer_social"><h2>Seguinos</h2><div><a href="https://www.instagram.com/calamuchitar/" target="_blank" rel="noreferrer" aria-label="Instagram"><FaInstagram /></a><a href="https://www.facebook.com/calamuchitar/" target="_blank" rel="noreferrer" aria-label="Facebook"><FaFacebookF /></a></div><a href="tel:+543546562855"><FaPhone /> Llamanos</a></div>
    </div>
    <section className="tags_directory_footer_friends"><h2>Sitios asociados</h2><div>{FRIENDS.map(([image, name, url]) => <a href={url} target="_blank" rel="noreferrer" key={name}><Image src={`/directory/calamuchitar/footer/${image}`} alt={name} width={220} height={80} sizes="(max-width: 700px) 40vw, 220px" /></a>)}</div></section>
    <section className="tags_directory_footer_associated"><h2>Sitios asociados</h2><div><a href="https://www.xn--cabaasenlosreartes-q0b.com.ar/" target="_blank" rel="noreferrer"><Image src="/directory/calamuchitar/footer/LogoCabanasEnLosReartes.png" alt="Cabañas en Los Reartes" width={220} height={80} sizes="(max-width: 700px) 40vw, 220px" /><span>Cabañas en Los Reartes</span></a><a href="https://tags.com.ar/" target="_blank" rel="noreferrer"><Image src="/logo_tags_qr.webp" alt="Tags.com.ar" width={220} height={80} sizes="(max-width: 700px) 40vw, 220px" /><span>Plataforma de Experiencias Digitales Inteligentes</span></a></div></section>
    <nav className="tags_directory_footer_products" aria-label="Nuestras soluciones"><h2>Nuestras soluciones</h2><div>{DIRECTORY_PRODUCT_LINKS.map(([slug, label]) => <Link href={`/experiencias-digitales/${slug}`} key={slug}>{label}</Link>)}</div></nav>
    <div className="tags_directory_footer_signature"><span>Desarrollado por</span><Image src="/directory/calamuchitar/LogoCalamuchitar.webp" alt="CalamuchitAr" width={250} height={70} sizes="250px" /><strong>La Plataforma Comercial de Calamuchita</strong><small>www.calamuchita.ar · 3546 562855</small></div>
    <div className="tags_directory_footer_legal">© CalamuchitAr® · Todos los derechos reservados</div>
  </footer>;
}
