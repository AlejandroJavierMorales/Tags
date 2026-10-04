import Link from "next/link";
import { getLegalSiteContext } from "./legalSiteContext";
import "./legalPage.css";

const UPDATED_AT = "2 de octubre de 2026";

function PrivacyContent({ context }) {
  return <>
    <p className="tags_legal_lead">Esta política explica qué información tratamos cuando usás {context.productName}, cómo la protegemos y qué decisiones podés tomar sobre tus datos.</p>

    <h2>1. Responsable y alcance</h2>
    <p>Tags opera la infraestructura tecnológica de la plataforma y de los directorios que utilizan sus servicios. Cuando navegás en {context.name}, también puede intervenir el directorio o comercio que publica la información o presta el servicio solicitado.</p>
    <p>Podés realizar consultas sobre privacidad escribiendo a <a href={`mailto:${context.contactEmail}`}>{context.contactEmail}</a>. Domicilio operativo: Los Reartes, Valle de Calamuchita, Córdoba, Argentina.</p>

    <h2>2. Información que podemos tratar</h2>
    <ul>
      <li>Datos de cuenta y contacto, como nombre, email, teléfono y datos del negocio.</li>
      <li>Contenido que cargás en la plataforma: perfiles, publicaciones, productos, servicios, imágenes, reservas, pedidos, mensajes o respuestas.</li>
      <li>Datos técnicos y de uso: páginas visitadas, acciones, búsquedas, dispositivo, navegador, origen de la visita e identificadores anónimos de sesión.</li>
      <li>Ubicación, únicamente cuando la compartís o autorizás desde el navegador para una función que la necesita.</li>
      <li>Consultas y contexto conversacional enviados a Muchi u otros asistentes habilitados.</li>
      <li>Datos provenientes de integraciones que conectás voluntariamente, incluidos servicios de Google.</li>
    </ul>

    <h2>3. Integraciones y datos de Google</h2>
    <p>Si conectás una cuenta de Google, solicitamos sólo los permisos necesarios para las funciones que decidís usar:</p>
    <ul>
      <li><strong>Perfil de Negocio de Google:</strong> consultar las cuentas y ubicaciones que administrás, mostrar los datos del perfil y enviar cambios que selecciones expresamente desde la plataforma. No realizamos modificaciones ni eliminaciones automáticas sin una acción iniciada por vos.</li>
      <li><strong>Google Search Console:</strong> consultar en modo de sólo lectura métricas de rendimiento, como impresiones, clics, consultas, páginas y posición promedio, para generar estadísticas y reportes.</li>
      <li><strong>Identidad de Google:</strong> obtener el email básico necesario para identificar la conexión autorizada.</li>
    </ul>
    <p>Los tokens de acceso y actualización se almacenan cifrados. No vendemos datos obtenidos de Google, no los usamos para publicidad y no los utilizamos para entrenar modelos generales de inteligencia artificial. El uso y la transferencia de información recibida desde las APIs de Google respetan la <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">Política de Datos de Usuario de los Servicios API de Google</a>, incluidos sus requisitos de uso limitado.</p>

    <h2>4. Para qué utilizamos la información</h2>
    <ul>
      <li>Prestar, personalizar y mantener las funcionalidades contratadas o solicitadas.</li>
      <li>Autenticar usuarios, proteger cuentas y prevenir usos indebidos.</li>
      <li>Publicar la información que el comercio o prestador haya marcado como pública.</li>
      <li>Procesar operaciones, comunicaciones, reservas, pedidos, beneficios y reportes.</li>
      <li>Medir el funcionamiento de la plataforma y mejorar la experiencia.</li>
      <li>Cumplir obligaciones legales y responder solicitudes legítimas.</li>
    </ul>

    <h2>5. Proveedores y transferencias</h2>
    <p>Podemos utilizar proveedores de infraestructura, alojamiento, correo, mapas, analítica, pagos, mensajería e inteligencia artificial únicamente para operar las funciones correspondientes. Estos proveedores reciben la información necesaria para prestar su servicio y están sujetos a sus propios compromisos de seguridad y privacidad. No comercializamos datos personales.</p>

    <h2>6. Conservación y seguridad</h2>
    <p>Conservamos los datos mientras exista una cuenta, relación activa o necesidad operativa y durante el tiempo adicional requerido para auditoría, seguridad o cumplimiento legal. Aplicamos controles de acceso, cifrado de credenciales sensibles, registros de actividad y medidas razonables para evitar acceso, alteración o divulgación no autorizados.</p>

    <h2>7. Cookies y almacenamiento local</h2>
    <p>Utilizamos cookies y almacenamiento del navegador para mantener sesiones, recordar preferencias, habilitar instalaciones web y obtener métricas de uso. Algunas cookies son indispensables para iniciar sesión y utilizar funciones protegidas. Podés controlar las cookies desde tu navegador, aunque desactivarlas puede impedir el funcionamiento de determinadas herramientas.</p>

    <h2>8. Tus decisiones y derechos</h2>
    <p>Podés solicitar acceso, corrección, actualización o eliminación de tus datos, y retirar una autorización cuando corresponda. También podés desconectar Google desde la herramienta vinculada o revocar el acceso desde tu cuenta de Google. Consultá la página de <Link href="/gestion-de-datos">Gestión y eliminación de datos</Link> para conocer el procedimiento.</p>

    <h2>9. Menores de edad</h2>
    <p>Las herramientas comerciales y administrativas no están dirigidas a menores. Los contenidos públicos de turismo pueden ser consultados por familias, pero no buscamos recopilar intencionalmente datos personales de menores sin intervención de una persona adulta responsable.</p>

    <h2>10. Cambios en esta política</h2>
    <p>Podemos actualizar esta política cuando cambien las funciones, integraciones o requisitos aplicables. La versión vigente se publica siempre en esta dirección e indica su fecha de actualización.</p>
  </>;
}

function TermsContent({ context }) {
  return <>
    <p className="tags_legal_lead">Estas condiciones regulan el acceso y uso de {context.productName}. Al utilizar la plataforma aceptás estas condiciones y la Política de Privacidad vigente.</p>

    <h2>1. Descripción del servicio</h2>
    <p>{context.description} Las funcionalidades disponibles dependen del plan, los módulos activados y las integraciones autorizadas por cada usuario o negocio.</p>

    <h2>2. Cuentas y responsabilidades</h2>
    <p>Debés proporcionar información verdadera, mantener actualizados tus datos y proteger el acceso a tu cuenta. Sos responsable de las acciones realizadas desde tus credenciales y de contar con autorización para publicar contenidos, administrar negocios o conectar servicios de terceros.</p>

    <h2>3. Contenido de comercios y directorios</h2>
    <p>Los comercios y prestadores son responsables por la exactitud, vigencia, legalidad y disponibilidad de sus publicaciones, productos, precios, promociones y datos de contacto. La plataforma puede moderar, ocultar o retirar contenido que resulte engañoso, ilícito, inseguro o contrario a estas condiciones.</p>

    <h2>4. Muchi e información orientativa</h2>
    <p>Las respuestas de asistentes virtuales se generan a partir de información disponible en la plataforma y otras fuentes habilitadas. Son orientativas y pueden contener omisiones o errores. Antes de tomar una decisión relevante, verificá disponibilidad, precio, condiciones, horarios, clima, accesibilidad y seguridad directamente con el prestador o fuente competente.</p>

    <h2>5. Servicios de Google</h2>
    <p>Las integraciones con Google requieren tu autorización expresa y se rigen también por las condiciones y políticas de Google. La plataforma sólo enviará modificaciones a un Perfil de Negocio cuando selecciones los datos y confirmes la operación. Podés retirar la autorización en cualquier momento, aunque esto deshabilitará las funciones vinculadas.</p>

    <h2>6. Uso permitido</h2>
    <p>No podés utilizar el servicio para infringir derechos, suplantar identidades, publicar contenido malicioso, vulnerar sistemas, enviar comunicaciones abusivas, obtener datos sin autorización ni interferir con el funcionamiento de la plataforma.</p>

    <h2>7. Planes, pagos y disponibilidad</h2>
    <p>Los precios, alcances, renovaciones y límites aplicables se informan al contratar cada servicio. Podemos realizar mantenimiento, correcciones y mejoras que afecten temporalmente la disponibilidad. Procuramos continuidad y resguardo razonable, pero ningún servicio conectado a Internet puede garantizar funcionamiento ininterrumpido.</p>

    <h2>8. Propiedad intelectual</h2>
    <p>Tags, CalamuchitAr, Muchi, sus diseños, software y elementos de marca pertenecen a sus respectivos titulares. Cada usuario conserva los derechos sobre el contenido que carga y otorga las autorizaciones necesarias para almacenarlo, procesarlo y publicarlo conforme a la función elegida.</p>

    <h2>9. Limitación de responsabilidad</h2>
    <p>La plataforma no participa como parte en las operaciones entre usuarios y prestadores, salvo indicación expresa. En la medida permitida por la normativa aplicable, no responde por decisiones comerciales de terceros, información desactualizada, indisponibilidad externa ni daños derivados del uso incorrecto del servicio.</p>

    <h2>10. Suspensión y finalización</h2>
    <p>Podemos limitar o suspender una cuenta por incumplimiento, riesgo de seguridad, falta de pago o requerimiento legal. El usuario puede solicitar la baja y gestionar sus datos de acuerdo con la <Link href="/politica-de-privacidad">Política de Privacidad</Link> y la página de <Link href="/gestion-de-datos">Gestión de datos</Link>.</p>

    <h2>11. Ley aplicable y contacto</h2>
    <p>Estas condiciones se interpretan conforme a las leyes de la República Argentina. Para consultas, reclamos o solicitudes escribí a <a href={`mailto:${context.contactEmail}`}>{context.contactEmail}</a>.</p>
  </>;
}

function DataManagementContent({ context }) {
  return <>
    <p className="tags_legal_lead">Podés controlar las conexiones externas y solicitar acceso, corrección o eliminación de la información asociada a tu cuenta.</p>

    <h2>Desconectar Google</h2>
    <ol>
      <li>Ingresá al panel del negocio y abrí la herramienta de Perfil de Negocio o la sección de estadísticas conectada a Search Console.</li>
      <li>Utilizá la opción de desconexión disponible. La plataforma dejará de realizar nuevas solicitudes con esa autorización.</li>
      <li>También podés revocar el permiso desde <a href="https://myaccount.google.com/connections" target="_blank" rel="noreferrer">Conexiones de terceros de tu cuenta de Google</a>.</li>
    </ol>
    <p>Revocar el acceso invalida la conexión futura, pero no elimina automáticamente registros de auditoría o información que deba conservarse por seguridad o cumplimiento legal.</p>

    <h2>Solicitar acceso, corrección o eliminación</h2>
    <p>Enviá un email a <a href={`mailto:${context.contactEmail}?subject=${encodeURIComponent("Solicitud de privacidad y gestión de datos")}`}>{context.contactEmail}</a> indicando:</p>
    <ul>
      <li>Nombre y email de la cuenta.</li>
      <li>Negocio o directorio relacionado, si corresponde.</li>
      <li>Qué información querés consultar, corregir o eliminar.</li>
      <li>Un medio razonable para verificar que sos titular o administrador autorizado.</li>
    </ul>
    <p>Responderemos dentro de los plazos aplicables. Antes de eliminar información podemos solicitar una validación de identidad y separar datos que deban conservarse por obligaciones legales, prevención de fraude, seguridad o defensa de derechos.</p>

    <h2>Qué ocurre al eliminar una cuenta</h2>
    <p>Se desactivará el acceso y se eliminarán o anonimizarán los datos que ya no sean necesarios. Las publicaciones públicas asociadas serán retiradas cuando corresponda. Las copias de respaldo pueden permanecer temporalmente hasta completar sus ciclos seguros de reemplazo.</p>

    <h2>Ayuda</h2>
    <p>Si no podés ingresar al panel o la opción de desconexión no está disponible, escribinos a <a href={`mailto:${context.contactEmail}`}>{context.contactEmail}</a>. No envíes contraseñas, códigos de acceso ni tokens por email.</p>
  </>;
}

const DOCUMENTS = {
  privacy: { eyebrow: "PRIVACIDAD Y DATOS", title: "Política de Privacidad", Content: PrivacyContent },
  terms: { eyebrow: "CONDICIONES LEGALES", title: "Términos y Condiciones del Servicio", Content: TermsContent },
  data: { eyebrow: "CONTROL DE TU INFORMACIÓN", title: "Gestión y eliminación de datos", Content: DataManagementContent },
};

export default async function LegalPage({ document }) {
  const context = await getLegalSiteContext();
  const definition = DOCUMENTS[document] || DOCUMENTS.privacy;
  const Content = definition.Content;
  return <main className={`tags_legal_page${context.isMuchi ? " is_muchi" : ""}`} style={{ "--tags-legal-accent": context.accentColor }}>
    <header className="tags_legal_header">
      <a href={context.homeUrl} aria-label={`Volver a ${context.name}`}><img src={context.logoUrl} alt={context.name} /><span>{context.productName}</span></a>
      <a href={context.homeUrl}>Volver al inicio</a>
    </header>
    <section className="tags_legal_hero"><span>{definition.eyebrow}</span><h1>{definition.title}</h1><p>Última actualización: {UPDATED_AT}</p></section>
    <article className="tags_legal_document"><Content context={context} /></article>
    <footer className="tags_legal_footer">
      <strong>{context.name}</strong>
      <nav aria-label="Documentos legales"><Link href="/politica-de-privacidad">Política de Privacidad</Link><Link href="/terminos-y-condiciones">Términos y Condiciones</Link><Link href="/gestion-de-datos">Gestión de datos</Link></nav>
      <small>Servicio operado con tecnología Tags · Argentina</small>
    </footer>
  </main>;
}
