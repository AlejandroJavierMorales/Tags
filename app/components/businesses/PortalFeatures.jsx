// =====================================
// COMPONENT: app/components/businesses/PortalFeatures.jsx
// Descripción: Renderiza las funcionalidades activas y disponibles del Portal Digital.
// =====================================

export default function PortalFeatures({
    activePortalFeatures = [],
    inactivePortalFeatures = []
}) {
    return (
        <>
            <div className="tags_portal_section">
                <div className="tags_portal_section_header">
                    <div>
                        <h2>Funcionalidades activas</h2>
                        <p>Aplicaciones que forman parte del Portal Digital del cliente.</p>
                    </div>
                </div>

                <div className="tags_portal_grid">
                    {activePortalFeatures.length > 0 ? (
                        activePortalFeatures.map((feature) => (
                            <div
                                key={feature.key}
                                className="tags_portal_feature_card active"
                            >
                                <div className="tags_portal_feature_top">
                                    <h3>{feature.title}</h3>

                                    <span className="tags_portal_status active">
                                        {feature.status || "activo"}
                                    </span>
                                </div>

                                <p>{feature.description}</p>

                                <button
                                    type="button"
                                    className="tags_portal_feature_btn"
                                    onClick={feature.onClick}
                                >
                                    {feature.actionLabel}
                                </button>
                                {feature.secondaryActionLabel && feature.onSecondaryClick && (
                                    <button type="button" className="tags_portal_feature_btn secondary" onClick={feature.onSecondaryClick}>
                                        {feature.secondaryActionLabel}
                                    </button>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="tags_portal_empty">
                            Todavía no hay funcionalidades configuradas.
                        </div>
                    )}
                </div>
            </div>

            <div className="tags_portal_section">
                <div className="tags_portal_section_header">
                    <div>
                        <h2>Funcionalidades disponibles</h2>
                        <p>Addons contratados o funcionalidades preparadas para activar.</p>
                    </div>
                </div>

                <div className="tags_portal_grid">
                    {inactivePortalFeatures.map((feature) => (
                        <div
                            key={feature.key}
                            className="tags_portal_feature_card"
                        >
                            <div className="tags_portal_feature_top">
                                <h3>{feature.title}</h3>

                                <span className="tags_portal_status inactive">
                                    OFF
                                </span>
                            </div>

                            <p>{feature.description}</p>

                            <button
                                type="button"
                                className="tags_portal_feature_btn secondary"
                                onClick={feature.onClick}
                            >
                                {feature.actionLabel}
                            </button>
                            {feature.secondaryActionLabel && feature.onSecondaryClick && (
                                <button type="button" className="tags_portal_feature_btn secondary" onClick={feature.onSecondaryClick}>
                                    {feature.secondaryActionLabel}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
