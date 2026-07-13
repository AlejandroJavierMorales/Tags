// =====================================
// FILE: app/lib/portal/portalRegistry.js
// Descripción: Catálogo frontend de aplicaciones disponibles dentro del Portal Digital.
// =====================================

export const portalRegistry = {
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

    restaurant: {
        key: "restaurant",
        title: "Tags Restaurant",
        description: "Menú digital y gestión gastronómica.",
        canHaveMultiple: false,
        adminPath: ({ businessId }) =>
            `/dashboard/businesses/${businessId}/restaurant`
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