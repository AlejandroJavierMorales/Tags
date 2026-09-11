"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  FaArrowRight, FaArrowUp, FaBagShopping, FaBell, FaBoxOpen, FaBriefcase, FaBuilding,
  FaCalendarCheck, FaCamera, FaCartShopping, FaChartLine, FaCheck, FaClock,
  FaCloudArrowUp, FaComments, FaCreditCard, FaDesktop, FaEnvelope, FaGear,
  FaGift, FaGlobe, FaGoogle, FaHotel, FaIdCard, FaImage, FaLocationDot,
  FaMagnifyingGlass, FaMapLocationDot, FaMobileScreenButton, FaMoneyBillTransfer,
  FaPeopleGroup, FaPercent, FaPhone, FaQrcode, FaRobot, FaRoute, FaScissors,
  FaShop, FaStar, FaTags, FaTruck, FaUserDoctor, FaUsers, FaUtensils,
  FaWandMagicSparkles, FaWhatsapp, FaWifi
} from "react-icons/fa6";

const navItems = [
  ["presencia", "QR dinámico", FaQrcode], ["web", "Página Web", FaGlobe],
  ["resenas", "Reseñas", FaStar], ["tienda", "Tienda", FaCartShopping],
  ["gastronomia", "Gastronomía", FaUtensils], ["turnos", "Turnos", FaCalendarCheck],
  ["alojamientos", "Alojamientos", FaHotel], ["google", "Google", FaGoogle],
  ["fidelizacion", "Fidelización", FaGift], ["ia", "ChatBot con IA", FaRobot],
  ["tags-id", "Tags ID", FaIdCard]
];

const sectionIcons = {
  presencia: FaQrcode, web: FaGlobe, resenas: FaStar, tienda: FaCartShopping,
  gastronomia: FaUtensils, turnos: FaCalendarCheck, google: FaGoogle,
  fidelizacion: FaGift, ia: FaRobot, "tags-id": FaIdCard
};

function FeatureList({ items }) {
  return <ul className="tags_offers_features">{items.map(item => <li key={item}><FaCheck /><span>{item}</span></li>)}</ul>;
}

function Visual({ desktop, mobile, alt, placeholder, children }) {
  if (desktop) return <div className="tags_offers_visual"><picture>{mobile && <source media="(max-width: 620px)" srcSet={mobile} />}<img src={desktop} alt={alt} loading="lazy" /></picture></div>;
  return <div className="tags_offers_visual tags_offers_visual_placeholder" aria-label={placeholder}><div>{children || <><FaDesktop/><FaMobileScreenButton/></>}</div><small>{placeholder}</small></div>;
}

function Section({ id, eyebrow, title, icon: ProvidedIcon, text, image, imageMobile, imageAlt, reverse = false, children, className = "" }) {
  const Icon = ProvidedIcon || sectionIcons[id];
  return <section id={id} className={`tags_offers_section${reverse ? " is_reverse" : ""} ${className}`} data-reveal>
    <div className="tags_offers_section_inner">
      <div className="tags_offers_section_copy"><span className="tags_offers_eyebrow">{Icon && <Icon aria-hidden="true"/>}<span>{eyebrow}</span></span><h2>{title}</h2><p className="tags_offers_lead">{text}</p>{children}</div>
      <Visual desktop={image} mobile={imageMobile} alt={imageAlt} placeholder={title} />
    </div>
  </section>;
}

export default function DirectoryOffersPage({ siteName = "CalamuchitAr", whatsappUrl = "" }) {
  function scrollToTools(event) {
    event.preventDefault();
    const target = document.getElementById("herramientas-menu");
    if (!target) return;
    const offset = window.innerWidth >= 900 ? 154 : 132;
    const top = window.scrollY + target.getBoundingClientRect().top - offset;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }

  useEffect(() => {
    const elements = document.querySelectorAll("[data-reveal]");
    if (!window.IntersectionObserver) { elements.forEach(element => element.classList.add("is_visible")); return undefined; }
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add("is_visible"); observer.unobserve(entry.target); }
    }), { rootMargin: "0px 0px -8%", threshold: 0.08 });
    elements.forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const label = document.querySelector(".tags_offers_intro > div > span");
    if (label) label.textContent = "TODAS LAS SOLUCIONES EN UNA MISMA PLATAFORMA";
    const text = document.querySelector(".tags_offers_intro p");
    if (text) text.textContent = "Comenzá gratis y sumá, cuando las necesites, las funcionalidades que mejor se adapten a tu negocio.";
  }, []);

  return <div className="tags_offers_page">
    <section className="tags_offers_hero">
      <div className="tags_offers_hero_inner">
        <div className="tags_offers_hero_copy" data-reveal>
          <span>TODO LO QUE TU NEGOCIO NECESITA EN UN SOLO LUGAR</span>
          <h1><span>Más clientes.</span><span>Mejor presencia digital.</span><span>Más herramientas para hacer crecer tu negocio.</span></h1>
          <p>Si tenés un comercio, sos profesional u ofrecés un servicio en Calamuchita, {siteName} tiene herramientas para atraer más clientes, administrar tu actividad y construir una presencia digital profesional.</p>
          <p>Desde tu lugar dentro de la plataforma hasta tu página web, tienda online, reservas, reseñas, inteligencia artificial y mucho más.</p>
          <div className="tags_offers_actions"><Link className="is_primary" href="/publicar-mi-negocio">Agregar mi negocio gratis <FaArrowRight /></Link><a href="#herramientas-menu" onClick={scrollToTools}>Conocer todas las herramientas</a></div>
        </div>
        <div className="tags_offers_hero_visual" data-reveal>
          <img src="/assets/images/calamuchitar/comercios_900x1200.webp" alt="Comercios y prestadores de servicios de Calamuchita" />
        </div>
      </div>
    </section>

    <nav id="herramientas-menu" className="tags_offers_quick_nav" aria-label="Navegación de herramientas"><strong><FaMagnifyingGlass aria-hidden="true"/> <span>Explorá nuestras herramientas</span></strong><div>{navItems.map(([id, label, Icon]) => <a href={`#${id}`} key={id}><Icon aria-hidden="true"/>{label}</a>)}</div></nav>
    <button className="tags_offers_back_to_tools" type="button" onClick={scrollToTools} aria-label="Volver a nuestras herramientas" title="Volver a herramientas"><FaArrowUp/></button>

    <section id="herramientas" className="tags_offers_intro" data-reveal>
      <div><span>UN ECOSISTEMA, NO CINCO SISTEMAS DIFERENTES</span><h2>Sea cual sea tu rubro, tenemos herramientas para ayudarte a crecer</h2><p>No necesitás convertirte en especialista en tecnología. Podés comenzar gratuitamente y sumar solamente lo que realmente necesita tu negocio.</p></div>
      <div className="tags_offers_concepts"><span><FaChartLine /> Estadísticas</span><span><FaWandMagicSparkles /> Crecimiento</span><span><FaGlobe /> Presencia digital</span><span><FaMagnifyingGlass /> Visibilidad</span><span><FaPeopleGroup /> Clientes</span><span><FaGear /> Gestión</span></div>
    </section>

    <Section id="presencia" eyebrow="QR DINÁMICO" title="QRs que hacen mucho más que abrir un enlace" text="Creá QRs dinámicos para utilizar en tu negocio, publicidad, redes sociales, promociones, mesas, cartelería o packaging. Modificá su destino sin volver a imprimirlo y consultá estadísticas de utilización." image="/assets/images/calamuchitar/productos/qrs_dinamicos_desk.webp" imageMobile="/assets/images/calamuchitar/productos/qrs_dinamicos_mobile.webp" imageAlt="Soluciones de QR dinámicos para comercios">
      <div className="tags_offers_examples"><span><FaStar /> Reseñas</span><span><FaComments /> Redes</span><span><FaPercent /> Promociones</span><span><FaBoxOpen /> Productos</span><span><FaUtensils /> Mesas</span><span><FaImage /> Cartelería</span></div>
      <blockquote>Un QR que podés actualizar, medir y reutilizar.</blockquote>
    </Section>

    <Section id="resenas" eyebrow="RESEÑAS DE CLIENTES" title="Convertí la opinión de tus clientes en una herramienta de crecimiento" text="Creá tu propio circuito de satisfacción y conocé primero qué opinan tus clientes. Configurá preguntas y un umbral de satisfacción; cuando la experiencia sea positiva, invitalos también a compartirla en Google." image="/assets/images/calamuchitar/productos/resenias_desk.webp" imageMobile="/assets/images/calamuchitar/productos/resenias_mobile.webp" imageAlt="Panel de reseñas de clientes" reverse>
      <FeatureList items={["Preguntas personalizables", "Umbral de satisfacción configurable", "Feedback privado", "Invitación a Google", "Estadísticas e historial", "Evolución y análisis de respuestas"]} />
      <div className="tags_offers_reviews"><strong>Lo que opinan nuestros clientes</strong><div>{[5,5,5].map((value,index)=><span key={index}>{Array.from({length:value}).map((_,star)=><FaStar key={star}/>)}</span>)}</div><p>Desde tu Panel elegís qué reseñas mostrar públicamente e incorporás testimonios a tu página web.</p></div>
    </Section>

    <Section id="web" eyebrow="PÁGINA WEB PROFESIONAL" title="Tu negocio también necesita un lugar propio en Internet" text="Tené una página moderna, profesional, adaptable a celulares e indexada para que potenciales clientes puedan encontrarte. Mostrá quién sos, qué ofrecés, cómo contactarte y toda la información relevante de tu actividad." image="/assets/images/calamuchitar/productos/paginaweb_desk.webp" imageMobile="/assets/images/calamuchitar/productos/paginaweb_mobile.webp" imageAlt="Página web profesional para comercios">
      <FeatureList items={["Diseños modernos y personalización", "SEO e integración con Google", "Redes sociales y WhatsApp", "Mapas y formularios", "Catálogos y galerías", "Preguntas frecuentes y testimonios"]} />
      <p className="tags_offers_note">Elegí una base que se adapte a tu negocio y personalizala con tu identidad.</p>
    </Section>

    <Section id="tienda" eyebrow="TIENDA ONLINE" title="Vendé las 24 horas" text="Si comercializás productos o servicios, incorporá una Tienda Online Profesional preparada para vender desde cualquier dispositivo." image="/assets/images/calamuchitar/productos/tienda_desk.webp" imageMobile="/assets/images/calamuchitar/productos/tienda_moobile.webp" imageAlt="Tienda online profesional" reverse>
      <FeatureList items={["Categorías, productos y variantes", "Talles, colores y presentaciones", "Stock, carrito y cupones", "Pedidos y pagos online", "Transferencias y WhatsApp", "Envíos, retiro y seguimiento"]} />
      <blockquote>Tu negocio puede seguir vendiendo incluso cuando está cerrado.</blockquote>
    </Section>

    <Section id="gastronomia" eyebrow="RESTAURANTES Y GASTRONOMÍA" title="Mucho más que una Carta Digital" text="Si tenés un restaurante, bar, cafetería, rotisería o casa de comidas, contá con una Carta de Menú Interactiva integrada a un completo sistema de gestión gastronómica." image="/assets/images/calamuchitar/productos/resto_desk.webp" imageMobile="/assets/images/calamuchitar/productos/resto_mobile.webp" imageAlt="Carta digital y gestión gastronómica">
      <div className="tags_offers_split_lists"><div><strong>En el salón</strong><FeatureList items={["Carta mediante QR", "Pedido desde cada mesa", "Identificación de mesa", "Gestión de mozos", "Comandas, cocina y caja"]}/></div><div><strong>Fuera del salón</strong><FeatureList items={["Take Away", "Delivery", "Pedidos online", "Gestión centralizada"]}/></div></div>
      <p className="tags_offers_note">Desde que el cliente abre la carta hasta que el pedido llega a cocina y se cobra, todo puede gestionarse desde el mismo sistema.</p>
    </Section>

    <Section id="turnos" eyebrow="TURNOS Y RESERVAS" title="Dejá que tus clientes reserven mientras vos trabajás" text="Organizá disponibilidad, profesionales, recursos, horarios y servicios desde un único lugar. Ideal para peluquerías, centros de estética, consultorios, canchas, complejos deportivos, spa y actividades con turnos." image="/assets/images/calamuchitar/productos/turnos_desk.webp" imageMobile="/assets/images/calamuchitar/productos/turnos_mobile.webp" imageAlt="Sistema de turnos y reservas" reverse>
      <FeatureList items={["Reservas online y agenda", "Disponibilidad automática", "Reprogramaciones y cancelaciones", "Historial y clientes", "Servicios, profesionales o recursos", "Notificaciones y estadísticas"]}/>
    </Section>

    <section id="alojamientos" className="tags_offers_lodging" data-reveal>
      <div className="tags_offers_lodging_intro"><span><FaHotel aria-hidden="true"/> ALOJAMIENTOS</span><h2>Mucho más que administrar reservas</h2><p>Administrá reservas, cobros, confirmaciones, disponibilidad, check-in y comunicación con tus huéspedes desde un mismo lugar.</p></div>
      <div className="tags_offers_flow"><div><FaDesktop /><strong>Panel de reservas</strong></div><FaArrowRight /><div><FaMobileScreenButton /><strong>Mi Estadía</strong></div><FaArrowRight /><div><FaStar /><strong>Experiencia del huésped</strong></div></div>
      <div className="tags_offers_lodging_grid">
        <Visual desktop="/assets/images/calamuchitar/productos/miestadia_desk.webp" mobile="/assets/images/calamuchitar/productos/miestadia_mobile.webp" alt="Mi Estadía para alojamientos" />
        <div><span className="tags_offers_eyebrow">MI ESTADÍA</span><h3>Tu alojamiento también puede ofrecerle a cada huésped su propia aplicación</h3><p>Antes, durante y después de la estadía, accede desde el teléfono a su reserva, pre check-in, información del establecimiento, WiFi, reglamentos, políticas, horarios, contactos, servicios y recomendaciones.</p><h4>Convertí servicios adicionales en nuevas ventas</h4><FeatureList items={["Desayunos y gastronomía", "Masajes, sauna y spa", "Bicicletas y excursiones", "Late checkout", "Merchandising y productos", "Cualquier servicio disponible"]}/><p className="tags_offers_note">Después del checkout, el huésped todavía puede dejar una reseña durante las siguientes 72 horas.</p></div>
      </div>
    </section>

    <Section id="google" eyebrow="GOOGLE BUSINESS" title="Que te encuentren cuando te están buscando" text="Tener correctamente configurado tu Perfil de Negocio de Google es fundamental para aparecer en Google Maps y mejorar tu presencia en búsquedas locales. Nuestro módulo te guía paso a paso para crear, completar u optimizar tu presencia y detectar información faltante." reverse className="is_google">
      <FeatureList items={["Información comercial y categorías", "Dirección y horarios", "Fotografías y servicios", "Web y datos de contacto", "Optimización del perfil", "Estado de configuración"]}/>
      <div className="tags_offers_google_visual"><FaGoogle/><FaMapLocationDot/><FaLocationDot/></div>
    </Section>

    <Section id="fidelizacion" eyebrow="FIDELIZACIÓN" title="Hacé que tus clientes vuelvan" text="Conseguir un cliente nuevo cuesta mucho más que lograr que vuelva uno que ya te conoce. Implementá sistemas simples, prácticos y efectivos de recompensas." image="/assets/images/calamuchitar/productos/beneficios_desk.webp" imageMobile="/assets/images/calamuchitar/productos/beneficios_mobile.webp" imageAlt="Beneficios y programas de fidelización">
      <div className="tags_offers_loyalty_modes"><div><FaGift/><strong>Puntos</strong><p>Cada compra suma puntos y los puntos se cambian por beneficios.</p></div><div><FaTags/><strong>Sellos</strong><p>Comprá 9 cafés y el décimo es gratis.</p></div></div>
      <FeatureList items={["Puntos y sellos", "Premios y descuentos", "Productos y servicios", "Reglas y vencimientos", "Historial", "Clientes frecuentes"]}/><blockquote>Vos definís las reglas. Tus clientes reciben los beneficios.</blockquote>
    </Section>

    <Section id="ia" eyebrow="CHATBOT CON IA" title="Un asistente que conoce tu negocio y atiende las 24 horas" text="Incorporá un asistente de Inteligencia Artificial entrenado con la información real de tu negocio para responder automáticamente las consultas de tus clientes." image="/assets/images/calamuchitar/productos/chatbot_desk.webp" imageMobile="/assets/images/calamuchitar/productos/chatbot_mobile.webp" imageAlt="Chatbot con inteligencia artificial" reverse>
      <FeatureList items={["Productos y servicios", "Horarios y tarifas", "Ubicación", "Preguntas frecuentes y políticas", "Reservas", "Información turística o específica"]}/><blockquote>Disponible 24 horas, incluso cuando vos no estás.</blockquote>
    </Section>

    <Section id="tags-id" eyebrow="TAGS ID · TARJETA PERSONAL DIGITAL" title="Tu tarjeta personal evolucionó" text="Si sos profesional, técnico, vendedor o representante, reemplazá las tarjetas de papel por una Tarjeta Personal Digital con tecnología NFC y QR." image="/assets/images/calamuchitar/productos/tags_id_desk.webp" imageMobile="/assets/images/calamuchitar/productos/tags_id_mobile.webp" imageAlt="Tags ID, tarjeta personal digital">
      <div className="tags_offers_id_flow"><span><FaMobileScreenButton/> Acercar teléfono</span><b>o</b><span><FaQrcode/> Escanear QR</span><FaArrowRight/><strong>Abrir perfil</strong></div>
      <FeatureList items={["Datos, fotografía y empresa", "Profesión y datos de contacto", "Redes, portfolio y web", "Productos, servicios y catálogo", "Dirección y ubicación", "Archivos e información adicional"]}/>
      <div className="tags_offers_vcard"><FaIdCard/><div><strong>Guardarte en contactos con un toque</strong><p>La tecnología VCard permite agregar todos tus datos directamente a los contactos del teléfono.</p></div></div>
    </Section>

    <section className="tags_offers_start" data-reveal><div><span>EMPEZÁ HOY</span><h2>Empezá gratis</h2><p>Podés agregar tu comercio o actividad a {siteName} sin costo. A partir de ahí, contratás solamente las herramientas que necesitás.</p><strong>Herramientas disponibles desde <b>$12.000 mensuales</b></strong><small>Sin necesidad de contratar un paquete completo.</small></div><Link href="/publicar-mi-negocio">Agregar mi negocio gratis <FaArrowRight/></Link></section>

    <section className="tags_offers_two_ways" data-reveal><header><span>VOS ELEGÍS CÓMO TRABAJAR</span><h2>Dos formas de usar {siteName}</h2></header><div><article><FaPeopleGroup/><h3>Nosotros lo hacemos por vos</h3><strong>¿La tecnología no es lo tuyo? No importa.</strong><p>Con tu autorización configuramos las herramientas y dejamos todo funcionando para que solamente tengas que utilizarlo.</p></article><article><FaGear/><h3>Administralo vos mismo</h3><strong>¿Preferís tener el control?</strong><p>Accedé a tu Panel Personal y administrá contenido, estadísticas, clientes, pedidos, reservas, reseñas, productos, promociones y presencia digital.</p></article></div></section>

    <section className="tags_offers_integrations" data-reveal><div><span>ALGO MUY IMPORTANTE</span><h2>Usá nuestras herramientas donde quieras</h2><p>No necesitás contratar una página web de {siteName}. Cada herramienta puede integrarse en una web creada por nosotros o, cuando técnicamente corresponda, en la página que tu negocio ya posee.</p><div className="tags_offers_integration_examples"><span>Tu web + Reseñas</span><span>Tu web + Reservas</span><span>Tu web + Tienda</span><span>Tu web + ChatBot</span><span>Tu web + Fidelización</span><span>Tu web + Carta Digital</span></div><blockquote>Las herramientas se adaptan a tu negocio. No tu negocio a las herramientas.</blockquote></div><FaCloudArrowUp/></section>

    <section className="tags_offers_final" data-reveal><div><span>HAGAMOS CRECER TU NEGOCIO</span><h2>Tu negocio ya está trabajando. Hagamos que también trabaje su presencia digital.</h2><p>Sumate a {siteName}, agregá tu comercio gratuitamente y descubrí qué herramientas pueden ayudarte a vender más, trabajar mejor y conectarte con nuevos clientes.</p><div className="tags_offers_actions"><Link className="is_primary" href="/directorio">Explorá la Plataforma Comercial de Calamuchita</Link><Link href="/publicar-mi-negocio">Agregar mi comercio o servicio</Link>{whatsappUrl && <a className="is_whatsapp" href={whatsappUrl} target="_blank" rel="noreferrer"><FaWhatsapp/> Quiero que me asesoren</a>}</div></div></section>
  </div>;
}
