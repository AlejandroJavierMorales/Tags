export const GOOGLE_BUSINESS_ADDON_CODE = "google_business_profile";

export const BUSINESS_TYPES = [
    { id: "accommodation", label: "Alojamiento", description: "Hoteles, cabanas, hosterias, campings y alquileres temporarios." },
    { id: "restaurant", label: "Gastronomia", description: "Restaurantes, bares, cafeterias, delivery y take away." },
    { id: "retail", label: "Comercio", description: "Locales y negocios que venden productos." },
    { id: "professional_service", label: "Servicios profesionales", description: "Profesionales, consultores y prestadores de servicios." },
    { id: "tourism", label: "Turismo y actividades", description: "Excursiones, experiencias y servicios turisticos." },
    { id: "beauty", label: "Belleza y cuidado personal", description: "Peluquerias, barberias, estetica y bienestar." },
    { id: "health", label: "Salud", description: "Consultorios, centros de salud y profesionales." },
    { id: "automotive", label: "Automotor", description: "Talleres, repuestos, lavaderos y servicios para vehiculos." },
    { id: "home_services", label: "Servicios para el hogar", description: "Construccion, reparacion, mantenimiento e instalaciones." },
    { id: "sports", label: "Deportes", description: "Clubes, canchas, gimnasios e instructores." },
    { id: "education", label: "Educacion", description: "Institutos, academias, cursos y docentes." },
    { id: "events", label: "Eventos", description: "Salones, organizadores y proveedores para eventos." },
    { id: "other", label: "Otro tipo de negocio", description: "Configura el perfil de acuerdo con tu actividad." }
];

const COMMON_QUESTIONS = [
    { code: "differentiators", label: "Que hace especial a tu negocio?", type: "textarea" },
    { code: "accepted_payments", label: "Medios de pago aceptados", type: "text" },
    { code: "accessibility", label: "Que opciones de accesibilidad ofrece?", type: "textarea" }
];

const TYPE_QUESTIONS = {
    accommodation: [
        { code: "accommodation_type", label: "Tipo de alojamiento", type: "text" },
        { code: "units_count", label: "Cantidad de unidades", type: "number" },
        { code: "max_capacity", label: "Capacidad maxima", type: "number" },
        { code: "amenities", label: "Servicios y comodidades", type: "textarea", help: "WiFi, pileta, desayuno, estacionamiento, parrilla, cocina, mascotas, etc." },
        { code: "ideal_guests", label: "Para que tipo de huespedes es ideal?", type: "textarea" },
        { code: "nearby_attractions", label: "Atractivos cercanos", type: "textarea" }
    ],
    restaurant: [
        { code: "cuisine_types", label: "Tipos de cocina", type: "textarea" },
        { code: "service_modes", label: "Modalidades", type: "textarea", help: "Salon, delivery, take away, reservas, mesas exteriores." },
        { code: "dietary_options", label: "Opciones alimentarias", type: "textarea" },
        { code: "seating_capacity", label: "Capacidad del salon", type: "number" }
    ],
    retail: [
        { code: "product_lines", label: "Principales productos o lineas", type: "textarea" },
        { code: "sales_channels", label: "Canales de venta", type: "textarea", help: "Local, WhatsApp, tienda online, envios, retiro." },
        { code: "brands", label: "Marcas con las que trabaja", type: "textarea" }
    ],
    professional_service: [
        { code: "professional_services", label: "Servicios profesionales", type: "textarea" },
        { code: "service_method", label: "Modalidad de atencion", type: "textarea", help: "Presencial, a domicilio, remota o con turnos." },
        { code: "credentials", label: "Matriculas, certificaciones o especialidades", type: "textarea" }
    ],
    tourism: [
        { code: "tourism_activities", label: "Actividades y experiencias", type: "textarea" },
        { code: "activity_requirements", label: "Requisitos para participar", type: "textarea" },
        { code: "meeting_points", label: "Puntos de encuentro o zonas", type: "textarea" }
    ]
};

export function questionsForBusinessType(type) {
    return [...(TYPE_QUESTIONS[type] || [
        { code: "main_services", label: "Productos o servicios principales", type: "textarea" },
        { code: "service_method", label: "Como atiende a sus clientes?", type: "textarea" }
    ]), ...COMMON_QUESTIONS];
}
