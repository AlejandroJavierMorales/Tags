// =====================================
// COMPONENT: app/components/businesses/PortalDashboard.jsx
// Descripción: Dashboard principal del Portal Digital del business.
// =====================================

import PortalFeatures from "@/app/components/businesses/PortalFeatures";
import PortalMap from "@/app/components/businesses/PortalMap";

export default function PortalDashboard({
    business,
    portal,
    portalRoutes,
    activePortalFeatures,
    inactivePortalFeatures,
    onReload
}) {
    const activeCount =
        activePortalFeatures?.length || 0;

    const routesCount =
        portalRoutes?.length || 0;

    const homeRoute =
        portalRoutes?.find(route => Number(route.is_home) === 1);

    return (
        <section className="tags_portal_dashboard">

            <div className="tags_portal_dashboard_header">
                <div>
                    <span className="tags_portal_dashboard_label">
                        Portal del negocio
                    </span>

                    <h2>
                        {business?.name || "Negocio"}
                    </h2>

                    <p>
                        Aplicaciones, páginas y navegación pública del cliente.
                    </p>
                </div>

                <div className="tags_portal_dashboard_status">
                    <span>
                        Estado
                    </span>

                    <strong>
                        {portal?.status || "draft"}
                    </strong>
                </div>
            </div>

            <div className="tags_portal_summary_grid">

                <div className="tags_portal_summary_card">
                    <span>Aplicaciones activas</span>
                    <strong>{activeCount}</strong>
                </div>

                <div className="tags_portal_summary_card">
                    <span>Páginas del Portal</span>
                    <strong>{routesCount}</strong>
                </div>

                <div className="tags_portal_summary_card">
                    <span>Home actual</span>
                    <strong>
                        {homeRoute?.label || "Sin definir"}
                    </strong>
                </div>

                <div className="tags_portal_summary_card">
                    <span>Slug Portal</span>
                    <strong>
                        {portal?.slug || "-"}
                    </strong>
                </div>

            </div>

            <PortalFeatures
                activePortalFeatures={activePortalFeatures}
                inactivePortalFeatures={inactivePortalFeatures}
            />

            <PortalMap
    portal={portal}
    portalRoutes={portalRoutes}
    businessId={business?.id}
    onReload={onReload}
/>

        </section>
    );
}