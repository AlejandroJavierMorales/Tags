// =====================================
// Archivo:
// /app/modules/store/components/blocks/StoreTopbarBlock.jsx
//
// Descripción:
// Barra superior pública de Tags Store.
// Renderiza contenido, diseño y textos
// editables desde el Builder.
// =====================================

import {
    FaWhatsapp
}
from "react-icons/fa6";

export default function StoreTopbarBlock({
    entity,
    content = {},
    styles = {}
}) {

    const text =
        content.text ||
        "Comprá online fácil, rápido y seguro";

    const whatsappText =
        content.whatsappText ||
        "WhatsApp";

    const showWhatsapp =
        content.showWhatsapp !== false;

    const whatsapp =
        entity?.whatsapp;

    function getTextStyle(part) {
        return styles?.typography?.[part] || {};
    }

    const sectionStyle = {
        backgroundColor:
            styles.backgroundColor || undefined,

        color:
            styles.textColor || undefined,

        textAlign:
            styles.alignment || undefined,

        padding:
            styles.padding || undefined,

        marginTop:
            styles.marginTop || undefined,

        marginBottom:
            styles.marginBottom || undefined
    };

    const cleanWhatsapp =
        String(whatsapp || "").replace(/\D/g, "");

    return (
        <div
            className="store_topbar"
            style={sectionStyle}
        >

            <div className="store_topbar_inner">

                <span
                    className="store_topbar_text"
                    style={getTextStyle("text")}
                >
                    {text}
                </span>

                {showWhatsapp && cleanWhatsapp && (
                    <a
                        href={`https://wa.me/54${cleanWhatsapp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="store_topbar_whatsapp"
                        style={getTextStyle("button")}
                    >
                        <FaWhatsapp />

                        <span>
                            {whatsappText}
                        </span>
                    </a>
                )}

            </div>

        </div>
    );

}