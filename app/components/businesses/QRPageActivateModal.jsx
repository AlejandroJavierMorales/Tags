// =====================================
// COMPONENT: app/components/businesses/QRPageActivateModal.jsx
// Descripción: Modal para elegir un QR disponible y activar una QR-Page.
// =====================================

export default function QRPageActivateModal({
    open = false,
    qrsAvailableForQrPage = [],
    businessId,
    onClose,
    router
}) {
    if (!open) {
        return null;
    }

    return (
        <div className="tags_modal_overlay">
            <div className="tags_modal_card tags_text_normal">

                <button
                    className="tags_modal_close"
                    onClick={onClose}
                >
                    ✕
                </button>

                <div className="tags_modal_header text-center">
                    <h2 className="tags_modal_title tags_title">
                        Activar QR-Page
                    </h2>

                    <p className="tags_modal_description">
                        Elegí el QR donde querés crear la QR-Page.
                    </p>
                </div>

                <div className="tags_modal_body">
                    {qrsAvailableForQrPage.length > 0 ? (
                        qrsAvailableForQrPage.map((qr) => (
                            <div
                                key={qr.id}
                                className="tags_portal_qrpage_row"
                            >
                                <div>
                                    <strong>{qr.label || "QR sin nombre"}</strong>
                                    <span>{qr.code}</span>
                                    <small>{qr.qr_type_name || qr.qr_type_code}</small>
                                </div>

                                <button
                                    type="button"
                                    className="tags_portal_feature_btn"
                                    onClick={() =>
                                        router.push(`/dashboard/businesses/${businessId}/qrs/${qr.id}/qr-page/activate`)
                                    }
                                >
                                    Activar
                                </button>
                            </div>
                        ))
                    ) : (
                        <p className="tags_portal_empty">
                            No hay QRs disponibles para activar una QR-Page.
                        </p>
                    )}
                </div>

            </div>
        </div>
    );
}