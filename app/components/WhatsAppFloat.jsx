'use client'

import Image from "next/image";
import { tagsSiteConfig } from "../config/configSite";
import { FaCircle } from "react-icons/fa";

export default function WhatsAppFloat() {

    const phone = tagsSiteConfig?.contact?.phone?.replace(/\D/g, "");



const message = encodeURIComponent(
  "*🏷️ Tags QR - Gestión de Códigos QR*\n\n" +
  "💬 Quiero hacer una consulta: "
);


    return (
        <div className="tagsWhatsapp_float_wrapper">
            <div className="tagsWhatsapp_float_box">

                {/* TEXTO */}
                <div className="tagsWhatsapp_float_text">
                    🟢 ¿Necesitás ayuda?
                </div>

                {/* BOTÓN */}
                <a
                    href={`https://wa.me/${phone}?text=${message}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tagsWhatsapp_float_btn"
                >
                    <Image
                        src="/assets/images/icons/whatsapp_verde_bordeblanco.png"
                        alt="WhatsApp"
                        width={45}
                        height={45}
                    />
                </a>

            </div>
        </div>
    );
}