import Link from "next/link";
import { FaArrowRight, FaBriefcase, FaMapLocationDot, FaPlus, FaStore } from "react-icons/fa6";
import "./enlaces.css";

export const metadata={
  title:"Enlaces de CalamuchitAr | Turismo, comercios y servicios",
  description:"Accedé a Muchi, explorá comercios y servicios, abrí el mapa de prestadores o sumá tu negocio a CalamuchitAr.",
  alternates:{canonical:"https://calamuchita.ar/enlaces"},
  openGraph:{title:"CalamuchitAr · Todo el Valle en un solo lugar",description:"Muchi, mapa de prestadores, comercios, servicios y herramientas para negocios.",url:"https://calamuchita.ar/enlaces",type:"website"},
};

const links=[
  {kind:"muchi",href:"https://muchi.calamuchita.ar",eyebrow:"ASISTENTE VIRTUAL",title:"Muchi · Tu asistente en Calamuchita",description:"Preguntale dónde alojarte, comer, pasear, comprar o encontrar un servicio. Muchi te ayuda a descubrir el Valle conversando.",image:"/assets/destination-ai/muchi/tourist-wave.webp",external:true},
  {kind:"platform",href:"/directorio",eyebrow:"EXPLORÁ CALAMUCHITA",title:"CalamuchitAr",description:"La Plataforma Comercial de Calamuchita. Encontrá comercios, profesionales, productos, servicios y propuestas turísticas.",image:"/assets/images/logos/logo_calamuchitar_redondo_200x200.png"},
  {kind:"map",href:"/mapa",eyebrow:"CERCA TUYO",title:"Ver prestadores en el mapa",description:"Buscá por nombre, rubro, producto o servicio y ubicá cada propuesta con un icono que identifica su actividad.",icon:FaMapLocationDot},
  {kind:"tools",href:"/que-ofrecemos",eyebrow:"PARA NEGOCIOS",title:"Comercios y prestadores de servicios",description:"Conocé las herramientas digitales disponibles para mostrar, administrar y hacer crecer tu actividad.",icon:FaBriefcase},
  {kind:"join",href:"/publicar-mi-negocio",eyebrow:"SUMATE A CALAMUCHITAR",title:"Quiero agregar mi negocio",description:"Publicá tu comercio, profesión o servicio y empezá a formar parte de la plataforma.",icon:FaPlus},
];

export default function CalamuchitarLinksPage(){
  return <main className="tags_links_page">
    <div className="tags_links_glow is_one"/><div className="tags_links_glow is_two"/>
    <section className="tags_links_shell">
      <header className="tags_links_header"><Link href="/directorio" aria-label="Ir a CalamuchitAr"><img src="/directory/calamuchitar/LogoCalamuchitar.webp" alt="CalamuchitAr"/></Link><span>LA PLATAFORMA COMERCIAL DE CALAMUCHITA</span><h1>Todo el Valle<br/>en un solo lugar.</h1><p>Elegí qué necesitás y accedé directamente.</p></header>
      <nav className="tags_links_list" aria-label="Enlaces principales de CalamuchitAr">{links.map(item=>{const Icon=item.icon||FaStore;const content=<><div className="tags_links_visual">{item.image?<img src={item.image} alt=""/>:<Icon/>}</div><div className="tags_links_copy"><span>{item.eyebrow}</span><h2>{item.title}</h2><p>{item.description}</p></div><FaArrowRight className="tags_links_arrow"/></>;return item.external?<a key={item.kind} className={`tags_links_card is_${item.kind}`} href={item.href}>{content}</a>:<Link key={item.kind} className={`tags_links_card is_${item.kind}`} href={item.href}>{content}</Link>;})}</nav>
      <footer><strong>CalamuchitAr®</strong><span>Turismo, comercio y servicios del Valle de Calamuchita.</span></footer>
    </section>
  </main>;
}
