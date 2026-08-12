// =====================================
// FILE: app/lib/portal/buildPortalDashboard.js
// Descripción: Construye las funcionalidades del Portal Digital usando el portalRegistry.
// =====================================

import { portalRegistry } from "./portalRegistry";

function normalizeCode(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[\s-]+/g, "_");
}

function getQRFeatures(qr) {
    return String(qr.addon_features || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
}

export function isTagsIdQR(qr) {
    return normalizeCode(qr?.qr_type_code) === "tags_id";
}

export function isTagsIdPage(qr) {
    return qr?.qr_page_type === "tags_id";
}

export function hasAnyPage(qr) {
    return Number(qr?.has_qr_page) === 1 || !!qr?.qr_page_id;
}

export function isClientReviewsPage(qr) {
    return (
        qr?.qr_page_type === "client_reviews" ||
        getQRFeatures(qr).includes("client_reviews")
    );
}

function businessHasAddon(businessAddons, code) {
    return businessAddons.some(
        (addon) => addon.addon_code === code
    );
}


/* Funcion Principal */
export function buildPortalDashboard({
    qrs = [],
    store = null,
    portal = null,
    qrAgency = null,
    subscriptionSummary = null,
    businessAddons = [],
    businessId,
    router,
    setQrPageSelectorOpen,
    setQrPageActivateOpen,
    setStoreActivateOpen,
    setReviewsActivateOpen,
    setTagsIdActivateOpen,
    setPortalActivateOpen,
    setRestoActivateOpen,
    setTurnosActivateOpen,
    setDirectoryActivateOpen
}) {
    const qrPagesAvailable =
        Number(subscriptionSummary?.usage?.qr_pages_total || 0) -
        Number(subscriptionSummary?.usage?.qr_pages_used || 0);

    const tagsIdAvailable =
        Number(subscriptionSummary?.usage?.tags_id_total || 0) -
        Number(subscriptionSummary?.usage?.tags_id_used || 0);

    const qrPages =
        qrs.filter((qr) => qr.qr_page_type === "qr_page");

    const tagsIdPage =
        qrs.find((qr) => qr.qr_page_type === "tags_id");

    const reviewsPage =
        qrs.find((qr) => isClientReviewsPage(qr));

    const restoPage =
        qrs.find((qr) => qr.qr_page_type === "resto");

    const turnosPages =
        qrs.filter((qr) => qr.qr_page_type === "turnos");
    const directoryPage =
        qrs.find((qr) => qr.qr_page_type === "directory");

    const hasStoreAddon =
        businessHasAddon(businessAddons, "store");

    const hasRestoAddon =
        businessHasAddon(businessAddons, "resto");

    const hasTurnosAddon =
        businessHasAddon(businessAddons, "turnos");

    const hasGuestExperienceAddon =
        businessHasAddon(businessAddons, "guest_experience");
    const hasDirectoryAddon =
        businessHasAddon(businessAddons, "directory");

    const hasTagsIdAddon =
        businessHasAddon(businessAddons, "tagsid");

    const hasReviewsAddon =
        businessHasAddon(businessAddons, "client_reviews");

    const hasPortalPublicAddon =
        businessHasAddon(businessAddons, "portal_public");

    const hasQrAgencyAddon =
        businessHasAddon(businessAddons, "qr_agency");

    const hasTagsIdAlready = qrs.some(isTagsIdPage);

    const canActivateQrPage =
        qrPagesAvailable > 0;

    const canActivateTagsId =
        !hasTagsIdAlready &&
        tagsIdAvailable > 0;

    const qrsAvailableForQrPage =
        qrs.filter((qr) =>
            !hasAnyPage(qr) &&
            !isTagsIdQR(qr) &&
            qr.status !== "generated" &&
            qr.status !== "available"
        );

    function getFeatureStatusLabel({ hasAddon, exists, status }) {
        if (!hasAddon) return null;

        if (!exists) return "Pendiente";

        if (status === "draft") return "Borrador";

        return "Activo";
    }

    const portalFeatures = [
        {
            ...portalRegistry.qr_agency,
            active: hasQrAgencyAddon,
            status: getFeatureStatusLabel({
                hasAddon: hasQrAgencyAddon,
                exists: !!qrAgency,
                status: qrAgency?.status
            }),
            actionLabel: qrAgency ? "Administrar Agencia" : "Activar Agencia",
            onClick: () => {
                if (!hasQrAgencyAddon) return;
                router.push(portalRegistry.qr_agency.adminPath({ businessId }));
            }
        },
        {
            ...portalRegistry.directory,
            active: hasDirectoryAddon,
            status: getFeatureStatusLabel({ hasAddon: hasDirectoryAddon, exists: !!directoryPage, status: directoryPage?.qr_page_status }),
            actionLabel: directoryPage ? "Administrar mi Web" : "Activar mi Web",
            onClick: () => {
                if (!hasDirectoryAddon) return;
                if (directoryPage) router.push(portalRegistry.directory.adminPath({ businessId }));
                else setDirectoryActivateOpen(true);
            }
        },
        {
            ...portalRegistry.guest_experience,
            active: hasGuestExperienceAddon,
            status: hasGuestExperienceAddon ? "Disponible" : null,
            actionLabel: "Activar / Administrar",
            onClick: () => {
                if (!hasGuestExperienceAddon) return;
                router.push(portalRegistry.guest_experience.adminPath({ businessId }));
            }
        },
        {
            ...portalRegistry.resto,
            active:
                hasRestoAddon,
            status:
                getFeatureStatusLabel({
                    hasAddon:
                        hasRestoAddon,
                    exists:
                        !!restoPage,
                    status:
                        restoPage?.qr_page_status
                }),
            actionLabel:
                restoPage
                    ? "Administrar"
                    : "Crear Tags Resto",

            onClick: () => {
                if (!hasRestoAddon) {
                    return;
                }
                if (restoPage) {
                    router.push(
                        portalRegistry.resto.adminPath({
                            businessId
                        })
                    );
                    return;
                }
                setRestoActivateOpen(true);
            }
        },
        {
            ...portalRegistry.turnos,
            active: hasTurnosAddon,
            status: getFeatureStatusLabel({
                hasAddon: hasTurnosAddon,
                exists: turnosPages.length > 0,
                status: turnosPages[0]?.qr_page_status
            }),
            actionLabel: turnosPages.length > 0 ? "Administrar" : "Activar página",
            secondaryActionLabel: turnosPages.length > 0 ? "Crear otra instancia" : null,
            onClick: () => {
                if (!hasTurnosAddon) return;
                if (turnosPages.length > 0) {
                    router.push(`${portalRegistry.turnos.adminPath({ businessId })}?turnosId=${turnosPages[0].turnos_id}`);
                    return;
                }
                setTurnosActivateOpen(true);
            },
            onSecondaryClick: turnosPages.length > 0 ? () => setTurnosActivateOpen(true) : null
        },
        {
            ...portalRegistry.tags_id,
            active: hasTagsIdAddon,
            status: getFeatureStatusLabel({
                hasAddon: hasTagsIdAddon,
                exists: !!tagsIdPage,
                status: tagsIdPage?.qr_page_status
            }),
            actionLabel:
                tagsIdPage
                    ? "Administrar"
                    : "Crear Perfil",
            onClick: () => {
                if (!hasTagsIdAddon) return;

                if (tagsIdPage) {
                    router.push(
                        portalRegistry.tags_id.adminPath({
                            businessId,
                            qrId: tagsIdPage.id
                        })
                    );
                    return;
                }

                setTagsIdActivateOpen(true);
            }
        },

        {
            ...portalRegistry.qr_page,
            description:
                qrPages.length > 1
                    ? `${qrPages.length} QR-Pages activadas.`
                    : qrPages.length === 1
                        ? portalRegistry.qr_page.description
                        : "Tenés cupo disponible para activar una QR-Page.",
            active: canActivateQrPage || qrPages.length > 0,
            status: getFeatureStatusLabel({
                hasAddon: canActivateQrPage || qrPages.length > 0,
                exists: qrPages.length > 0,
                status:
                    qrPages.length === 1
                        ? qrPages[0]?.qr_page_status
                        : "published"
            }),
            actionLabel:
                canActivateQrPage
                    ? "Administrar / Crear"
                    : qrPages.length > 0
                        ? "Administrar"
                        : "Sin cupo",
            onClick: () => {
                setQrPageActivateOpen(true);
            }
        },

        {
            ...portalRegistry.client_reviews,
            active: hasReviewsAddon,
            status: getFeatureStatusLabel({
                hasAddon: hasReviewsAddon,
                exists: !!reviewsPage,
                status: reviewsPage?.qr_page_status
            }),
            actionLabel:
                reviewsPage
                    ? "Administrar"
                    : "Crear Reviews",
            onClick: () => {
                if (!hasReviewsAddon) return;

                if (reviewsPage) {
                    router.push(
                        portalRegistry.client_reviews.adminPath({
                            businessId,
                            qrId: reviewsPage.id
                        })
                    );
                    return;
                }

                setReviewsActivateOpen(true);
            }
        },

        {
            ...portalRegistry.store,
            active: hasStoreAddon,
            status: getFeatureStatusLabel({
                hasAddon: hasStoreAddon,
                exists: !!store,
                status: store?.status
            }),
            actionLabel:
                store
                    ? "Administrar"
                    : "Crear tienda",
            onClick: () => {
                if (!hasStoreAddon) return;

                if (store) {
                    router.push(
                        portalRegistry.store.adminPath({
                            businessId
                        })
                    );
                    return;
                }

                setStoreActivateOpen(true);
            }
        },
        {
            ...portalRegistry.portal_public,
            active: hasPortalPublicAddon,
            status: getFeatureStatusLabel({
                hasAddon: hasPortalPublicAddon,
                exists: !!portal,
                status: portal?.status
            }),
            actionLabel:
                portal
                    ? "Administrar"
                    : "Crear Portal",
            onClick: () => {
                if (!hasPortalPublicAddon) return;

                if (portal) {
                    router.push(
                        portalRegistry.portal_public.adminPath({
                            businessId
                        })
                    );
                    return;
                }

                setPortalActivateOpen(true);
            }
        }
    ];

    return {
        qrPages,
        tagsIdPage,
        reviewsPage,
        directoryPage,
        qrsAvailableForQrPage,
        canActivateQrPage,
        canActivateTagsId,
        portalFeatures,
        activePortalFeatures:
            portalFeatures.filter((feature) => feature.active),
        inactivePortalFeatures:
            portalFeatures.filter((feature) => !feature.active)
    };
}
