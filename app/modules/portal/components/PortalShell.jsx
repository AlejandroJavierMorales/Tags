// =====================================
// FILE: app/modules/portal/components/PortalShell.jsx
// Descripción: Contenedor público del Portal. Renderiza Header, contenido y Footer del Portal.
// =====================================

import PortalHeader from "./PortalHeader";
import PortalFooter from "./PortalFooter";
import { PortalProvider } from "../context/PortalContext";

import "../styles/portal-public.css";

export default function PortalShell({
    portal,
    routes = [],
    currentRoute = null,
    children
}) {
    const contextValue = {
        renderMode: "portal",
        portal,
        routes,
        currentRoute,
        hideChildHeaders:
            Number(portal?.hide_child_headers) === 1,
        hideChildFooters:
            Number(portal?.hide_child_footers) === 1
    };

    return (
        <PortalProvider value={contextValue}>
            <div className="tags_portal_public_shell">
                <PortalHeader
                    portal={portal}
                    routes={routes}
                    currentRoute={currentRoute}
                />

                <main className="tags_portal_public_main">
                    {children}
                </main>

                <PortalFooter
                    portal={portal}
                    routes={routes}
                />
            </div>
        </PortalProvider>
    );
}