// =====================================
// Archivo:
// /app/modules/resto/components/blocks/RestoTopbarBlock.jsx
//
// Descripción:
// Barra superior pública de Tags Resto.
// Muestra el mensaje principal, la ubicación
// activa y el estado de la sesión cuando
// esos datos están disponibles.
//
// Contexto:
// resto
// =====================================
import "../../styles/resto-public.css"



export default function RestoTopbarBlock({
    entity,
    content = {},
    styles = {}
}) {

    const session =
        entity?.resto_session ||
        null;

    const location =
        entity?.resto_location ||
        null;

    const text =
        content?.text ||
        "Pedidos desde la mesa";

    const locationLabel =
        location?.name ||
        location?.label ||
        location?.title ||
        "";

    const sessionStatus =
        session?.status_label ||
        session?.status ||
        "";

    const showLocation =
        content?.showLocation !==
        false;

    const showSessionStatus =
        content?.showSessionStatus !==
        false;

    const hasSecondaryInfo =
        (
            showLocation &&
            Boolean(locationLabel)
        ) ||
        (
            showSessionStatus &&
            Boolean(sessionStatus)
        );

    return (
        <div
            className="resto_topbar"
            /* style={{
                background:
                    styles?.background ||
                    "var(--qr-primary)",

                color:
                    styles?.color ||
                    "var(--qr-primary-text)",

                borderColor:
                    styles?.borderColor ||
                    "var(--qr-border)"
            }} */
        >
            <div className="container">

                <div className="d-flex align-items-center justify-content-between gap-3 py-2">

                    <div className="d-flex align-items-center gap-2 min-w-0">

                        <span
                            className="resto_topbar_text text-truncate"
                        >
                            {text}
                        </span>

                    </div>

                    {hasSecondaryInfo && (

                        <div className="d-flex align-items-center justify-content-end gap-2 flex-wrap">

                            {showLocation && locationLabel && (

                                <span
                                    className="resto_topbar_location"
                                >
                                    {locationLabel}
                                </span>

                            )}

                            {showSessionStatus && sessionStatus && (

                                <span
                                    className="resto_topbar_session_status"
                                >
                                    {sessionStatus}
                                </span>

                            )}

                        </div>

                    )}

                </div>

            </div>
        </div>
    );

}