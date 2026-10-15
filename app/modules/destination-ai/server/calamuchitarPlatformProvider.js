import { DIRECTORY_PRODUCT_LINKS, DIRECTORY_PRODUCT_PAGES } from "@/app/directorio/experiencia/productPages";
import { portalRegistry } from "@/app/lib/portal/portalRegistry";

const COMMERCIAL_ACTION = /\b(?:necesito|necesitamos|quiero|queremos|busco|buscamos|contratar|implementar|incorporar|digitalizar|administrar|gestionar|organizar|vender|mostrar|crear|hacer|tener|ofrecer|recibir|mejorar|automatizar|actualizar|modificar|optimizar|optimizo|sistema|solucion|solución|plataforma|herramienta)\b/iu;
const PLATFORM_NEED = /\b(?:pagina\s+web|página\s+web|sitio\s+web|web\s+para|presencia\s+(?:digital|en\s+internet)|tienda\s+online|catalogo\s+online|catálogo\s+online|vender\s+(?:online|por\s+internet)|reservas?\s+(?:online|para|de)|administracion\s+de\s+reservas|administración\s+de\s+reservas|sistema\s+de\s+reservas|agenda\s+online|turnos?\s+online|carta\s+digital|menu\s+digital|menú\s+digital|pedidos?\s+(?:online|por|desde)|delivery|take\s*away|reseñas?\s+de\s+clientes|opiniones?\s+de\s+clientes|fidelizacion|fidelización|programa\s+de\s+puntos|programa\s+de\s+sellos|chat\s*bot|asistente\s+(?:virtual|para)|tarjeta\s+(?:personal\s+)?digital|tags\s*id|mi\s+estadia|mi\s+estadía|experiencia\s+del\s+huesped|experiencia\s+del\s+huésped|gestionar\s+(?:un\s+)?(?:alojamiento|hotel|cabañas|huéspedes|huespedes)|perfil\s+(?:de\s+empresa|del\s+negocio|comercial)\s+en\s+google|google\s+(?:business|maps|mi\s+negocio)|aparecer\s+en\s+google\s+maps|posicionamiento\s+en\s+google\s+maps|optimiz\w*\s+(?:mi\s+)?(?:perfil\s+de\s+)?google|qr\s+dinamico|qr\s+dinámico|codigo\s+qr|código\s+qr|nfc|productos?\s+de\s+calamuchitar|servicios?\s+de\s+calamuchitar|que\s+ofrece\s+calamuchitar|qué\s+ofrece\s+calamuchitar)\b/iu;

export function isCalamuchitarPlatformQuery(message) {
  const value = String(message || "").trim();
  return PLATFORM_NEED.test(value) && (COMMERCIAL_ACTION.test(value) || /\b(?:web|online|digital|reservas?|turnos?|pedidos?|reseñas?|fidelizaci[oó]n|chat\s*bot|tags\s*id|mi\s+estad[ií]a|qr|nfc|calamuchitar)\b/iu.test(value));
}

export function buildCalamuchitarPlatformContext() {
  const products = DIRECTORY_PRODUCT_LINKS.map(([slug]) => {
    const product = DIRECTORY_PRODUCT_PAGES[slug];
    return `- ${product.title}: ${product.description}`;
  });
  products.push(`- ${portalRegistry.google_business_profile.title}: Creá, completá, modificá y optimizá el Perfil de Empresa del negocio para mejorar su presencia en Google y Google Maps; administrá información comercial, categorías, dirección, horarios, fotografías, servicios, web y datos de contacto.`);

  return `PROVEEDOR DE SOLUCIONES DIGITALES DE LA PLATAFORMA:
CalamuchitAr ofrece herramientas digitales para comercios, profesionales, prestadores y alojamientos. Ante una necesidad comercial o administrativa, proponé primero el producto que mejor resuelva la consulta y explicá brevemente por qué. Podés mencionar productos complementarios cuando aporten valor, sin enumerar todo el catálogo salvo que la persona lo solicite.

PRODUCTOS DISPONIBLES:
${products.join("\n")}

CONTACTO COMERCIAL:
Para conocer alcance, configuración, implementación, precios o contratar, invitá siempre a contactar a CalamuchitAr por WhatsApp al 3546562855. No inventes precios, plazos ni condiciones. No agregues recommendationKeys porque CalamuchitAr actúa aquí como proveedor de la plataforma y no como un resultado territorial.`;
}
