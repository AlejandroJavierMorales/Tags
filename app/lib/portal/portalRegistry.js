// =====================================
// FILE: app/lib/portal/portalRegistry.js
// Descripción: Catálogo frontend de aplicaciones disponibles dentro del Portal Digital.
// =====================================

export const portalRegistry = {
    directory: {
        key: "directory",
        title: "Mi Web",
        description: "Web principal del negocio publicada en los Directorios asignados.",
        canHaveMultiple: false,
        adminPath: ({ businessId }) =>
            `/dashboard/businesses/${businessId}/directory`
    },
    qr_page: {
        key: "qr_page",
        title: "QR-Page",
        description: "Landing editable asociada a uno o varios QRs.",
        canHaveMultiple: true,
        adminPath: ({ businessId, qrId }) =>
            `/dashboard/businesses/${businessId}/qrs/${qrId}/qr-page`,
        activatePath: ({ businessId, qrId }) =>
            `/dashboard/businesses/${businessId}/qrs/${qrId}/qr-page/activate`
    },

    tags_id: {
        key: "tags_id",
        title: "Tags ID",
        description: "Perfil profesional digital del cliente.",
        canHaveMultiple: false,
        adminPath: ({ businessId, qrId }) =>
            `/dashboard/businesses/${businessId}/qrs/${qrId}/qr-page`
    },

    client_reviews: {
        key: "client_reviews",
        title: "Tags Reviews",
        description: "Sistema de reseñas y reputación.",
        canHaveMultiple: false,
        adminPath: ({ businessId, qrId }) =>
            `/dashboard/businesses/${businessId}/qrs/${qrId}/client-reviews`
    },

    store: {
        key: "store",
        title: "Tags Tienda",
        description: "Tienda online del cliente.",
        canHaveMultiple: false,
        adminPath: ({ businessId }) =>
            `/dashboard/businesses/${businessId}/store`
    },

    resto: {
        key: "resto",
        title: "Tags Resto",
        description: "Menú digital, pedidos por mesa y gestión gastronómica.",
        canHaveMultiple: false,
        adminPath: ({ businessId }) =>
            `/dashboard/businesses/${businessId}/resto`
    },

    turnos: {
        key: "turnos",
        title: "Tags Turnos",
        description: "Reservas flexibles de servicios, profesionales y recursos.",
        canHaveMultiple: true,
        adminPath: ({ businessId }) =>
            `/dashboard/businesses/${businessId}/turnos`
    },

    guest_experience: {
        key: "guest_experience",
        title: "Mi Estadía",
        description: "Experiencia digital para huéspedes de alojamientos temporarios.",
        canHaveMultiple: false,
        adminPath: ({ businessId }) =>
            `/dashboard/businesses/${businessId}/guest-experience`
    },

    qr_agency: {
        key: "qr_agency",
        title: "Tags QR Agency",
        description: "Administración de clientes y códigos QR dinámicos para agencias.",
        canHaveMultiple: false,
        adminPath: ({ businessId }) =>
            `/dashboard/businesses/${businessId}/qr-agency`
    },

    ai_chatbot: {
        key: "ai_chatbot",
        title: "Chatbot con IA",
        description: "Asistente conversacional para orientar a los visitantes de la Página Web.",
        canHaveMultiple: false,
        adminPath: ({ businessId }) =>
            `/dashboard/businesses/${businessId}/ai-chat`
    },

    booking: {
        key: "booking",
        title: "Tags Reservas",
        description: "Sistema de reservas del negocio.",
        canHaveMultiple: false,
        adminPath: ({ businessId }) =>
            `/dashboard/businesses/${businessId}/booking`
    },
    portal_public: {
        key: "portal_public",
        title: "Portal Público",
        description: "Sitio público unificado con navegación, página principal, header y footer.",
        canHaveMultiple: false,
        adminPath: ({ businessId }) =>
            `/dashboard/businesses/${businessId}/portal`
    },
};

export function getPortalRegistryItem(pageType) {
    return portalRegistry[pageType] || null;
}
