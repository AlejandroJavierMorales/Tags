// =====================================
// COMPONENT: app/components/businesses/PortalMap.jsx
// Descripción: Muestra el mapa de navegación del Portal Digital y permite definir Home.
// =====================================

export default function PortalMap({
    portal = null,
    portalRoutes = [],
    businessId,
    onReload
}) {
    async function setHome(route) {
        const res = await fetch("/api/portal/admin/routes/home", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                portalId: portal?.id,
                routeId: route.id,
                businessId
            })
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            alert(data.error || "No se pudo definir la Home");
            return;
        }

        if (onReload) {
            onReload();
        }
    }

    return (
        <div className="tags_portal_section">
            <div className="tags_portal_section_header">
                <div>
                    <h2>Mapa del Portal</h2>
                    <p>Definí la página principal y revisá la navegación pública.</p>
                </div>

                <span className="tags_portal_status active">
                    {portal?.status || "draft"}
                </span>
            </div>

            <div className="tags_portal_tree_card">
                <div className="tags_portal_tree_root">
                    / {portal?.slug || "portal"}
                </div>

                {portalRoutes.length > 0 ? (
                    <div className="tags_portal_tree_list">
                        {portalRoutes.map((route) => (
                            <div
                                key={route.id}
                                className="tags_portal_tree_item"
                            >
                                <div>
                                    <strong>
                                        ├─ {route.path}
                                    </strong>

                                    <span>
                                        {route.addon_name || route.page_type || route.route_type}
                                        {" · "}
                                        {route.page_status || route.status}
                                        {Number(route.is_home) === 1 && (
                                            <span className="tags_portal_home_badge">
                                                HOME
                                            </span>
                                        )}
                                    </span>
                                </div>

                                <div className="tags_portal_tree_actions">
                                    {Number(route.is_home) !== 1 && (
                                        <button
                                            type="button"
                                            className="tags_portal_tree_btn light"
                                            onClick={() => setHome(route)}
                                        >
                                            Hacer Home
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        className="tags_portal_tree_btn"
                                        onClick={() => {
                                            if (route.page_id) {
                                                window.open(`/p/${route.page_slug}`, "_blank");
                                            }
                                        }}
                                    >
                                        Ver
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="tags_portal_empty">
                        Todavía no hay páginas activadas en el Portal.
                    </p>
                )}
            </div>
        </div>
    );
}