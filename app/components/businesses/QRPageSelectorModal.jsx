// =====================================
// COMPONENT: app/components/businesses/QRPageSelectorModal.jsx
// Descripción: Modal para elegir qué QR-Page activada administrar.
// =====================================

export default function QRPageSelectorModal({
    open = false,
    qrPages = [],
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
                        QR-Pages activadas
                    </h2>
                    <p className="tags_modal_description">
                        Elegí cuál querés administrar.
                    </p>
                </div>

                <div className="tags_modal_body">
                    {qrPages.map((qr) => (
                        <div
                            key={qr.id}
                            className="tags_portal_qrpage_row"
                        >
                            <div>
                                <strong>{qr.label || "QR sin nombre"}</strong>
                                <span>{qr.code}</span>
                                <small>{qr.qr_page_slug}</small>
                            </div>

                            <button
                                type="button"
                                className="tags_portal_feature_btn"
                                onClick={() =>
                                    router.push(`/dashboard/businesses/${businessId}/qrs/${qr.id}/qr-page`)
                                }
                            >
                                Administrar
                            </button>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
}