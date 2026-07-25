"use client";

import {
    FaExternalLinkAlt,
    FaQrcode
} from "react-icons/fa";

export default function RestoLocationQR({
    location,
    compact = false
}) {

    const code =
        location?.qr?.code ||
        location?.qr_code ||
        "";

    if (!code) {

        return (
            <div className="tags_resto_location_qr_empty">
                <FaQrcode />
                <span>Sin QR asociado</span>
            </div>
        );

    }

    const qrTarget =
        `/t/${encodeURIComponent(code)}`;

    const imageUrl =
        `/api/qr/download/${encodeURIComponent(
            code
        )}?format=svg&preview=1`;

    return (
        <div
            className={
                compact
                    ? "tags_resto_location_qr is-compact"
                    : "tags_resto_location_qr"
            }
        >
            <a
                className="tags_resto_location_qr_image"
                href={qrTarget}
                target="_blank"
                rel="noreferrer"
                title={`Probar QR ${code}`}
            >
                <img
                    src={imageUrl}
                    alt={`QR ${code} de ${location?.name || "ubicación"}`}
                />
            </a>

            <div className="tags_resto_location_qr_info">
                <span>Código QR</span>
                <strong>{code}</strong>

                <a
                    href={qrTarget}
                    target="_blank"
                    rel="noreferrer"
                >
                    <FaExternalLinkAlt />
                    Probar QR
                </a>
            </div>
        </div>
    );

}
