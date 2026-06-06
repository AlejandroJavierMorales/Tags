"use client";

import { FaWhatsapp }
    from "react-icons/fa";

function cleanPhone(phone = "") {
    return phone
        .toString()
        .replace(/\D/g, "");
}

export default function QRPageFloatingActions({
    page
}) {

    const styles =
        page?.global_styles || {};

    const showFloatingWhatsapp =
        styles.showFloatingWhatsapp !== false;

    const showBackToTop =
        styles.showBackToTop !== false;

    const phone =
        cleanPhone(
            page?.whatsapp ||
            page?.phone ||
            ""
        );

    const message =
        encodeURIComponent(
            "Hola, quiero hacer una consulta."
        );

    function scrollTop() {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }

    return (
        <div className="qr_public_floating_actions">
            {
                showBackToTop && (
                    <button
                        type="button"
                        className="qr_public_back_top"
                        onClick={scrollTop}
                        aria-label="Volver arriba"
                    >
                        ↑
                    </button>
                )
            }

            {
                showFloatingWhatsapp &&
                phone && (
                    <a
                        className="qr_public_floating_whatsapp"
                        href={`https://wa.me/${phone}?text=${message}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="WhatsApp"
                    >
                        <FaWhatsapp />
                    </a>
                )
            }
        </div>
    );
}